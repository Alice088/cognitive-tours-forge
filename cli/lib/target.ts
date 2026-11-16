import { constants, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { isWithinHome } from '@/app/lib/fs/safe-path';

export type TargetCode = 'not-a-directory' | 'outside-home' | 'home-directory' | 'not-writable' | 'map-dir-blocked';

export class TargetError extends Error {
  readonly code: TargetCode;

  constructor(code: TargetCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type TargetSource = 'repository' | 'folder';

export type ResolvedTarget = {
  requested: string;
  root: string;
  source: TargetSource;
  mapDir: string;
};

async function canonicalHome(): Promise<string> {
  return fs.realpath(homedir()).catch(() => homedir());
}

async function realDirectory(folder: string): Promise<string> {
  const resolved = path.resolve(folder);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new TargetError('not-a-directory', `${folder} is not a folder.`);
  }
  return fs.realpath(resolved);
}

async function enclosingRepository(start: string): Promise<{ root: string; source: TargetSource }> {
  let current = start;
  for (;;) {
    const marker = await fs.stat(path.join(current, '.git')).catch(() => null);
    if (marker) {
      return { root: current, source: 'repository' };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return { root: start, source: 'folder' };
    }
    current = parent;
  }
}

export async function resolveTarget(folder: string, mode: 'read' | 'write'): Promise<ResolvedTarget> {
  const requested = await realDirectory(folder);
  const home = await canonicalHome();

  if (requested === home) {
    throw new TargetError(
      'home-directory',
      'Your home folder holds the workspace itself. Name the project folder instead.'
    );
  }
  if (!isWithinHome(requested)) {
    throw new TargetError('outside-home', 'Choose a folder inside your home directory.');
  }

  const { root, source } = await enclosingRepository(requested);
  if (root === home) {
    throw new TargetError(
      'home-directory',
      'The repository root is your home folder, which holds the workspace itself. Name a project folder instead.'
    );
  }

  const mapDir = path.join(root, '.ctour');
  if (mode === 'write') {
    const existing = await fs.stat(mapDir).catch(() => null);
    if (existing && !existing.isDirectory()) {
      throw new TargetError('map-dir-blocked', `${mapDir} is not a folder.`);
    }
    const target = existing ? mapDir : root;
    const writable = await fs
      .access(target, constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (!writable) {
      throw new TargetError('not-writable', `${target} cannot be written to.`);
    }
  }

  return { requested, root, source, mapDir };
}
