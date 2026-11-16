import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveInside } from '@/app/lib/fs/safe-path';
import { WAYPOINT_TYPES } from '@/app/lib/theme/tokens';
import {
  MapFileError,
  canonicalText,
  isMapFile,
  mapDir,
  mapDisplayName,
  mapPath,
  readMap,
  readMapStrict,
  serializeDocument,
  writeMap,
} from '@/app/lib/workspace/map-file';
import { parseRegistry, registryPath, uniqueId } from '@/app/lib/workspace/registry';
import type { LoadReport, MapDocument, ProjectRef, Tour, Waypoint } from '@/app/lib/workspace/types';
import { Refusal } from './refusals';

export type ProjectView = {
  id: string;
  name: string;
  folder: string;
  available: boolean;
  maps: { file: string; name: string; waypoints: number; tours: number; readable: boolean }[];
};

export type ProjectTarget = { id: string; name: string; folder: string };
export type MapTarget = { project: ProjectTarget; file: string };

export type MapView = {
  project: string;
  map: string;
  state: string;
  savedAt: string;
  document: MapDocument;
  omitted: Omitted;
};

export type Omitted = {
  waypoints: number;
  links: number;
  stops: number;
  paths: number;
  unknownTypes: number;
};

export type CommitResult = {
  changed: boolean;
  state: string;
  savedAt?: string;
};

export function stateOf(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

export function omittedFrom(report: LoadReport): Omitted {
  return {
    waypoints: report.droppedWaypoints,
    links: report.droppedEdges,
    stops: report.droppedStops,
    paths: report.droppedPaths,
    unknownTypes: report.unknownTypes,
  };
}

async function projectRefs(home: string): Promise<ProjectRef[]> {
  const file = registryPath(home);
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return [];
  }
  try {
    return parseRegistry(text).projects;
  } catch {
    throw new Refusal('workspace-unreadable', file);
  }
}

async function mapFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(mapDir(folder)).catch(() => null);
  return entries === null ? [] : entries.filter(isMapFile).sort();
}

export async function readProjects(home: string): Promise<ProjectView[]> {
  const views: ProjectView[] = [];
  for (const project of await projectRefs(home)) {
    const stat = await fs.stat(project.path).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      views.push({ id: project.id, name: project.name, folder: project.path, available: false, maps: [] });
      continue;
    }
    const maps: ProjectView['maps'] = [];
    for (const file of await mapFiles(project.path)) {
      const loaded = await readMap(project.path, file).catch(() => null);
      maps.push({
        file,
        name: mapDisplayName(file),
        waypoints: loaded ? loaded.document.waypoints.length : 0,
        tours: loaded ? loaded.document.tours.length : 0,
        readable: loaded !== null,
      });
    }
    views.push({ id: project.id, name: project.name, folder: project.path, available: true, maps });
  }
  return views;
}

export async function resolveProject(home: string, reference: string): Promise<ProjectTarget> {
  const projects = await projectRefs(home);
  const ids = projects.map(project => project.id);
  const byId = projects.find(project => project.id === reference);
  if (byId) {
    return target(byId);
  }
  const byName = projects.filter(project => project.name.toLowerCase() === reference.toLowerCase());
  if (byName.length === 1) {
    return target(byName[0]);
  }
  if (byName.length > 1) {
    throw new Refusal('project-ambiguous', reference, { allowed: byName.map(project => project.id) });
  }
  if (path.isAbsolute(reference)) {
    const resolved = await fs.realpath(reference).catch(() => path.resolve(reference));
    const byPath = projects.find(project => project.path === resolved);
    if (byPath) {
      return target(byPath);
    }
  }
  throw new Refusal('project-unknown', reference, { allowed: ids });
}

function target(project: ProjectRef): ProjectTarget {
  return { id: project.id, name: project.name, folder: project.path };
}

export async function resolveMap(home: string, reference: string, map?: string): Promise<MapTarget> {
  const project = await resolveProject(home, reference);
  const stat = await fs.stat(project.folder).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Refusal('project-gone', project.id);
  }
  const files = await mapFiles(project.folder);
  if (map) {
    if (!files.includes(map)) {
      throw new Refusal('map-unknown', map, { allowed: files });
    }
    return { project, file: map };
  }
  if (files.length === 1) {
    return { project, file: files[0] };
  }
  if (files.length === 0) {
    throw new Refusal('map-unknown', map ?? project.id, { allowed: files });
  }
  throw new Refusal('map-required', project.id, { allowed: files });
}

export async function readTarget(
  target: MapTarget
): Promise<{ document: MapDocument; state: string; savedAt: string }> {
  const file = mapPath(target.project.folder, target.file);
  const bytes = await fs.readFile(file).catch(() => null);
  if (bytes === null) {
    throw new Refusal('map-missing', target.file);
  }
  const stat = await fs.stat(file);
  const loaded = await readMap(target.project.folder, target.file).catch(error => {
    throw mapRefusal(error, target.file);
  });
  return {
    document: loaded.document,
    state: stateOf(bytes),
    savedAt: new Date(stat.mtimeMs).toISOString(),
  };
}

export async function readStrict(
  target: MapTarget
): Promise<{ document: MapDocument; state: string; savedAt: string }> {
  const file = mapPath(target.project.folder, target.file);
  const bytes = await fs.readFile(file).catch(() => null);
  if (bytes === null) {
    throw new Refusal('map-missing', target.file);
  }
  const stat = await fs.stat(file);
  const loaded = await readMapStrict(target.project.folder, target.file).catch(error => {
    throw mapRefusal(error, target.file);
  });
  return {
    document: loaded.document,
    state: stateOf(bytes),
    savedAt: new Date(stat.mtimeMs).toISOString(),
  };
}

export async function readView(target: MapTarget): Promise<MapView> {
  const file = mapPath(target.project.folder, target.file);
  const bytes = await fs.readFile(file).catch(() => null);
  if (bytes === null) {
    throw new Refusal('map-missing', target.file);
  }
  const stat = await fs.stat(file);
  const loaded = await readMap(target.project.folder, target.file).catch(error => {
    throw mapRefusal(error, target.file);
  });
  return {
    project: target.project.id,
    map: target.file,
    state: stateOf(bytes),
    savedAt: new Date(stat.mtimeMs).toISOString(),
    document: loaded.document,
    omitted: omittedFrom(loaded.report),
  };
}

export async function commit(target: MapTarget, document: MapDocument, state: string): Promise<CommitResult> {
  const current = await readStrict(target);
  const next = canonicalText(document);
  if (current.state !== state) {
    if (canonicalText(current.document) === next) {
      return { changed: false, state: current.state };
    }
    const view = await readView(target).catch(() => undefined);
    throw new Refusal('map-changed', target.file, { state: current.state, map: view });
  }
  if (canonicalText(current.document) === next) {
    return { changed: false, state: current.state };
  }
  const saved = await writeMap(target.project.folder, target.file, document);
  return { changed: true, state: stateOf(serializeDocument(document)), savedAt: saved.savedAt };
}

export function findWaypoint(document: MapDocument, reference: string): Waypoint {
  const byId = document.waypoints.find(waypoint => waypoint.id === reference);
  if (byId) {
    return byId;
  }
  const byLabel = document.waypoints.filter(waypoint => waypoint.label === reference);
  if (byLabel.length === 1) {
    return byLabel[0];
  }
  if (byLabel.length > 1) {
    throw new Refusal('waypoint-ambiguous', reference, { allowed: byLabel.map(waypoint => waypoint.id) });
  }
  throw new Refusal('waypoint-unknown', reference);
}

export function findTour(document: MapDocument, reference: string): Tour {
  const byId = document.tours.find(tour => tour.id === reference);
  if (byId) {
    return byId;
  }
  const byName = document.tours.filter(tour => tour.name === reference);
  if (byName.length === 1) {
    return byName[0];
  }
  if (byName.length > 1) {
    throw new Refusal('tour-unknown', reference, { allowed: byName.map(tour => tour.id) });
  }
  throw new Refusal('tour-unknown', reference, { allowed: document.tours.map(tour => tour.id) });
}

export function checkProjectPath(project: ProjectTarget, file: string): string {
  const inside = resolveInside(project.folder, file);
  if (inside === null) {
    throw new Refusal('path-outside', file);
  }
  return inside;
}

export function checkType(type: unknown): Waypoint['type'] {
  if (typeof type !== 'string' || !WAYPOINT_TYPES.includes(type as Waypoint['type'])) {
    throw new Refusal('type-unknown', String(type), { allowed: [...WAYPOINT_TYPES] });
  }
  return type as Waypoint['type'];
}

export function checkLabel(label: unknown): string {
  if (typeof label !== 'string' || label.trim() === '') {
    throw new Refusal('label-empty', '');
  }
  return label.trim();
}

export function slugId(label: string, taken: string[], prefix = ''): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return uniqueId(`${prefix}${slug || 'item'}`, taken);
}

export function mapRefusal(error: unknown, file: string): Refusal {
  if (error instanceof Refusal) {
    return error;
  }
  if (error instanceof MapFileError) {
    if (error.code === 'map-missing') {
      return new Refusal('map-missing', file);
    }
    if (error.code === 'path-escape') {
      return new Refusal('map-unknown', file);
    }
    return new Refusal('map-unreadable', error.message);
  }
  return new Refusal('map-unreadable', `${file} cannot be read`);
}
