import { promises as fs } from 'node:fs';
import { emptyRegistry, parseRegistry, registryPath, workspaceHome } from '@/app/lib/workspace/registry';
import { isMapFile, mapDir, readMapStrict } from '@/app/lib/workspace/map-file';
import type { StatusRow } from '../lib/report';

export type StatusResult = { rows: StatusRow[]; workspaceProblem: string | null };

async function readWorkspace(home: string): Promise<{ text: string | null; problem: string | null }> {
  const file = registryPath(home);
  try {
    return { text: await fs.readFile(file, 'utf8'), problem: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { text: null, problem: code === 'ENOENT' ? null : `${file} cannot be read.` };
  }
}

async function rowFor(project: { id: string; name: string; path: string }): Promise<StatusRow> {
  const base = { id: project.id, name: project.name, path: project.path };
  const stat = await fs.stat(project.path).catch(() => null);
  if (!stat?.isDirectory()) {
    return { ...base, state: 'missing', maps: null, waypoints: null, tours: null, problem: 'the folder is not there' };
  }

  const files = (await fs.readdir(mapDir(project.path)).catch(() => [] as string[])).filter(isMapFile).sort();
  if (files.length === 0) {
    return { ...base, state: 'no-map', maps: 0, waypoints: 0, tours: 0, problem: null };
  }

  let waypoints = 0;
  let tours = 0;
  for (const file of files) {
    try {
      const { document } = await readMapStrict(project.path, file);
      waypoints += document.waypoints.length;
      tours += document.tours.length;
    } catch {
      return {
        ...base,
        state: 'unreadable',
        maps: files.length,
        waypoints: null,
        tours: null,
        problem: `${file} cannot be read`,
      };
    }
  }

  return { ...base, state: 'ok', maps: files.length, waypoints, tours, problem: null };
}

export async function buildStatus(home = workspaceHome()): Promise<StatusResult> {
  const { text, problem } = await readWorkspace(home);
  if (problem) {
    return { rows: [], workspaceProblem: problem };
  }
  if (text === null) {
    return { rows: [], workspaceProblem: null };
  }

  let registry;
  try {
    registry = parseRegistry(text);
  } catch {
    return { rows: [], workspaceProblem: `${registryPath(home)} is not a workspace file.` };
  }

  const rows: StatusRow[] = [];
  for (const project of registry.projects ?? emptyRegistry().projects) {
    rows.push(await rowFor(project));
  }
  return { rows, workspaceProblem: null };
}
