import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { canonicalText, normalizeDocument, serializeDocument } from '@/app/lib/workspace/map-file';
import { recordOwnWrite, stopAllSyncWatchers, syncMode, watchMap } from '@/app/lib/workspace/sync';
import type { SyncEvent } from '@/app/lib/workspace/sync-events';
import type { MapDocument } from '@/app/lib/workspace/types';

const roots: string[] = [];

function fixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'ctour-sync-'));
  mkdirSync(path.join(root, '.ctour'));
  roots.push(root);
  return root;
}

function document(label: string): MapDocument {
  return normalizeDocument({
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: [{ id: 'w-1', label, type: 'Goal', position: { x: 0, y: 0 } }],
    edges: [],
    tours: [],
  }).document;
}

function canonical(label: string): string {
  return serializeDocument(document(label));
}

function write(root: string, label: string, file = 'main.tour.json'): void {
  writeFileSync(path.join(root, '.ctour', file), canonical(label), 'utf8');
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
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function settle(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

afterEach(() => {
  stopAllSyncWatchers();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('sync watcher', () => {
  it('delivers a change made to the open map', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-1',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    write(root, 'second');

    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('second');
    expect(changed.report.waypointCount).toBe(1);
    expect(typeof changed.mtimeMs).toBe('number');
    subscription.close();
  });

  it('says nothing when the content is identical', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-2',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    write(root, 'first');
    await settle();
    write(root, 'first');
    await settle();

    expect(events).toHaveLength(0);
    subscription.close();
  });

  it('collapses five changes into one settled update', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-3',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 60,
    });
    await subscription.ready;
    events.length = 0;

    for (const label of ['a', 'b', 'c', 'd', 'e']) {
      write(root, label);
    }
    await until(() => events.some(event => event.type === 'map-changed'));
    await settle(400);

    const updates = events.filter(event => event.type === 'map-changed');
    expect(updates).toHaveLength(1);
    if (updates[0].type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(updates[0].document.waypoints[0].label).toBe('e');
    subscription.close();
  });

  it('does not deliver a write this process made', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-4',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    recordOwnWrite('p-4', 'main.tour.json', canonical('second'));
    write(root, 'second');
    await settle();

    expect(events).toHaveLength(0);

    write(root, 'third');
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('third');
    subscription.close();
  });

  it('reports a delivered file that disappears once', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-5',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    write(root, 'second');
    await until(() => events.some(event => event.type === 'map-changed'));
    rmSync(path.join(root, '.ctour', 'main.tour.json'));

    await until(() => events.some(event => event.type === 'map-gone'));
    await settle();

    expect(events.filter(event => event.type === 'map-gone')).toHaveLength(1);
    subscription.close();
  });

  it('refuses an unreadable file and reports it once per attempt', async () => {
    const root = fixture();
    write(root, 'first');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-6',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    writeFileSync(path.join(root, '.ctour', 'main.tour.json'), '<<<<<<< HEAD\n', 'utf8');
    const unreadable = await until(() => events.find(event => event.type === 'map-unreadable'));
    if (unreadable.type !== 'map-unreadable') {
      throw new Error('expected a map-unreadable event');
    }
    expect(unreadable.file).toBe('main.tour.json');
    expect(unreadable.reason.length).toBeGreaterThan(0);
    await settle();
    expect(events.filter(event => event.type === 'map-unreadable')).toHaveLength(1);

    write(root, 'second');
    await until(() => events.some(event => event.type === 'map-changed'));

    writeFileSync(path.join(root, '.ctour', 'main.tour.json'), '{"version":1', 'utf8');
    await until(() => events.filter(event => event.type === 'map-unreadable').length === 2);

    expect(events.filter(event => event.type === 'map-changed')).toHaveLength(1);
    subscription.close();
  });

  it('keeps one watcher until the last subscription closes', async () => {
    const root = fixture();
    write(root, 'first');
    const first: SyncEvent[] = [];
    const second: SyncEvent[] = [];
    const a = watchMap({
      projectId: 'p-7',
      root,
      file: 'main.tour.json',
      emit: event => first.push(event),
      debounceMs: 40,
    });
    const b = watchMap({
      projectId: 'p-7',
      root,
      file: 'main.tour.json',
      emit: event => second.push(event),
      debounceMs: 40,
    });
    await Promise.all([a.ready, b.ready]);
    first.length = 0;
    second.length = 0;
    expect(syncMode('p-7')).toBe('watch');

    a.close();
    write(root, 'second');
    await until(() => second.some(event => event.type === 'map-changed'));
    expect(first).toHaveLength(0);

    b.close();
    expect(syncMode('p-7')).toBeNull();
    write(root, 'third');
    await settle();
    expect(second.filter(event => event.type === 'map-changed')).toHaveLength(1);
  });

  it('does not deliver an own write that normalises differently', async () => {
    const root = fixture();
    const initial: MapDocument = {
      ...document('first'),
      waypoints: [{ id: 'w-1', label: 'first', type: 'Goal', description: 'old note', position: { x: 0, y: 0 } }],
    };
    writeFileSync(path.join(root, '.ctour', 'main.tour.json'), serializeDocument(initial), 'utf8');
    const events: SyncEvent[] = [];
    const subscription = watchMap({
      projectId: 'p-echo',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 40,
    });
    await subscription.ready;
    events.length = 0;

    const saved: MapDocument = {
      ...initial,
      waypoints: [{ id: 'w-1', label: 'first', type: 'Goal', description: '', position: { x: 0, y: 0 } }],
    };
    recordOwnWrite('p-echo', 'main.tour.json', canonicalText(saved));
    writeFileSync(path.join(root, '.ctour', 'main.tour.json'), serializeDocument(saved), 'utf8');
    await settle(400);

    expect(events).toHaveLength(0);
    subscription.close();
  });
});
