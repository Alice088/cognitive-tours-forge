import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listProjects, WorkspaceError } from '@/app/lib/workspace/service';
import { readRegistryWithNotice, workspaceHome } from '@/app/lib/workspace/registry';
import type { ProjectSummary } from '@/app/lib/workspace/types';
import { resolveTarget } from '../lib/target';
import { findFreePort } from '../lib/port';
import { startServer, stopServer, waitForServer } from '../lib/server';

export type ServeTarget = {
  project: ProjectSummary | null;
  reason: 'named' | 'folder' | 'none';
  recoveredFrom: string | null;
};

async function samePath(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([fs.realpath(left).catch(() => left), fs.realpath(right).catch(() => right)]);
  return a === b;
}

async function byPath(target: string, projects: ProjectSummary[]): Promise<ProjectSummary | null> {
  for (const project of projects) {
    if (await samePath(project.path, target)) {
      return project;
    }
  }
  return null;
}

async function byArgument(argument: string, projects: ProjectSummary[]): Promise<ProjectSummary | null> {
  const direct = projects.find(project => project.id === argument || project.name === argument);
  if (direct) {
    return direct;
  }
  return path.isAbsolute(argument) || argument.startsWith('.') ? byPath(path.resolve(argument), projects) : null;
}

async function isFolder(argument: string): Promise<boolean> {
  return fs
    .stat(path.resolve(argument))
    .then(stat => stat.isDirectory())
    .catch(() => false);
}

export async function resolveServeTarget(
  argument: string | undefined,
  folder: string,
  home = workspaceHome()
): Promise<ServeTarget> {
  const { recoveredFrom } = await readRegistryWithNotice(home);
  const projects = await listProjects(home);

  if (argument) {
    const project = await byArgument(argument, projects);
    if (project) {
      return { project, reason: 'named', recoveredFrom };
    }
    if (await isFolder(argument)) {
      return { project: null, reason: 'none', recoveredFrom };
    }
    throw new WorkspaceError('unknown-project', `No project named ${argument}.`, 404);
  }

  const here = await resolveTarget(folder, 'read').catch(() => null);
  if (!here) {
    return { project: null, reason: 'none', recoveredFrom };
  }
  const project = await byPath(here.root, projects);
  return project ? { project, reason: 'folder', recoveredFrom } : { project: null, reason: 'none', recoveredFrom };
}

export function addressFor(port: number, project: ProjectSummary | null, mapFile?: string): string {
  const base = `http://127.0.0.1:${port}`;
  if (!project) {
    return base;
  }
  return mapFile ? `${base}/p/${project.id}/${mapFile}` : `${base}/p/${project.id}`;
}

function interrupted(signal?: AbortSignal): Promise<void> {
  if (signal) {
    return signal.aborted
      ? Promise.resolve()
      : new Promise(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
  }
  return new Promise(resolve => {
    const stop = () => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}

export type ServeOptions = {
  port?: number;
  packageRoot: string;
  mapFile?: string;
  signal?: AbortSignal;
  findPort?: typeof findFreePort;
  start?: typeof startServer;
  wait?: typeof waitForServer;
  stop?: typeof stopServer;
  onReady?: (address: string) => void;
};

export async function startServing(project: ProjectSummary | null, options: ServeOptions): Promise<number> {
  const findPort = options.findPort ?? findFreePort;
  const start = options.start ?? startServer;
  const wait = options.wait ?? waitForServer;
  const stop = options.stop ?? stopServer;

  const port = await findPort(options.port ?? 4317);
  const address = addressFor(port, project, options.mapFile);
  const child = start({ port, packageRoot: options.packageRoot });

  try {
    await wait(addressFor(port, null));
    options.onReady?.(address);
    await interrupted(options.signal);
    return 0;
  } finally {
    await stop(child);
  }
}
