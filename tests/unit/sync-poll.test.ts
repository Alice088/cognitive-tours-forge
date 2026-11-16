import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeDocument, serializeDocument } from '@/app/lib/workspace/map-file';
import { stopAllSyncWatchers, syncMode, watchMap } from '@/app/lib/workspace/sync';
import type { SyncEvent } from '@/app/lib/workspace/sync-events';
import type { MapDocument } from '@/app/lib/workspace/types';

let root = '';
const events: SyncEvent[] = [];

function documentWith(label: string): MapDocument {
  return normalizeDocument({
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: [{ id: 'w-1', label, type: 'Goal', position: { x: 0, y: 0 } }],
    edges: [],
    tours: [],
  }).document;
}

function write(label: string): void {
  writeFileSync(path.join(root, '.ctour', 'main.tour.json'), serializeDocument(documentWith(label)), 'utf8');
}

function noNotifications(): never {
  throw new Error('this filesystem reports nothing');
}

function silentWatcher(): FSWatcher {
  const watcher = new EventEmitter() as unknown as FSWatcher & { close: () => void };
  watcher.close = () => undefined;
  return watcher;
}

async function until<T>(check: () => T | null | undefined, timeoutMs = 4000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = check();
    if (value) {
      return value;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error('timed out waiting for a condition');
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

function settle(ms = 250): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'ctour-poll-'));
  mkdirSync(path.join(root, '.ctour'));
  write('first');
  events.length = 0;
});

afterEach(() => {
  stopAllSyncWatchers();
  rmSync(root, { recursive: true, force: true });
});

describe('comparison fallback', () => {
  it('delivers a change when the watcher never reports', async () => {
    const subscription = watchMap({
      projectId: 'p-silent',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 40,
      watchImpl: silentWatcher,
    });
    await subscription.ready;
    events.length = 0;
    expect(syncMode('p-silent')).toBe('watch');

    write('second');
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('second');
    subscription.close();
  });

  it('reports a change when the filesystem reports nothing', async () => {
    const subscription = watchMap({
      projectId: 'p-poll-1',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 40,
      watchImpl: noNotifications,
    });
    await subscription.ready;
    events.length = 0;
    expect(syncMode('p-poll-1')).toBe('poll');

    write('second');
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('second');
    subscription.close();
  });

  it('delivers one update however many ticks pass', async () => {
    const subscription = watchMap({
      projectId: 'p-poll-2',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 30,
      watchImpl: noNotifications,
    });
    await subscription.ready;
    events.length = 0;

    write('second');
    await until(() => events.some(event => event.type === 'map-changed'));
    await settle(300);

    expect(events.filter(event => event.type === 'map-changed')).toHaveLength(1);
    subscription.close();
  });

  it('settles several changes into the last state', async () => {
    const subscription = watchMap({
      projectId: 'p-poll-3',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 30,
      watchImpl: noNotifications,
    });
    await subscription.ready;
    events.length = 0;

    write('second');
    write('third');
    write('fourth');
    await until(() => events.some(event => event.type === 'map-changed'));
    await settle(200);

    const updates = events.filter(event => event.type === 'map-changed');
    expect(updates).toHaveLength(1);
    if (updates[0].type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(updates[0].document.waypoints[0].label).toBe('fourth');
    subscription.close();
  });

  it('stops comparing when the last subscription closes', async () => {
    const subscription = watchMap({
      projectId: 'p-poll-4',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 30,
      watchImpl: noNotifications,
    });
    await subscription.ready;
    events.length = 0;
    subscription.close();
    expect(syncMode('p-poll-4')).toBeNull();

    write('second');
    await settle(250);
    expect(events).toHaveLength(0);
  });

  it('does not go back to watching after falling back', async () => {
    const subscription = watchMap({
      projectId: 'p-poll-5',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      pollMs: 30,
      watchImpl: noNotifications,
    });
    await subscription.ready;
    events.length = 0;
    write('second');
    await until(() => events.length > 0);
    expect(syncMode('p-poll-5')).toBe('poll');
    subscription.close();
  });
});
