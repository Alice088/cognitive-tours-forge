import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function canonical(target: string): string {
  const resolved = path.resolve(target);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

export function resolveInside(root: string, candidate: string): string | null {
  const rootPath = canonical(root);
  const target = canonical(path.resolve(rootPath, candidate));
  const relative = path.relative(rootPath, target);
  if (relative === '') {
    return rootPath;
  }
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return target;
}

export function isWithinHome(candidate: string): boolean {
  const home = canonical(homedir());
  const target = canonical(candidate);
  if (target === home) {
    return true;
  }
  const inside = path.relative(home, target);
  if (inside !== '' && !inside.startsWith('..') && !path.isAbsolute(inside)) {
    return true;
  }
  const above = path.relative(target, home);
  return above !== '' && !above.startsWith('..') && !path.isAbsolute(above);
}
