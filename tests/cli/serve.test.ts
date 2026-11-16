import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveServeTarget, startServing } from '@/cli/commands/serve';
import { registerProject } from '@/app/lib/workspace/registry';

const created: string[] = [];

function sandbox(): { home: string; repo: string; other: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-serve-'));
  created.push(base);
  const home = path.join(base, 'home');
  const repo = path.join(base, 'demo-repo');
  const other = path.join(base, 'acme-api');
  for (const dir of [home, repo, other]) {
    mkdirSync(dir, { recursive: true });
  }
  mkdirSync(path.join(repo, '.git'));
  mkdirSync(path.join(other, '.git'));
  return { home, repo, other };
}

function digest(folder: string): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(folder, { recursive: true }).map(String).sort()) {
    const target = path.join(folder, file);
    hash.update(file);
    try {
      hash.update(readFileSync(target));
    } catch {
      hash.update('dir');
    }
  }
  return hash.digest('hex');
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('serve target', () => {
  it('finds the project of the current folder', async () => {
    const { home, repo } = sandbox();
    await registerProject(repo, home);

    const target = await resolveServeTarget(undefined, repo, home);

    expect(target.project?.id).toBe('demo-repo');
    expect(target.reason).toBe('folder');
  });

  it('finds the project by id', async () => {
    const { home, repo, other } = sandbox();
    await registerProject(repo, home);
    await registerProject(other, home);

    const target = await resolveServeTarget('acme-api', repo, home);

    expect(target.project?.id).toBe('acme-api');
    expect(target.reason).toBe('named');
  });

  it('finds the project by path', async () => {
    const { home, repo, other } = sandbox();
    await registerProject(repo, home);
    await registerProject(other, home);

    const target = await resolveServeTarget(other, repo, home);

    expect(target.project?.id).toBe('acme-api');
  });

  it('opens the workspace screen when the folder is not a project', async () => {
    const { home, other } = sandbox();
    await registerProject(other, home);

    const target = await resolveServeTarget(undefined, home, home);

    expect(target.project).toBeNull();
    expect(target.reason).toBe('none');
  });

  it('refuses an unknown project', async () => {
    const { home, repo } = sandbox();
    await registerProject(repo, home);

    await expect(resolveServeTarget('ghost', repo, home)).rejects.toMatchObject({ code: 'unknown-project' });
  });

  it('writes nothing', async () => {
    const { home, repo } = sandbox();
    await registerProject(repo, home);
    const before = digest(path.dirname(home));

    await resolveServeTarget('demo-repo', repo, home);

    expect(digest(path.dirname(home))).toBe(before);
  });
});

describe('serving', () => {
  it('prints the address once the server answers and stops the child', async () => {
    const controller = new AbortController();
    const stopped: unknown[] = [];
    const ready: string[] = [];

    const code = await startServing(null, {
      packageRoot: '/pkg',
      findPort: async () => 4400,
      start: (() => ({ exitCode: null, signalCode: null, kill: () => true })) as never,
      wait: async () => {
        controller.abort();
      },
      stop: async child => {
        stopped.push(child);
      },
      signal: controller.signal,
      onReady: address => ready.push(address),
    });

    expect(code).toBe(0);
    expect(ready).toEqual(['http://127.0.0.1:4400']);
    expect(stopped).toHaveLength(1);
  });

  it('builds the map address for a project', async () => {
    const ready: string[] = [];
    const controller = new AbortController();

    await startServing(
      {
        id: 'demo',
        name: 'demo',
        path: '/repo',
        addedAt: '2026-01-01T00:00:00.000Z',
        availability: 'ready',
        maps: [],
      } as never,
      {
        packageRoot: '/pkg',
        mapFile: 'main.tour.json',
        findPort: async () => 4400,
        start: (() => ({ exitCode: null, signalCode: null, kill: () => true })) as never,
        wait: async () => {
          controller.abort();
        },
        stop: async () => undefined,
        signal: controller.signal,
        onReady: address => ready.push(address),
      }
    );

    expect(ready).toEqual(['http://127.0.0.1:4400/p/demo/main.tour.json']);
  });
});
