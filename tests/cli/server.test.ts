import { EventEmitter } from 'node:events';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { ServerStartError, serverEntry, startServer, stopServer, waitForServer } from '@/cli/lib/server';

class FakeChild extends EventEmitter {
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  readonly killed: string[] = [];

  kill(signal?: NodeJS.Signals): boolean {
    this.killed.push(signal ?? 'SIGTERM');
    if (signal === 'SIGKILL' || signal === 'SIGTERM') {
      queueMicrotask(() => {
        this.signalCode = signal;
        this.emit('exit', null, signal);
      });
    }
    return true;
  }
}

function asChild(child: FakeChild): ChildProcess {
  return child as unknown as ChildProcess;
}

function respond(statuses: number[]): typeof fetch {
  let index = 0;
  return (async () => {
    const status = statuses[Math.min(index, statuses.length - 1)];
    index += 1;
    return { ok: status === 200, status } as Response;
  }) as typeof fetch;
}

describe('server lifecycle', () => {
  it('points at the standalone entry', () => {
    expect(serverEntry('/pkg')).toBe('/pkg/.next/standalone/server.js');
  });

  it('starts the standalone server on loopback with the chosen port', () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn<(command: string, args: string[], options: SpawnOptions) => ChildProcess>();
    spawnImpl.mockReturnValue(asChild(child));

    startServer({ port: 4400, packageRoot: '/pkg', spawnImpl });

    const [command, args, options] = spawnImpl.mock.calls[0];
    expect(command).toBe(process.execPath);
    expect(args).toEqual(['/pkg/.next/standalone/server.js']);
    expect(options?.cwd).toBe('/pkg/.next/standalone');
    expect(options?.env).toMatchObject({ PORT: '4400', HOSTNAME: '127.0.0.1', NODE_ENV: 'production' });
  });

  it('becomes ready only after a successful answer', async () => {
    const fetchImpl = respond([500, 200]);
    await expect(waitForServer('http://127.0.0.1:4317', fetchImpl, 2000, 10)).resolves.toBeUndefined();
  });

  it('reports a server that never answers', async () => {
    await expect(waitForServer('http://127.0.0.1:4317', respond([500]), 60, 10)).rejects.toBeInstanceOf(
      ServerStartError
    );
  });

  it('stops the child on a signal and waits for it', async () => {
    const child = new FakeChild();
    await stopServer(asChild(child), 50);
    expect(child.killed).toEqual(['SIGTERM']);
  });

  it('resolves at once for a child that already exited', async () => {
    const child = new FakeChild();
    child.exitCode = 0;
    await expect(stopServer(asChild(child), 50)).resolves.toBeUndefined();
    expect(child.killed).toEqual([]);
  });

  it('kills a child that ignores the signal', async () => {
    const child = new FakeChild();
    child.kill = (signal?: NodeJS.Signals) => {
      child.killed.push(signal ?? 'SIGTERM');
      if (signal === 'SIGKILL') {
        child.emit('exit', null, signal);
      }
      return true;
    };
    await stopServer(asChild(child), 30);
    expect(child.killed).toEqual(['SIGTERM', 'SIGKILL']);
  });
});
