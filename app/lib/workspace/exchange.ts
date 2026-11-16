import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertInsideHome } from '@/app/lib/fs/safe-path';
import { cacheDir, writeCachedMap } from '@/app/lib/workspace/cache';
import {
  MAP_VERSION,
  SUPPORTED_TOURS,
  SUPPORTED_WAYPOINTS,
  type LoadReport,
  type MapDocument,
  type ProjectSummary,
} from '@/app/lib/workspace/types';
import {
  isMapFile,
  mapDir,
  mapDisplayName,
  mapFileName,
  mapPath,
  normalizeDocument,
  writeMapIfAbsent,
} from '@/app/lib/workspace/map-file';

export type Dropped = {
  droppedWaypoints: number;
  droppedEdges: number;
  droppedStops: number;
  droppedPaths: number;
  unknownTypes: number;
};

export type ImportRefusalCode =
  | 'outside-home'
  | 'not-found'
  | 'not-a-file'
  | 'unreadable-file'
  | 'not-json'
  | 'not-a-map'
  | 'map-version'
  | 'name-unusable'
  | 'name-exhausted'
  | 'project-unavailable'
  | 'losses-not-accepted'
  | 'target-exists-folder';

export type ExchangeCode =
  | ImportRefusalCode
  | 'invalid-request'
  | 'unknown-project'
  | 'unknown-map'
  | 'target-not-folder'
  | 'target-not-writable';

export class ExchangeError extends Error {
  readonly code: ExchangeCode;
  readonly status: number;
  readonly detail?: string;

  constructor(code: ExchangeCode, message: string, status = 400, detail?: string) {
    super(message);
    this.name = 'ExchangeError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type Skipped = { file: string; text: string };

export interface ImportPreview {
  path: string;
  file: string;
  name: string | null;
  displayName: string | null;
  waypoints: number;
  links: number;
  tours: number;
  dropped: Dropped;
  tooBig: boolean;
  taken: string[];
  lossText: string | null;
  refusal: { code: ImportRefusalCode; text: string } | null;
}

export interface ImportResult {
  file: string;
  displayName: string;
  waypoints: number;
  links: number;
  tours: number;
  dropped: Dropped;
  tooBig: boolean;
  source: 'file';
}

export interface ImportOutcome {
  added: ImportResult[];
  skipped: Skipped[];
}

export interface FolderPreview {
  folder: string;
  entries: ImportPreview[];
  refused: ImportPreview[];
}

export type ExportSource = 'project' | 'last-known';

export interface WrittenFile {
  file: string;
  path: string;
}

export interface ExportResult {
  source: ExportSource;
  written: WrittenFile[];
  skipped: Skipped[];
}

const NO_DROPS: Dropped = {
  droppedWaypoints: 0,
  droppedEdges: 0,
  droppedStops: 0,
  droppedPaths: 0,
  unknownTypes: 0,
};

const REFUSAL_TEXT: Record<ImportRefusalCode, (name: string) => string> = {
  'outside-home': name => `${name} is outside your home folder.`,
  'not-found': name => `There is no file at ${name}.`,
  'not-a-file': name => `${name} is a folder, not a map file.`,
  'unreadable-file': name => `${name} cannot be read.`,
  'not-json': name => `${name} is not a map.`,
  'not-a-map': name => `${name} is not a map.`,
  'map-version': name => `${name} was written in a map version this product does not read.`,
  'name-unusable': name => `${name} cannot become a map name.`,
  'name-exhausted': name => `There is no free name left for ${name} in this project.`,
  'project-unavailable': () => 'That project folder cannot be reached.',
  'losses-not-accepted': name => `${name} holds entries this product cannot represent.`,
  'target-exists-folder': name => `${name} is not a folder.`,
};

export function refusalText(code: ImportRefusalCode, name: string): string {
  return REFUSAL_TEXT[code](name);
}

export function droppedOf(report: LoadReport): Dropped {
  return {
    droppedWaypoints: report.droppedWaypoints,
    droppedEdges: report.droppedEdges,
    droppedStops: report.droppedStops,
    droppedPaths: report.droppedPaths,
    unknownTypes: report.unknownTypes,
  };
}

export function lossCount(dropped: Dropped): number {
  return (
    dropped.droppedWaypoints + dropped.droppedEdges + dropped.droppedStops + dropped.droppedPaths + dropped.unknownTypes
  );
}

function tally(count: number, noun: string): string | null {
  return count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'}` : null;
}

export function lossSentence(dropped: Dropped, displayName: string): string {
  const parts = [
    tally(dropped.droppedWaypoints, 'waypoint'),
    tally(dropped.droppedEdges, 'link'),
    tally(dropped.droppedStops, 'stop'),
    tally(dropped.droppedPaths, 'file path'),
  ].filter((part): part is string => part !== null);
  return `${displayName} would lose ${parts.join(', ')}.`;
}

export function baseNameOf(file: string): string {
  return file.replace(/\.tour\.json$/i, '').replace(/\.json$/i, '');
}

export async function mapFiles(projectRoot: string): Promise<string[]> {
  const entries = await fs.readdir(mapDir(projectRoot)).catch(() => [] as string[]);
  return entries.filter(isMapFile).sort();
}

export function freeName(file: string, taken: string[]): string | null {
  const base = file.replace(/\.tour\.json$/, '');
  if (!base) {
    return null;
  }
  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? file : `${base}-${index}.tour.json`;
    if (!taken.includes(candidate) && isMapFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function freeCopyName(folder: string, file: string): Promise<{ name: string; renamed: string | null }> {
  const existing = await fs.readdir(folder).catch(() => [] as string[]);
  const name = freeName(file, existing);
  if (!name) {
    throw new ExchangeError('name-exhausted', refusalText('name-exhausted', file), 409);
  }
  return { name, renamed: name === file ? null : file };
}

export async function checkDestination(folder: string): Promise<string> {
  const resolved = path.resolve(folder);
  try {
    assertInsideHome(resolved);
  } catch {
    throw new ExchangeError('outside-home', `${path.basename(resolved)} is outside your home folder.`, 403);
  }
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new ExchangeError('target-not-folder', `${resolved} is not a folder.`, 409);
  }
  const writable = await fs
    .access(resolved, 2)
    .then(() => true)
    .catch(() => false);
  if (!writable) {
    throw new ExchangeError('target-not-writable', `${resolved} cannot be written to.`, 409);
  }
  return resolved;
}

export type SourceRead =
  { ok: true; document: MapDocument; report: LoadReport } | { ok: false; code: ImportRefusalCode; text: string };

function refuse(code: ImportRefusalCode, name: string): SourceRead {
  return { ok: false, code, text: refusalText(code, name) };
}

export async function readSource(sourcePath: string): Promise<SourceRead> {
  const resolved = path.resolve(sourcePath);
  const name = path.basename(resolved);
  try {
    assertInsideHome(resolved);
  } catch {
    return refuse('outside-home', name);
  }
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat) {
    return refuse('not-found', name);
  }
  if (!stat.isFile()) {
    return refuse('not-a-file', name);
  }
  const text = await fs.readFile(resolved, 'utf8').catch(() => null);
  if (text === null) {
    return refuse('unreadable-file', name);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return refuse('not-json', name);
  }
  const version = (parsed as { version?: unknown } | null)?.version;
  if (typeof version === 'number' && version !== MAP_VERSION) {
    return refuse('map-version', name);
  }
  try {
    const { document, report } = normalizeDocument(parsed, { dropUnknownTypes: true });
    return { ok: true, document, report };
  } catch {
    return refuse('not-a-map', name);
  }
}

export async function previewPath(
  sourcePath: string,
  projectRoot: string | null,
  claimed: string[] = []
): Promise<ImportPreview> {
  const resolved = path.resolve(sourcePath);
  const file = path.basename(resolved);
  const empty: ImportPreview = {
    path: resolved,
    file,
    name: null,
    displayName: null,
    waypoints: 0,
    links: 0,
    tours: 0,
    dropped: NO_DROPS,
    tooBig: false,
    taken: [],
    lossText: null,
    refusal: null,
  };

  const source = await readSource(resolved);
  if (!source.ok) {
    return { ...empty, refusal: { code: source.code, text: source.text } };
  }

  const candidate = mapFileName(baseNameOf(file));
  if (!candidate) {
    return { ...empty, refusal: { code: 'name-unusable', text: refusalText('name-unusable', file) } };
  }

  const existing = projectRoot ? [...(await mapFiles(projectRoot)), ...claimed] : [];
  const name = freeName(candidate, existing);
  if (!name) {
    return { ...empty, refusal: { code: 'name-exhausted', text: refusalText('name-exhausted', file) } };
  }

  const counts = {
    waypoints: source.document.waypoints.length,
    links: source.document.edges.length,
    tours: source.document.tours.length,
  };

  const dropped = droppedOf(source.report);

  return {
    ...empty,
    ...counts,
    name,
    displayName: mapDisplayName(name),
    dropped,
    tooBig: counts.waypoints > SUPPORTED_WAYPOINTS || counts.tours > SUPPORTED_TOURS,
    taken: name === candidate ? [] : [candidate],
    lossText: lossCount(dropped) > 0 ? lossSentence(dropped, mapDisplayName(name)) : null,
  };
}

async function copyInto(
  project: ProjectSummary,
  home: string,
  file: string,
  folder: string
): Promise<{ written: WrittenFile; skipped: Skipped[] }> {
  const source =
    project.availability === 'unavailable' ? path.join(cacheDir(home, project.id), file) : mapPath(project.path, file);
  const bytes = await fs.readFile(source);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { name, renamed } = await freeCopyName(folder, file);
    const destination = path.join(folder, name);
    try {
      await fs.writeFile(destination, bytes, { flag: 'wx' });
      return {
        written: { file: name, path: destination },
        skipped: renamed
          ? [{ file: renamed, text: `${renamed} was already in that folder, so the copy is ${name}.` }]
          : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
  throw new ExchangeError('name-exhausted', refusalText('name-exhausted', file), 409);
}

export async function exportMaps(options: {
  project: ProjectSummary;
  home: string;
  folder: string;
  mapFile?: string;
  all?: boolean;
}): Promise<ExportResult> {
  const { project, home, folder, mapFile, all } = options;
  const destination = await checkDestination(folder);
  const files = all ? project.maps.map(entry => entry.file) : mapFile ? [mapFile] : [];
  if (!all && mapFile && !project.maps.some(entry => entry.file === mapFile)) {
    throw new ExchangeError('unknown-map', `There is no map called ${mapFile} in that project.`, 404);
  }

  const written: WrittenFile[] = [];
  const skipped: Skipped[] = [];
  for (const file of files) {
    if (all) {
      try {
        const result = await copyInto(project, home, file, destination);
        written.push(result.written);
        skipped.push(...result.skipped);
      } catch (error) {
        skipped.push({
          file,
          text: error instanceof Error ? error.message : `${file} could not be copied.`,
        });
      }
      continue;
    }
    const result = await copyInto(project, home, file, destination);
    written.push(result.written);
    skipped.push(...result.skipped);
  }

  return {
    source: project.availability === 'unavailable' ? 'last-known' : 'project',
    written,
    skipped,
  };
}

export async function importOne(options: {
  project: ProjectSummary;
  home: string;
  sourcePath: string;
  acceptLosses?: boolean;
}): Promise<ImportOutcome> {
  const { project, home, sourcePath, acceptLosses = false } = options;
  if (project.availability === 'unavailable') {
    throw new ExchangeError('project-unavailable', refusalText('project-unavailable', ''), 409);
  }

  const preview = await previewPath(sourcePath, project.path);
  const file = path.basename(preview.path);
  if (preview.refusal) {
    return { added: [], skipped: [{ file, text: preview.refusal.text }] };
  }

  const source = await readSource(preview.path);
  if (!source.ok) {
    return { added: [], skipped: [{ file, text: source.text }] };
  }

  const displayName = preview.displayName ?? mapDisplayName(preview.name ?? '');
  if (lossCount(preview.dropped) > 0 && !acceptLosses) {
    throw new ExchangeError(
      'losses-not-accepted',
      lossSentence(preview.dropped, displayName),
      409,
      JSON.stringify({ dropped: preview.dropped })
    );
  }

  const base = mapFileName(baseNameOf(file));
  let name = preview.name;
  for (let attempt = 0; attempt < 3 && name; attempt += 1) {
    const created = await writeMapIfAbsent(project.path, name, source.document);
    if (created) {
      await writeCachedMap(home, project.id, name, source.document);
      return {
        added: [
          {
            file: name,
            displayName: mapDisplayName(name),
            waypoints: source.document.waypoints.length,
            links: source.document.edges.length,
            tours: source.document.tours.length,
            dropped: droppedOf(source.report),
            tooBig:
              source.document.waypoints.length > SUPPORTED_WAYPOINTS || source.document.tours.length > SUPPORTED_TOURS,
            source: 'file',
          },
        ],
        skipped: [],
      };
    }
    name = freeName(base, await mapFiles(project.path));
  }

  throw new ExchangeError('name-exhausted', refusalText('name-exhausted', file), 409);
}

export async function checkFolder(folder: string): Promise<string> {
  const resolved = path.resolve(folder);
  try {
    assertInsideHome(resolved);
  } catch {
    throw new ExchangeError('outside-home', `${path.basename(resolved)} is outside your home folder.`, 403);
  }
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat) {
    throw new ExchangeError('not-found', `There is no folder at ${resolved}.`, 404);
  }
  if (!stat.isDirectory()) {
    throw new ExchangeError('not-a-file', `${resolved} is not a folder.`, 400);
  }
  return resolved;
}

export async function listMapFolder(folder: string): Promise<string[]> {
  const resolved = await checkFolder(folder);
  const entries = await fs.readdir(resolved, { withFileTypes: true }).catch(() => []);
  return entries
    .filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name.toLowerCase().endsWith('.json'))
    .map(entry => entry.name)
    .sort();
}

export async function previewFolder(folder: string, projectRoot: string | null): Promise<FolderPreview> {
  const resolved = await checkFolder(folder);
  const entries: ImportPreview[] = [];
  const refused: ImportPreview[] = [];
  const claimed: string[] = [];
  for (const file of await listMapFolder(resolved)) {
    const preview = await previewPath(path.join(resolved, file), projectRoot, claimed);
    if (preview.refusal) {
      refused.push(preview);
      continue;
    }
    if (preview.name) {
      claimed.push(preview.name);
    }
    entries.push(preview);
  }
  return { folder: resolved, entries, refused };
}

export async function importFolder(options: {
  project: ProjectSummary;
  home: string;
  folder: string;
  acceptLosses?: boolean;
}): Promise<ImportOutcome> {
  const { project, home, folder, acceptLosses = false } = options;
  if (project.availability === 'unavailable') {
    throw new ExchangeError('project-unavailable', refusalText('project-unavailable', ''), 409);
  }
  const resolved = await checkFolder(folder);
  const added: ImportResult[] = [];
  const skipped: Skipped[] = [];
  const held = await mapFiles(project.path);
  for (const file of await listMapFolder(resolved)) {
    const candidate = mapFileName(baseNameOf(file));
    if (candidate && held.includes(candidate)) {
      skipped.push({ file, text: `${file} is already in this project.` });
      continue;
    }
    try {
      const outcome = await importOne({
        project,
        home,
        sourcePath: path.join(resolved, file),
        acceptLosses,
      });
      added.push(...outcome.added);
      skipped.push(...outcome.skipped);
    } catch (error) {
      skipped.push({
        file,
        text: error instanceof Error ? error.message : `${file} could not be imported.`,
      });
    }
  }
  return { added, skipped };
}
