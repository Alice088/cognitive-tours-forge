import { promises as fsPromises, watch as fsWatch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import {
  MapFileError,
  mapDir,
  mapDisplayName,
  mapMtime,
  readMapStrict,
  serializeDocument,
} from '@/app/lib/workspace/map-file';
import type { SyncEvent } from '@/app/lib/workspace/sync-events';
import type { MapRef } from '@/app/lib/workspace/types';

export const SYNC_DEBOUNCE_MS = 120;
export const SYNC_POLL_MS = 2000;

export type SyncMode = 'watch' | 'poll';

type WatchImpl = (dir: string, listener: (eventType: string, filename: string | Buffer | null) => void) => FSWatcher;

export interface SyncOptions {
  debounceMs?: number;
  pollMs?: number;
  watchImpl?: WatchImpl;
}

export interface SyncSubscription {
  ready: Promise<void>;
  close: () => void;
}

interface FileSub {
  kind: 'map';
  file: string;
  emit: (event: SyncEvent) => void;
  deliveredText: string | null;
  state: 'fresh' | 'present' | 'unreadable' | 'gone';
  fresh: boolean;
}

interface ListSub {
  kind: 'list';
  emit: (event: SyncEvent) => void;
  announced: string | null;
}

type Sub = FileSub | ListSub;

interface ProjectSync {
  key: string;
  projectId: string;
  root: string;
  tours: string;
  mode: SyncMode;
  watcher: FSWatcher | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  debounceMs: number;
  pollMs: number;
  watchImpl: WatchImpl;
  subs: Sub[];
  ownWrites: Map<string, string>;
  sweeping: Promise<void> | null;
  again: boolean;
}

interface Registry {
  projects: Map<string, ProjectSync>;
}

const REGISTRY_KEY = Symbol.for('ctour.sync.registry');

function registry(): Map<string, ProjectSync> {
  const holder = globalThis as typeof globalThis & { [REGISTRY_KEY]?: Registry };
  holder[REGISTRY_KEY] ??= { projects: new Map() };
  return holder[REGISTRY_KEY].projects;
}

export function watchMap(
  input: SyncOptions & { projectId: string; root: string; file: string; emit: (event: SyncEvent) => void }
): SyncSubscription {
  const project = projectFor(input);
  const sub: FileSub = {
    kind: 'map',
    file: input.file,
    emit: input.emit,
    deliveredText: null,
    state: 'fresh',
    fresh: true,
  };
  project.subs.push(sub);
  return {
    ready: refreshMap(project, sub),
    close: () => release(project, sub),
  };
}

export function watchList(
  input: SyncOptions & { projectId: string; root: string; emit: (event: SyncEvent) => void }
): SyncSubscription {
  const project = projectFor(input);
  const sub: ListSub = { kind: 'list', emit: input.emit, announced: null };
  project.subs.push(sub);
  return {
    ready: refreshList(project),
    close: () => release(project, sub),
  };
}

export function recordOwnWrite(projectId: string, file: string, text: string): void {
  for (const project of projectsOf(projectId)) {
    project.ownWrites.delete(file);
    project.ownWrites.set(file, text);
    while (project.ownWrites.size > 20) {
      const oldest = project.ownWrites.keys().next();
      if (oldest.done) {
        break;
      }
      project.ownWrites.delete(oldest.value);
    }
  }
}

export function ownWriteFor(projectId: string, file: string): string | null {
  for (const project of projectsOf(projectId)) {
    const text = project.ownWrites.get(file);
    if (text !== undefined) {
      return text;
    }
  }
  return null;
}

export function syncMode(projectId: string): SyncMode | null {
  for (const project of projectsOf(projectId)) {
    return project.mode;
  }
  return null;
}

export function stopAllSyncWatchers(): void {
  for (const project of [...registry().values()]) {
    halt(project);
  }
  registry().clear();
}

function projectsOf(projectId: string): ProjectSync[] {
  return [...registry().values()].filter(project => project.projectId === projectId);
}

async function listMaps(root: string): Promise<MapRef[]> {
  const entries = await fsPromises.readdir(mapDir(root)).catch(() => null);
  if (entries === null) {
    return [];
  }
  return entries
    .filter(entry => entry.endsWith('.tour.json'))
    .sort()
    .map(file => ({ file, name: mapDisplayName(file) }));
}

function projectFor(input: SyncOptions & { projectId: string; root: string }): ProjectSync {
  const root = path.resolve(input.root);
  const key = `${input.projectId}\u0000${root}`;
  const existing = registry().get(key);
  if (existing) {
    return existing;
  }
  const project: ProjectSync = {
    key,
    projectId: input.projectId,
    root,
    tours: mapDir(root),
    mode: 'watch',
    watcher: null,
    debounceTimer: null,
    pollTimer: null,
    debounceMs: input.debounceMs ?? SYNC_DEBOUNCE_MS,
    pollMs: input.pollMs ?? SYNC_POLL_MS,
    watchImpl: input.watchImpl ?? fsWatch,
    subs: [],
    ownWrites: new Map(),
    sweeping: null,
    again: false,
  };
  registry().set(project.key, project);
  startWatching(project);
  return project;
}

function startWatching(project: ProjectSync): void {
  try {
    const watcher = project.watchImpl(project.tours, () => schedule(project));
    watcher.on('error', () => stopWatching(project));
    project.watcher = watcher;
    project.mode = 'watch';
  } catch {
    stopWatching(project);
  }
  startComparing(project);
}

function stopWatching(project: ProjectSync): void {
  project.watcher?.close();
  project.watcher = null;
  project.mode = 'poll';
}

function startComparing(project: ProjectSync): void {
  if (project.pollTimer) {
    return;
  }
  project.pollTimer = setInterval(() => schedule(project), project.pollMs);
}

function schedule(project: ProjectSync): void {
  if (project.debounceTimer) {
    return;
  }
  project.debounceTimer = setTimeout(() => {
    project.debounceTimer = null;
    void sweep(project);
  }, project.debounceMs);
}

async function sweep(project: ProjectSync): Promise<void> {
  if (project.sweeping) {
    project.again = true;
    return project.sweeping;
  }
  project.sweeping = (async () => {
    do {
      project.again = false;
      const maps = project.subs.filter((sub): sub is FileSub => sub.kind === 'map');
      for (const sub of maps) {
        await refreshMap(project, sub);
      }
      if (project.subs.some(sub => sub.kind === 'list')) {
        await refreshList(project);
      }
    } while (project.again);
  })();
  try {
    await project.sweeping;
  } finally {
    project.sweeping = null;
  }
}

async function refreshMap(project: ProjectSync, sub: FileSub): Promise<void> {
  const first = sub.fresh;
  sub.fresh = false;
  try {
    const { document, report } = await readMapStrict(project.root, sub.file);
    const text = serializeDocument(document);
    if (ownWriteFor(project.projectId, sub.file) === text) {
      project.ownWrites.delete(sub.file);
      sub.deliveredText = text;
      sub.state = 'present';
      return;
    }
    if (!first && sub.state === 'present' && sub.deliveredText === text) {
      return;
    }
    sub.deliveredText = text;
    sub.state = 'present';
    sub.emit({
      type: 'map-changed',
      document,
      report,
      mtimeMs: (await mapMtime(project.root, sub.file)) ?? Date.now(),
    });
    return;
  } catch (error) {
    if (error instanceof MapFileError && error.code === 'map-missing') {
      const announce = first || sub.state === 'present' || sub.state === 'unreadable';
      sub.state = 'gone';
      sub.deliveredText = null;
      if (announce) {
        sub.emit({ type: 'map-gone', file: sub.file });
      }
      return;
    }
    if (!first && sub.state === 'unreadable') {
      return;
    }
    sub.state = 'unreadable';
    sub.deliveredText = null;
    sub.emit({
      type: 'map-unreadable',
      file: sub.file,
      reason: error instanceof Error ? error.message : `${sub.file} cannot be read`,
    });
  }
}

async function refreshList(project: ProjectSync): Promise<void> {
  const maps = await listMaps(project.root);
  const key = JSON.stringify(maps);
  for (const sub of project.subs) {
    if (sub.kind !== 'list' || sub.announced === key) {
      continue;
    }
    sub.announced = key;
    sub.emit({ type: 'maps-changed', maps });
  }
}

function release(project: ProjectSync, sub: Sub): void {
  project.subs = project.subs.filter(candidate => candidate !== sub);
  if (project.subs.length === 0) {
    halt(project);
    registry().delete(project.key);
  }
}

function halt(project: ProjectSync): void {
  project.watcher?.close();
  project.watcher = null;
  if (project.debounceTimer) {
    clearTimeout(project.debounceTimer);
    project.debounceTimer = null;
  }
  if (project.pollTimer) {
    clearInterval(project.pollTimer);
    project.pollTimer = null;
  }
  project.subs = [];
}
