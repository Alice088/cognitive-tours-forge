import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const START_TIMEOUT_MS = 10_000;
const READY_STEP_MS = 100;
const STOP_GRACE_MS = 1000;

export class ServerStartError extends Error {}

export function serverEntry(packageRoot: string): string {
  return path.join(packageRoot, '.next', 'standalone', 'server.js');
}

export type StartOptions = {
  port: number;
  packageRoot: string;
  spawnImpl?: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
};

export function startServer(options: StartOptions): ChildProcess {
  const entry = serverEntry(options.packageRoot);
  const run = options.spawnImpl ?? spawn;
  return run(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      PORT: String(options.port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function waitForServer(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = START_TIMEOUT_MS,
  stepMs = READY_STEP_MS
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const ready = await fetchImpl(`${url}/api/workspace`)
      .then(response => response.ok)
      .catch(() => false);
    if (ready) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new ServerStartError(`${url} did not answer within ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    await delay(stepMs);
  }
}

export function stopServer(child: ChildProcess, graceMs = STOP_GRACE_MS): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, graceMs);
    child.once('exit', finish);
    child.kill('SIGTERM');
  });
}

export async function findPackageRoot(start: string): Promise<string> {
  let current = path.resolve(start);
  for (;;) {
    const entry = serverEntry(current);
    const present = await fs.stat(entry).catch(() => null);
    if (present) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new ServerStartError('the built interface is missing: run npm run build:all');
    }
    current = parent;
  }
}
