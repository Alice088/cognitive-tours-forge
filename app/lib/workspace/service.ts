import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { isWithinHome } from '@/app/lib/fs/safe-path';
import { listCachedMaps, readCachedMap, writeCachedMap } from '@/app/lib/workspace/cache';
import {
  MapFileError,
  emptyDocument,
  mapDisplayName,
  mapFileName,
  mapMtime,
  readMap,
  mapDir,
  writeMap,
} from '@/app/lib/workspace/map-file';
import {
  readRegistry,
  registerProject,
  relinkProject,
  removeProject,
  workspaceHome,
  writeLastView,
} from '@/app/lib/workspace/registry';
import type {
  Availability,
  LoadReport,
  MapDocument,
  MapRef,
  ProjectSummary,
  ViewState,
  WorkspaceRegistry,
} from '@/app/lib/workspace/types';

export type WorkspaceCode =
  | 'not-a-directory'
  | 'not-readable'
  | 'already-registered'
  | 'refused-self'
  | 'outside-home'
  | 'unknown-project'
  | 'invalid-name'
  | 'name-taken'
  | 'project-unavailable';

export class WorkspaceError extends Error {
  readonly code: WorkspaceCode;
  readonly status: number;

  constructor(code: WorkspaceCode, message: string, status: number) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.status = status;
  }
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  entries: Array<{ name: string; isProject: boolean }>;
}

export async function readWorkspace(home: string = workspaceHome()): Promise<WorkspaceRegistry> {
  return readRegistry(home);
}

export async function listProjects(home: string = workspaceHome()): Promise<ProjectSummary[]> {
  const registry = await readRegistry(home);
  const summaries: ProjectSummary[] = [];
  for (const project of registry.projects) {
    summaries.push(await summarise(project.id, project.name, project.path, project.addedAt, home));
  }
  return summaries;
}

export async function projectById(projectId: string, home: string = workspaceHome()): Promise<ProjectSummary> {
  const registry = await readRegistry(home);
  const project = registry.projects.find(entry => entry.id === projectId);
  if (!project) {
    throw new WorkspaceError('unknown-project', 'That project is no longer in your workspace.', 404);
  }
  return summarise(project.id, project.name, project.path, project.addedAt, home);
}

async function summarise(
  id: string,
  name: string,
  target: string,
  addedAt: string,
  home: string
): Promise<ProjectSummary> {
  const maps: MapRef[] = [];
  let availability: Availability;
  let error: string | null = null;
  try {
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) {
      throw new Error('not a directory');
    }
    const entries = await fs.readdir(mapDir(target)).catch(() => null);
    if (entries === null) {
      availability = 'uninitialised';
    } else {
      for (const file of entries.filter(entry => entry.endsWith('.tour.json')).sort()) {
        maps.push({ file, name: mapDisplayName(file) });
      }
      availability = maps.length > 0 ? 'ready' : 'uninitialised';
    }
  } catch {
    availability = 'unavailable';
    error = `Not found at ${target}`;
    maps.push(...(await listCachedMaps(home, id)));
  }
  return { id, name, path: target, addedAt, availability, maps, error };
}

export async function loadMap(
  projectId: string,
  file: string,
  home: string = workspaceHome()
): Promise<{ document: MapDocument; report: LoadReport; mtimeMs: number | null; readOnly: boolean }> {
  const project = await projectById(projectId, home);
  if (project.availability === 'unavailable') {
    const cached = await readCachedMap(home, projectId, file);
    if (!cached) {
      throw new WorkspaceError('project-unavailable', 'That project folder cannot be reached.', 409);
    }
    return { ...cached, mtimeMs: null, readOnly: true };
  }
  const { document, report } = await readMap(project.path, file);
  await rememberMap(projectId, file, document, home).catch(() => undefined);
  return { document, report, mtimeMs: await mapMtime(project.path, file), readOnly: false };
}

export async function rememberMap(
  projectId: string,
  file: string,
  document: MapDocument,
  home: string = workspaceHome()
): Promise<void> {
  await writeCachedMap(home, projectId, file, document);
}

export async function addProject(
  target: string,
  home: string = workspaceHome(),
  selfRoot: string | null = process.cwd()
): Promise<ProjectSummary> {
  const resolved = path.resolve(target);
  if (!isWithinHome(resolved)) {
    throw new WorkspaceError('outside-home', 'Choose a folder inside your home directory.', 403);
  }
  if (selfRoot !== null && resolved === path.resolve(selfRoot)) {
    throw new WorkspaceError('refused-self', 'That is the application itself.', 400);
  }
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new WorkspaceError('not-a-directory', 'That folder does not exist.', 400);
  }
  if (!stat.isDirectory()) {
    throw new WorkspaceError('not-a-directory', 'That path is not a folder.', 400);
  }
  try {
    await fs.access(resolved, constants.R_OK);
  } catch {
    throw new WorkspaceError('not-readable', 'That folder cannot be read.', 403);
  }
  const registry = await readRegistry(home);
  const existing = registry.projects.find(project => project.path === resolved);
  if (existing) {
    throw new WorkspaceError('already-registered', `Already in your workspace as ${existing.name}.`, 409);
  }
  const project = await registerProject(resolved, home);
  return summarise(project.id, project.name, project.path, project.addedAt, home);
}

export async function relink(
  projectId: string,
  target: string,
  home: string = workspaceHome()
): Promise<ProjectSummary> {
  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new WorkspaceError('not-a-directory', 'That folder does not exist.', 400);
  }
  const project = await relinkProject(projectId, resolved, home);
  return summarise(project.id, project.name, project.path, project.addedAt, home);
}

export async function forgetProject(projectId: string, home: string = workspaceHome()): Promise<void> {
  await removeProject(projectId, home);
}

export async function createMap(projectId: string, name: string, home: string = workspaceHome()): Promise<MapRef> {
  const project = await projectById(projectId, home);
  if (project.availability === 'unavailable') {
    throw new WorkspaceError('project-unavailable', 'That project folder cannot be reached.', 409);
  }
  const file = mapFileName(name);
  if (!file) {
    throw new WorkspaceError('invalid-name', 'Give the map a name with letters or digits.', 400);
  }
  const existing = await fs.readdir(mapDir(project.path)).catch(() => [] as string[]);
  if (existing.includes(file)) {
    throw new WorkspaceError('name-taken', 'A map with that name already exists.', 409);
  }
  try {
    await writeMap(project.path, file, emptyDocument(project.name));
  } catch (error) {
    if (error instanceof MapFileError) {
      throw new WorkspaceError('invalid-name', error.message, 400);
    }
    throw error;
  }
  return { file, name: mapDisplayName(file) };
}

export async function saveViewState(view: ViewState, home: string = workspaceHome()): Promise<void> {
  await writeLastView(view, home);
}

export async function browse(target: string): Promise<BrowseResult> {
  const resolved = path.resolve(target);
  if (!isWithinHome(resolved)) {
    throw new WorkspaceError('outside-home', 'Browsing is limited to your home directory.', 403);
  }
  const entries = await fs.readdir(resolved, { withFileTypes: true }).catch(() => null);
  if (entries === null) {
    throw new WorkspaceError('not-readable', 'That folder cannot be read.', 403);
  }
  const directories: BrowseResult['entries'] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    const child = path.join(resolved, entry.name);
    const isProject = await fs
      .stat(mapDir(child))
      .then(stat => stat.isDirectory())
      .catch(() => false);
    directories.push({ name: entry.name, isProject });
  }
  directories.sort((a, b) => a.name.localeCompare(b.name));
  const parent = path.dirname(resolved);
  return {
    path: resolved,
    parent: parent === resolved ? null : parent,
    entries: directories,
  };
}
