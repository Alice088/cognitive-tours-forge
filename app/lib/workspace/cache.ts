import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mapDisplayName, normalizeDocument, serializeDocument } from '@/app/lib/workspace/map-file';
import type { LoadReport, MapDocument, MapRef } from '@/app/lib/workspace/types';

const MAP_FILE = /^[a-z0-9][a-z0-9-]*\.tour\.json$/;

export function cacheDir(home: string, projectId: string): string {
  return path.join(home, 'cache', projectId);
}

function cachePath(home: string, projectId: string, file: string): string | null {
  if (!MAP_FILE.test(file) || !/^[a-z0-9][a-z0-9-]*$/.test(projectId)) {
    return null;
  }
  return path.join(cacheDir(home, projectId), file);
}

export async function listCachedMaps(home: string, projectId: string): Promise<MapRef[]> {
  const entries = await fs.readdir(cacheDir(home, projectId)).catch(() => [] as string[]);
  return entries
    .filter(entry => MAP_FILE.test(entry))
    .sort()
    .map(file => ({ file, name: mapDisplayName(file) }));
}

export async function writeCachedMap(
  home: string,
  projectId: string,
  file: string,
  document: MapDocument
): Promise<void> {
  const target = cachePath(home, projectId, file);
  if (!target) {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, serializeDocument(document), 'utf8');
  await fs.rename(temporary, target);
}

export async function readCachedMap(
  home: string,
  projectId: string,
  file: string
): Promise<{ document: MapDocument; report: LoadReport } | null> {
  const target = cachePath(home, projectId, file);
  if (!target) {
    return null;
  }
  const text = await fs.readFile(target, 'utf8').catch(() => null);
  if (text === null) {
    return null;
  }
  try {
    return normalizeDocument(JSON.parse(text));
  } catch {
    return null;
  }
}
