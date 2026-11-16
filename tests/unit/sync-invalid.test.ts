import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeDocument, serializeDocument } from '@/app/lib/workspace/map-file';
import { stopAllSyncWatchers, watchMap } from '@/app/lib/workspace/sync';
import type { SyncEvent } from '@/app/lib/workspace/sync-events';
import type { MapDocument } from '@/app/lib/workspace/types';

let root = '';
let target = '';
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

function write(text: string): void {
  writeFileSync(target, text, 'utf8');
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

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'ctour-invalid-'));
  mkdirSync(path.join(root, '.tours'));
  target = path.join(root, '.tours', 'main.tour.json');
  write(serializeDocument(documentWith('first')));
  events.length = 0;
});

afterEach(() => {
  stopAllSyncWatchers();
  rmSync(root, { recursive: true, force: true });
});

describe('unreadable and missing files', () => {
  it('reports one unreadable state per attempt and never the content', async () => {
    const subscription = watchMap({
      projectId: 'p-bad-1',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    events.length = 0;

    write('<<<<<<< HEAD\n');
    await until(() => events.some(event => event.type === 'map-unreadable'));
    await settle();
    expect(events.filter(event => event.type === 'map-unreadable')).toHaveLength(1);

    write('<<<<<<< HEAD\n');
    await settle();
    expect(events.filter(event => event.type === 'map-unreadable')).toHaveLength(1);

    write('{"version": 1, "project": {"name": ""}}');
    await settle();
    expect(events.filter(event => event.type === 'map-unreadable')).toHaveLength(1);
    expect(events.filter(event => event.type === 'map-changed')).toHaveLength(0);
    subscription.close();
  });

  it('applies the file again once it can be read', async () => {
    const subscription = watchMap({
      projectId: 'p-bad-2',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    events.length = 0;

    write('not json');
    await until(() => events.some(event => event.type === 'map-unreadable'));

    write(serializeDocument(documentWith('recovered')));
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('recovered');
    subscription.close();
  });

  it('reports a missing file once when it had content before', async () => {
    const subscription = watchMap({
      projectId: 'p-bad-3',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    events.length = 0;

    write(serializeDocument(documentWith('second')));
    await until(() => events.some(event => event.type === 'map-changed'));
    rmSync(target);

    await until(() => events.some(event => event.type === 'map-gone'));
    await settle();
    expect(events.filter(event => event.type === 'map-gone')).toHaveLength(1);
    subscription.close();
  });

  it('reports a file that is not there when the stream opens', async () => {
    rmSync(target);
    const subscription = watchMap({
      projectId: 'p-bad-4',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    await settle();
    expect(events.filter(event => event.type === 'map-gone')).toHaveLength(1);
    subscription.close();
  });
});
