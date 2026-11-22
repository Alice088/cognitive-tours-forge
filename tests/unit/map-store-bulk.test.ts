import { describe, expect, it } from 'vitest';
import { createMapStore } from '@/app/lib/store/map-store';
import { clearHistory, historyDepth } from '@/app/lib/store/history';
import type { LoadReport, MapDocument } from '@/app/lib/workspace/types';

const report: LoadReport = {
  droppedWaypoints: 0,
  droppedEdges: 0,
  droppedStops: 0,
  droppedPaths: 0,
  unknownTypes: 0,
  waypointCount: 3,
};

function documentWithThree(): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: ['w-1', 'w-2', 'w-3'].map((id, index) => ({
      id,
      label: id,
      type: 'Goal' as const,
      position: { x: index * 10, y: 0 },
    })),
    edges: [
      { id: 'e-1', source: 'w-1', target: 'w-2' },
      { id: 'e-2', source: 'w-3', target: 'w-1' },
      { id: 'e-3', source: 'w-2', target: 'w-3' },
    ],
    tours: [
      {
        id: 't-1',
        name: 'All of them',
        stops: [{ waypointId: 'w-1' }, { waypointId: 'w-2' }, { waypointId: 'w-3' }],
      },
    ],
  };
}

function storeWithThree() {
  const store = createMapStore();
  store.getState().loadDocument({ document: documentWithThree(), report, mtimeMs: 100 });
  clearHistory(store);
  return store;
}

describe('selection', () => {
  it('keeps one primary waypoint and a set of selected ones', () => {
    const store = storeWithThree();
    store.getState().selectWaypoint('w-1');
    expect(store.getState().selectedIds).toEqual(['w-1']);

    store.getState().selectMany(['w-1', 'w-2', 'w-3']);
    expect(store.getState().selectedIds).toEqual(['w-1', 'w-2', 'w-3']);
    expect(store.getState().selectedWaypointId).toBe('w-1');

    store.getState().selectWaypoint('w-3');
    expect(store.getState().selectedIds).toEqual(['w-3']);
    expect(store.getState().selectedWaypointId).toBe('w-3');
  });

  it('moves the primary when the selection no longer holds it', () => {
    const store = storeWithThree();
    store.getState().selectWaypoint('w-1');
    store.getState().selectMany(['w-2', 'w-3']);
    expect(store.getState().selectedWaypointId).toBe('w-3');
  });

  it('clears everything on null', () => {
    const store = storeWithThree();
    store.getState().selectMany(['w-1', 'w-2']);
    store.getState().selectWaypoint(null);
    expect(store.getState().selectedIds).toEqual([]);
    expect(store.getState().selectedWaypointId).toBeNull();
  });
});

describe('bulk deletion', () => {
  it('removes the waypoints, their links and their tour stops in one step', () => {
    const store = storeWithThree();
    store.getState().deleteWaypoints(['w-1', 'w-3']);

    const document = store.getState().document;
    expect(document?.waypoints.map(waypoint => waypoint.id)).toEqual(['w-2']);
    expect(document?.edges).toEqual([]);
    expect(document?.tours[0].stops.map(stop => stop.waypointId)).toEqual(['w-2']);
    expect(historyDepth(store).past).toBe(1);
  });

  it('drops the deleted waypoints from the selection', () => {
    const store = storeWithThree();
    store.getState().selectMany(['w-1', 'w-2']);
    store.getState().deleteWaypoints(['w-2']);
    expect(store.getState().selectedIds).toEqual(['w-1']);
    expect(store.getState().selectedWaypointId).toBe('w-1');
  });

  it('refuses an empty list and leaves the history alone', () => {
    const store = storeWithThree();
    store.getState().deleteWaypoints([]);
    expect(store.getState().document?.waypoints).toHaveLength(3);
    expect(historyDepth(store).past).toBe(0);
  });

  it('deletes a single waypoint through the same path', () => {
    const store = storeWithThree();
    store.getState().deleteWaypoint('w-2');
    expect(store.getState().document?.waypoints.map(waypoint => waypoint.id)).toEqual(['w-1', 'w-3']);
    expect(store.getState().document?.edges.map(edge => edge.id)).toEqual(['e-2']);
    expect(historyDepth(store).past).toBe(1);
  });
});
