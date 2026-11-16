import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeDocument, serializeDocument } from '@/app/lib/workspace/map-file';
import { ownWriteFor, recordOwnWrite, stopAllSyncWatchers, watchMap } from '@/app/lib/workspace/sync';
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

function text(label: string): string {
  return serializeDocument(documentWith(label));
}

function write(label: string): void {
  writeFileSync(path.join(root, '.tours', 'main.tour.json'), text(label), 'utf8');
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

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'ctour-own-'));
  mkdirSync(path.join(root, '.tours'));
  write('first');
  events.length = 0;
});

afterEach(() => {
  stopAllSyncWatchers();
  rmSync(root, { recursive: true, force: true });
});

describe('own writes', () => {
  it('records the newest text per file', () => {
    const subscription = watchMap({ projectId: 'p-a', root, file: 'main.tour.json', emit: () => undefined });
    recordOwnWrite('p-a', 'main.tour.json', text('second'));
    recordOwnWrite('p-a', 'main.tour.json', text('third'));
    expect(ownWriteFor('p-a', 'main.tour.json')).toBe(text('third'));
    subscription.close();
  });

  it('delivers an external change that follows an own write at once', async () => {
    const subscription = watchMap({
      projectId: 'p-b',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    events.length = 0;

    recordOwnWrite('p-b', 'main.tour.json', text('second'));
    write('second');
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(events).toHaveLength(0);

    write('third');
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('third');
    subscription.close();
  });

  it('delivers a write that no record covers', async () => {
    const subscription = watchMap({
      projectId: 'p-c',
      root,
      file: 'main.tour.json',
      emit: event => events.push(event),
      debounceMs: 30,
    });
    await subscription.ready;
    events.length = 0;

    recordOwnWrite('p-c', 'main.tour.json', text('kept'));
    write('another');
    const changed = await until(() => events.find(event => event.type === 'map-changed'));
    if (changed.type !== 'map-changed') {
      throw new Error('expected a map-changed event');
    }
    expect(changed.document.waypoints[0].label).toBe('another');
    subscription.close();
  });
});
