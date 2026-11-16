import { describe, expect, it } from 'vitest';
import { createMapStore } from '@/app/lib/store/map-store';
import { canUndo, clearHistory, historyDepth } from '@/app/lib/store/history';
import type { LoadReport, MapDocument } from '@/app/lib/workspace/types';

const report: LoadReport = {
  droppedEdges: 0,
  droppedStops: 0,
  droppedPaths: 0,
  unknownTypes: 0,
  waypointCount: 2,
};

function documentWith(waypoints: Array<{ id: string; label: string }>, tourIds: string[] = ['t-1']): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: waypoints.map((waypoint, index) => ({
      id: waypoint.id,
      label: waypoint.label,
      type: 'Goal' as const,
      position: { x: index * 10, y: 0 },
    })),
    edges: [],
    tours: tourIds.map(id => ({
      id,
      name: id,
      stops: [{ waypointId: waypoints[0]?.id ?? 'w-1' }, { waypointId: waypoints[1]?.id ?? 'w-2' }],
    })),
  };
}

function storeWith(document: MapDocument) {
  const store = createMapStore();
  store.getState().loadDocument({ document, report, mtimeMs: 100 });
  clearHistory(store);
  return store;
}

describe('external document', () => {
  it('keeps the selection, the tour and the step that still exist', () => {
    const store = storeWith(
      documentWith([
        { id: 'w-1', label: 'One' },
        { id: 'w-2', label: 'Two' },
      ])
    );
    store.getState().selectWaypoint('w-2');
    store.getState().setActiveTour('t-1');
    store.getState().setStep(1);

    store.getState().applyExternal({
      document: documentWith([
        { id: 'w-2', label: 'Two on disk' },
        { id: 'w-1', label: 'One' },
      ]),
      report,
      mtimeMs: 200,
    });

    expect(store.getState().document?.waypoints[0].label).toBe('Two on disk');
    expect(store.getState().selectedWaypointId).toBe('w-2');
    expect(store.getState().activeTourId).toBe('t-1');
    expect(store.getState().step).toBe(1);
    expect(store.getState().mtimeMs).toBe(200);
  });

  it('drops a selection that no longer exists and clamps the step', () => {
    const store = storeWith(
      documentWith([
        { id: 'w-1', label: 'One' },
        { id: 'w-2', label: 'Two' },
      ])
    );
    store.getState().selectWaypoint('w-2');
    store.getState().setActiveTour('t-1');
    store.getState().setStep(1);

    store.getState().applyExternal({
      document: {
        ...documentWith([{ id: 'w-1', label: 'One' }], ['t-1']),
        tours: [{ id: 't-1', name: 't-1', stops: [{ waypointId: 'w-1' }] }],
      },
      report,
      mtimeMs: 200,
    });

    expect(store.getState().selectedWaypointId).toBeNull();
    expect(store.getState().activeTourId).toBe('t-1');
    expect(store.getState().step).toBe(0);
  });

  it('drops a tour that no longer exists', () => {
    const store = storeWith(
      documentWith([
        { id: 'w-1', label: 'One' },
        { id: 'w-2', label: 'Two' },
      ])
    );
    store.getState().setActiveTour('t-1');
    store.getState().setStep(1);

    store.getState().applyExternal({
      document: documentWith(
        [
          { id: 'w-1', label: 'One' },
          { id: 'w-2', label: 'Two' },
        ],
        ['t-2']
      ),
      report,
      mtimeMs: 200,
    });

    expect(store.getState().activeTourId).toBeNull();
    expect(store.getState().step).toBe(0);
  });

  it('leaves the history it already had alone', () => {
    const store = storeWith(
      documentWith([
        { id: 'w-1', label: 'One' },
        { id: 'w-2', label: 'Two' },
      ])
    );
    store.getState().updateWaypoint('w-1', { label: 'Mine' });
    const before = historyDepth(store).past;
    expect(before).toBeGreaterThan(0);

    store.getState().applyExternal({
      document: documentWith([
        { id: 'w-1', label: 'Theirs' },
        { id: 'w-2', label: 'Two' },
      ]),
      report,
      mtimeMs: 200,
    });

    expect(canUndo(store)).toBe(true);
    expect(historyDepth(store).past).toBeGreaterThanOrEqual(before);
  });
});
