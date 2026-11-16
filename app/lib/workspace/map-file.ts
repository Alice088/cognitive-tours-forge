import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveInside } from '@/app/lib/fs/safe-path';
import { serializeDocument } from '@/app/lib/workspace/serialize';
import { WAYPOINT_TYPES, type WaypointType } from '@/app/lib/theme/tokens';
import {
  MAP_VERSION,
  type Edge,
  type LoadReport,
  type MapDocument,
  type Tour,
  type Waypoint,
} from '@/app/lib/workspace/types';

export { serializeDocument };

export type MapFileCode = 'map-missing' | 'map-unreadable' | 'invalid-document' | 'path-escape';

export class MapFileError extends Error {
  readonly code: MapFileCode;

  constructor(code: MapFileCode, message: string) {
    super(message);
    this.name = 'MapFileError';
    this.code = code;
  }
}

const MAP_FILE = /^[a-z0-9][a-z0-9-]*\.tour\.json$/;

export function isMapFile(file: string): boolean {
  return MAP_FILE.test(file);
}

export function mapFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}.tour.json` : '';
}

export function mapDisplayName(file: string): string {
  return file.replace(/\.tour\.json$/, '');
}

export function toursDir(projectRoot: string): string {
  return path.join(projectRoot, '.tours');
}

export function emptyDocument(projectName: string): MapDocument {
  return {
    version: MAP_VERSION,
    project: { name: projectName, createdAt: new Date().toISOString() },
    waypoints: [],
    edges: [],
    tours: [],
  };
}

export function mapPath(projectRoot: string, file: string): string {
  if (!MAP_FILE.test(file)) {
    throw new MapFileError('path-escape', `Not a map file name: ${file}`);
  }
  const target = resolveInside(toursDir(projectRoot), file);
  if (!target) {
    throw new MapFileError('path-escape', `Map file escapes the project: ${file}`);
  }
  return target;
}

export async function readMap(
  projectRoot: string,
  file: string
): Promise<{ document: MapDocument; report: LoadReport }> {
  const target = mapPath(projectRoot, file);
  let text: string;
  try {
    text = await fs.readFile(target, 'utf8');
  } catch {
    throw new MapFileError('map-missing', `No map at ${file}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new MapFileError('map-unreadable', `${file} is not valid JSON`);
  }
  return normalizeDocument(parsed);
}

export async function readMapStrict(
  projectRoot: string,
  file: string
): Promise<{ document: MapDocument; report: LoadReport }> {
  const { document, report } = await readMap(projectRoot, file);
  const lost = losses(report);
  if (lost !== null) {
    throw new MapFileError('map-unreadable', `${file} would lose ${lost}`);
  }
  return { document, report };
}

function losses(report: LoadReport): string | null {
  const parts = [
    tally(report.droppedWaypoints, 'waypoint'),
    tally(report.droppedEdges, 'link'),
    tally(report.droppedStops, 'stop'),
    tally(report.droppedPaths, 'file path'),
    tally(report.unknownTypes, 'waypoint type'),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : null;
}

function tally(count: number, noun: string): string | null {
  return count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'}` : null;
}

export function canonicalText(document: MapDocument): string {
  try {
    return serializeDocument(normalizeDocument(document).document);
  } catch {
    return serializeDocument(document);
  }
}

export function normalizeDocument(raw: unknown): { document: MapDocument; report: LoadReport } {
  const source = (raw ?? {}) as Record<string, unknown>;
  if (source.version !== MAP_VERSION) {
    throw new MapFileError('map-unreadable', `Unsupported map version: ${String(source.version)}`);
  }
  const project = (source.project ?? {}) as Record<string, unknown>;
  if (typeof project.name !== 'string' || project.name.trim() === '') {
    throw new MapFileError('map-unreadable', 'Map document has no project name');
  }

  const report: LoadReport = {
    droppedWaypoints: 0,
    droppedEdges: 0,
    droppedStops: 0,
    droppedPaths: 0,
    unknownTypes: 0,
    waypointCount: 0,
  };

  const waypoints: Waypoint[] = [];
  const known = new Set<string>();
  for (const entry of asArray(source.waypoints)) {
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.id !== 'string' || !candidate.id.startsWith('w-') || known.has(candidate.id)) {
      report.droppedWaypoints += 1;
      continue;
    }
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
    if (!label) {
      report.droppedWaypoints += 1;
      continue;
    }
    known.add(candidate.id);
    const type = toWaypointType(candidate.type, report);
    const rawPosition = (candidate.position ?? {}) as Record<string, unknown>;
    const position = { x: finite(rawPosition.x), y: finite(rawPosition.y) };
    let file: string | undefined;
    if (typeof candidate.file === 'string' && candidate.file.trim() !== '') {
      if (path.isAbsolute(candidate.file)) {
        report.droppedPaths += 1;
      } else {
        file = candidate.file;
      }
    }
    waypoints.push({
      id: candidate.id,
      label,
      type,
      description: optionalString(candidate.description),
      notes: optionalString(candidate.notes),
      file,
      position,
    });
  }
  report.waypointCount = waypoints.length;

  const edges: Edge[] = [];
  for (const entry of asArray(source.edges)) {
    const candidate = entry as Record<string, unknown>;
    const source_ = candidate.source;
    const target_ = candidate.target;
    if (typeof source_ !== 'string' || typeof target_ !== 'string') {
      report.droppedEdges += 1;
      continue;
    }
    if (!known.has(source_) || !known.has(target_)) {
      report.droppedEdges += 1;
      continue;
    }
    edges.push({
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `e-${edges.length + 1}`,
      source: source_,
      target: target_,
      label: optionalString(candidate.label),
    });
  }

  const tours: Tour[] = [];
  for (const entry of asArray(source.tours)) {
    const candidate = entry as Record<string, unknown>;
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    if (!name) {
      continue;
    }
    const stops: Tour['stops'] = [];
    for (const rawStop of asArray(candidate.stops)) {
      const stop = rawStop as Record<string, unknown>;
      if (typeof stop.waypointId !== 'string' || !known.has(stop.waypointId)) {
        report.droppedStops += 1;
        continue;
      }
      stops.push({ waypointId: stop.waypointId, narrative: optionalString(stop.narrative) });
    }
    tours.push({
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `t-${tours.length + 1}`,
      name,
      description: optionalString(candidate.description),
      author: optionalString(candidate.author),
      updatedAt: optionalString(candidate.updatedAt),
      stops,
    });
  }

  return {
    document: {
      version: MAP_VERSION,
      project: {
        name: project.name,
        createdAt:
          typeof project.createdAt === 'string' && project.createdAt ? project.createdAt : new Date().toISOString(),
      },
      waypoints,
      edges,
      tours,
    },
    report,
  };
}

export function validateDocument(document: MapDocument): void {
  if (document.version !== MAP_VERSION) {
    throw new MapFileError('invalid-document', 'version must be 1');
  }
  if (!document.project.name?.trim()) {
    throw new MapFileError('invalid-document', 'project.name must not be empty');
  }
  const ids = new Set<string>();
  for (const waypoint of document.waypoints) {
    if (!waypoint.id.startsWith('w-')) {
      throw new MapFileError('invalid-document', `waypoint ${waypoint.id} must start with w-`);
    }
    if (ids.has(waypoint.id)) {
      throw new MapFileError('invalid-document', `duplicate waypoint ${waypoint.id}`);
    }
    if (!waypoint.label.trim()) {
      throw new MapFileError('invalid-document', `waypoint ${waypoint.id} has no label`);
    }
    if (!WAYPOINT_TYPES.includes(waypoint.type)) {
      throw new MapFileError('invalid-document', `waypoint ${waypoint.id} has an unknown type`);
    }
    if (!Number.isFinite(waypoint.position.x) || !Number.isFinite(waypoint.position.y)) {
      throw new MapFileError('invalid-document', `waypoint ${waypoint.id} has an invalid position`);
    }
    ids.add(waypoint.id);
  }
  for (const edge of document.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      throw new MapFileError('invalid-document', `edge ${edge.id} points at a missing waypoint`);
    }
  }
  for (const tour of document.tours) {
    if (!tour.name.trim()) {
      throw new MapFileError('invalid-document', `tour ${tour.id} has no name`);
    }
    for (const stop of tour.stops) {
      if (!ids.has(stop.waypointId)) {
        throw new MapFileError('invalid-document', `tour ${tour.id} has a missing stop`);
      }
    }
  }
}

export async function writeMap(
  projectRoot: string,
  file: string,
  document: MapDocument
): Promise<{ savedAt: string; waypointCount: number; mtimeMs: number }> {
  validateDocument(document);
  const target = mapPath(projectRoot, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, serializeDocument(document), 'utf8');
  await fs.rename(temporary, target);
  const stat = await fs.stat(target);
  return {
    savedAt: new Date().toISOString(),
    waypointCount: document.waypoints.length,
    mtimeMs: stat.mtimeMs,
  };
}

export async function mapMtime(projectRoot: string, file: string): Promise<number | null> {
  try {
    const stat = await fs.stat(mapPath(projectRoot, file));
    return stat.mtimeMs;
  } catch {
    return null;
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toWaypointType(value: unknown, report: LoadReport): WaypointType {
  if (typeof value === 'string' && (WAYPOINT_TYPES as readonly string[]).includes(value)) {
    return value as WaypointType;
  }
  report.unknownTypes += 1;
  return 'Open Question';
}
