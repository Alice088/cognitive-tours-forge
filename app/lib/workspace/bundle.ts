import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { isWithinHome } from '@/app/lib/fs/safe-path';
import { cacheDir, listCachedMaps, readCachedMap, writeCachedMap } from '@/app/lib/workspace/cache';
import { mapDir } from '@/app/lib/workspace/map-file';
import { readRegistryWithNotice, registerProject, relinkProject, writeLastView } from '@/app/lib/workspace/registry';
import type { MapDocument, ProjectRef, ViewState } from '@/app/lib/workspace/types';

export type BundleRefusalCode =
  | 'bundle-missing'
  | 'bundle-unreadable'
  | 'bundle-not-json'
  | 'bundle-shape'
  | 'bundle-version'
  | 'outside-home'
  | 'target-not-folder';

export class BundleError extends Error {
  readonly code: BundleRefusalCode;

  constructor(code: BundleRefusalCode, message: string) {
    super(message);
    this.name = 'BundleError';
    this.code = code;
  }
}

export interface BundleProject {
  name: string;
  path: string;
  addedAt: string;
}

export interface BundleLastView {
  project: string;
  mapFile: string;
  tourId: string | null;
  step: number;
}

export interface Bundle {
  version: number;
  exportedAt: string;
  projects: BundleProject[];
  lastView: BundleLastView | null;
  maps: Record<string, MapDocument>;
}

export type ProjectAction = 'add' | 'already-added' | 'relink' | 'missing-folder' | 'skipped' | 'ignored-flag';

export interface PlanEntry {
  name: string;
  action: ProjectAction;
  folder: string | null;
  projectId: string | null;
  recorded: string | null;
  text: string;
}

export interface PlannedLastView {
  project: string;
  mapFile: string;
  tourId: string | null;
  step: number;
}

export interface BundlePlan {
  projects: PlanEntry[];
  mapsToCache: Array<{ project: string; file: string }>;
  lastView: PlannedLastView | null;
  lastViewNote: string | null;
}

export interface BundleResult extends BundlePlan {
  added: number;
  alreadyAdded: number;
  missing: number;
  skipped: number;
  mapsWritten: number;
  lastViewApplied: boolean;
}

const BUNDLE_VERSION = 1;

export function emptyBundle(): Bundle {
  return { version: BUNDLE_VERSION, exportedAt: new Date().toISOString(), projects: [], lastView: null, maps: {} };
}

export function serializeBundle(bundle: Bundle): string {
  const ordered: Bundle = {
    version: BUNDLE_VERSION,
    exportedAt: bundle.exportedAt,
    projects: bundle.projects,
    lastView: bundle.lastView,
    maps: bundle.maps,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

export async function buildBundle(home: string): Promise<{ bundle: Bundle; recoveredFrom: string | null }> {
  const { registry, recoveredFrom } = await readRegistryWithNotice(home);
  const bundle = emptyBundle();
  bundle.projects = registry.projects.map(project => ({
    name: project.name,
    path: project.path,
    addedAt: project.addedAt,
  }));

  for (const project of registry.projects) {
    for (const map of await listCachedMaps(home, project.id)) {
      const text = await fs.readFile(path.join(cacheDir(home, project.id), map.file), 'utf8').catch(() => null);
      if (text === null) {
        continue;
      }
      try {
        bundle.maps[`${project.name}/${map.file}`] = JSON.parse(text) as MapDocument;
      } catch {
        continue;
      }
    }
  }

  const view = registry.lastView;
  const owner = view ? registry.projects.find(project => project.id === view.projectId) : undefined;
  bundle.lastView =
    view && owner
      ? { project: owner.name, mapFile: view.mapFile, tourId: view.tourId ?? null, step: view.step ?? 0 }
      : null;

  return { bundle, recoveredFrom };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseBundle(text: string): Bundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BundleError('bundle-not-json', 'That file is not a workspace file.');
  }
  if (!isRecord(parsed)) {
    throw new BundleError('bundle-shape', 'That file is not a workspace file.');
  }
  const version = parsed.version;
  if (typeof version !== 'number') {
    throw new BundleError('bundle-shape', 'That file is not a workspace file.');
  }
  if (version > BUNDLE_VERSION) {
    throw new BundleError('bundle-version', 'That workspace file was written by a newer version.');
  }
  if (!Array.isArray(parsed.projects) || !isRecord(parsed.maps)) {
    throw new BundleError('bundle-shape', 'That file is not a workspace file.');
  }

  const projects: BundleProject[] = [];
  for (const entry of parsed.projects) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.path !== 'string') {
      throw new BundleError('bundle-shape', 'That file is not a workspace file.');
    }
    projects.push({
      name: entry.name,
      path: entry.path,
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : new Date().toISOString(),
    });
  }

  const maps: Record<string, MapDocument> = {};
  for (const [key, value] of Object.entries(parsed.maps)) {
    if (!isRecord(value) || !key.includes('/')) {
      throw new BundleError('bundle-shape', 'That file is not a workspace file.');
    }
    maps[key] = value as unknown as MapDocument;
  }

  let lastView: BundleLastView | null = null;
  if (
    isRecord(parsed.lastView) &&
    typeof parsed.lastView.project === 'string' &&
    typeof parsed.lastView.mapFile === 'string'
  ) {
    lastView = {
      project: parsed.lastView.project,
      mapFile: parsed.lastView.mapFile,
      tourId: typeof parsed.lastView.tourId === 'string' ? parsed.lastView.tourId : null,
      step:
        typeof parsed.lastView.step === 'number' && parsed.lastView.step >= 0 ? Math.floor(parsed.lastView.step) : 0,
    };
  }

  return {
    version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    projects,
    lastView,
    maps,
  };
}

async function usableFolder(folder: string | null | undefined): Promise<string | null> {
  if (!folder) {
    return null;
  }
  const resolved = path.resolve(folder);
  if (!isWithinHome(resolved)) {
    return null;
  }
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) {
    return null;
  }
  const writable = await fs
    .access(resolved, constants.W_OK)
    .then(() => true)
    .catch(() => false);
  return writable ? resolved : null;
}

async function realPath(folder: string): Promise<string> {
  return fs.realpath(folder).catch(() => path.resolve(folder));
}

async function folderHolds(folder: string, file: string): Promise<boolean> {
  const entries = await fs.readdir(mapDir(folder)).catch(() => [] as string[]);
  return entries.includes(file);
}

function mapCountFor(bundle: Bundle, name: string): number {
  return Object.keys(bundle.maps).filter(key => key.startsWith(`${name}/`)).length;
}

export async function planImport(
  bundle: Bundle,
  options: { projects: Record<string, string>; skip: string[] },
  home: string
): Promise<BundlePlan> {
  const { registry } = await readRegistryWithNotice(home);
  const projects: PlanEntry[] = [];

  for (const entry of bundle.projects) {
    const maps = mapCountFor(bundle, entry.name);
    const recorded = await usableFolder(entry.path);
    const flag = options.projects[entry.name];
    const flagged = await usableFolder(flag);

    if (options.skip.includes(entry.name)) {
      projects.push({
        name: entry.name,
        action: 'skipped',
        folder: null,
        projectId: null,
        recorded: entry.path,
        text: 'left out as asked',
      });
      continue;
    }

    const target = flagged ?? recorded;
    if (!target) {
      projects.push({
        name: entry.name,
        action: 'missing-folder',
        folder: null,
        projectId: null,
        recorded: entry.path,
        text: `no folder at ${entry.path}`,
      });
      continue;
    }

    const targetReal = await realPath(target);
    let byPath: ProjectRef | undefined;
    for (const project of registry.projects) {
      if ((await realPath(project.path)) === targetReal) {
        byPath = project;
        break;
      }
    }
    if (byPath) {
      projects.push({
        name: entry.name,
        action: 'already-added',
        folder: target,
        projectId: byPath.id,
        recorded: entry.path,
        text: 'already in your workspace',
      });
    } else {
      const byName = registry.projects.find(project => project.name === entry.name);
      projects.push({
        name: entry.name,
        action: byName ? 'relink' : 'add',
        folder: target,
        projectId: byName?.id ?? null,
        recorded: entry.path,
        text: `added, ${maps} maps`,
      });
    }

    if (flag && recorded && !flagged) {
      projects.push({
        name: entry.name,
        action: 'ignored-flag',
        folder: target,
        projectId: null,
        recorded: entry.path,
        text: `${flag} is not a folder inside your home, so ${target} is used`,
      });
    }
  }

  const mapsToCache: Array<{ project: string; file: string }> = [];
  for (const key of Object.keys(bundle.maps)) {
    const separator = key.indexOf('/');
    const projectName = key.slice(0, separator);
    const file = key.slice(separator + 1);
    const entry = projects.find(
      item =>
        item.name === projectName &&
        (item.action === 'add' || item.action === 'relink' || item.action === 'already-added') &&
        item.folder !== null
    );
    if (!entry || !entry.folder) {
      continue;
    }
    if (await folderHolds(entry.folder, file)) {
      continue;
    }
    if (entry.projectId && (await readCachedMap(home, entry.projectId, file)) !== null) {
      continue;
    }
    mapsToCache.push({ project: projectName, file });
  }

  let lastView: PlannedLastView | null = null;
  let lastViewNote: string | null = null;
  const wanted = bundle.lastView;
  if (wanted) {
    const label = `${wanted.project}/${wanted.mapFile}`;
    const entry = projects.find(
      item =>
        item.name === wanted.project &&
        (item.action === 'add' || item.action === 'relink' || item.action === 'already-added')
    );
    const inFolder = entry?.folder ? await folderHolds(entry.folder, wanted.mapFile) : false;
    const inBundle = `${wanted.project}/${wanted.mapFile}` in bundle.maps;
    const inCache = entry?.projectId ? (await readCachedMap(home, entry.projectId, wanted.mapFile)) !== null : false;
    if (entry && (inFolder || inBundle || inCache)) {
      lastView = {
        project: wanted.project,
        mapFile: wanted.mapFile,
        tourId: wanted.tourId,
        step: wanted.step,
      };
    } else {
      lastViewNote = `kept: ${label} is not in that project`;
    }
  }

  return { projects, mapsToCache, lastView, lastViewNote };
}

export async function applyPlan(bundle: Bundle, plan: BundlePlan, home: string): Promise<BundleResult> {
  const ids = new Map<string, string>();
  let added = 0;
  let alreadyAdded = 0;
  let missing = 0;
  let skipped = 0;

  for (const entry of plan.projects) {
    if (entry.action === 'add' && entry.folder) {
      const project = await registerProject(entry.folder, home);
      ids.set(entry.name, project.id);
      added += 1;
    } else if (entry.action === 'relink' && entry.folder && entry.projectId) {
      await relinkProject(entry.projectId, entry.folder, home);
      ids.set(entry.name, entry.projectId);
      added += 1;
    } else if (entry.action === 'already-added' && entry.projectId) {
      ids.set(entry.name, entry.projectId);
      alreadyAdded += 1;
    } else if (entry.action === 'missing-folder') {
      missing += 1;
    } else if (entry.action === 'skipped') {
      skipped += 1;
    }
  }

  let mapsWritten = 0;
  for (const item of plan.mapsToCache) {
    const projectId = ids.get(item.project);
    const document = bundle.maps[`${item.project}/${item.file}`];
    if (!projectId || !document) {
      continue;
    }
    await writeCachedMap(home, projectId, item.file, document);
    mapsWritten += 1;
  }

  let lastViewApplied = false;
  if (plan.lastView) {
    const projectId = ids.get(plan.lastView.project);
    if (projectId) {
      const view: ViewState = {
        projectId,
        mapFile: plan.lastView.mapFile,
        tourId: plan.lastView.tourId,
        step: plan.lastView.step,
      };
      await writeLastView(view, home);
      lastViewApplied = true;
    }
  }

  return { ...plan, added, alreadyAdded, missing, skipped, mapsWritten, lastViewApplied };
}
