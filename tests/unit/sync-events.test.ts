import { describe, expect, it } from 'vitest';
import { SYNC_EVENT_KINDS, parseSyncEvent } from '@/app/lib/workspace/sync-events';
import type { MapDocument } from '@/app/lib/workspace/types';

const document: MapDocument = {
  version: 1,
  project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
  waypoints: [],
  edges: [],
  tours: [],
};

const report = {
  droppedWaypoints: 0,
  droppedEdges: 0,
  droppedStops: 0,
  droppedPaths: 0,
  unknownTypes: 0,
  waypointCount: 0,
};

describe('sync events', () => {
  it('reads a changed map', () => {
    const event = parseSyncEvent(JSON.stringify({ type: 'map-changed', document, report, mtimeMs: 1763856000000 }));
    expect(event?.type).toBe('map-changed');
    if (event?.type === 'map-changed') {
      expect(event.document.project.name).toBe('demo');
      expect(event.mtimeMs).toBe(1763856000000);
    }
  });

  it('reads a changed map list', () => {
    const event = parseSyncEvent(
      JSON.stringify({ type: 'maps-changed', maps: [{ file: 'main.tour.json', name: 'main' }] })
    );
    expect(event?.type).toBe('maps-changed');
    if (event?.type === 'maps-changed') {
      expect(event.maps).toHaveLength(1);
    }
  });

  it('reads an unreadable file and a missing file', () => {
    const unreadable = parseSyncEvent(
      JSON.stringify({ type: 'map-unreadable', file: 'main.tour.json', reason: 'not valid JSON' })
    );
    const gone = parseSyncEvent(JSON.stringify({ type: 'map-gone', file: 'main.tour.json' }));
    expect(unreadable?.type).toBe('map-unreadable');
    expect(gone?.type).toBe('map-gone');
  });

  it('refuses what it cannot understand', () => {
    expect(parseSyncEvent('{')).toBeNull();
    expect(parseSyncEvent('null')).toBeNull();
    expect(parseSyncEvent(JSON.stringify({ type: 'map-moved', file: 'main.tour.json' }))).toBeNull();
    expect(parseSyncEvent(JSON.stringify({ type: 'map-changed', document: {} }))).toBeNull();
    expect(parseSyncEvent(JSON.stringify({ type: 'maps-changed', maps: 'all' }))).toBeNull();
    expect(parseSyncEvent(JSON.stringify({ type: 'map-gone' }))).toBeNull();
  });

  it('names every kind once', () => {
    expect([...SYNC_EVENT_KINDS].sort()).toEqual(['map-changed', 'map-gone', 'map-unreadable', 'maps-changed']);
  });
});
