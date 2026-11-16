import { describe, expect, it } from 'vitest';
import { createMapStore } from '@/app/lib/store/map-store';
import { canRedo, canUndo, clearHistory, historyDepth, redo, undo } from '@/app/lib/store/history';
import type { MapDocument } from '@/app/lib/workspace/types';

function documentWith(count: number): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: Array.from({ length: count }, (_, index) => ({
      id: `w-${index + 1}`,
      label: `Waypoint ${index + 1}`,
      type: 'Goal' as const,
      position: { x: index * 10, y: 0 },
    })),
    edges: [],
    tours: [{ id: 't-1', name: 'Tour', stops: [] }],
  };
}

function storeWith(count = 1) {
  const store = createMapStore();
  store.getState().loadDocument({
    document: documentWith(count),
    report: {
      droppedEdges: 0,
      droppedStops: 0,
      droppedPaths: 0,
      unknownTypes: 0,
      waypointCount: count,
    },
    mtimeMs: 1,
  });
  clearHistory(store);
  return store;
}

describe('map history', () => {
  it('starts empty and records nothing on load', () => {
    const store = storeWith();
    expect(canUndo(store)).toBe(false);
    expect(canRedo(store)).toBe(false);
  });

  it('steps back and forward through a change', () => {
    const store = storeWith();
    store.getState().updateWaypoint('w-1', { label: 'Renamed' });
    expect(store.getState().document?.waypoints[0].label).toBe('Renamed');
    expect(canUndo(store)).toBe(true);
    undo(store);
    expect(store.getState().document?.waypoints[0].label).toBe('Waypoint 1');
    expect(canRedo(store)).toBe(true);
    redo(store);
    expect(store.getState().document?.waypoints[0].label).toBe('Renamed');
  });

  it('replays a twenty-change sequence exactly', () => {
    const store = storeWith();
    const recorded: string[] = [JSON.stringify(store.getState().document)];
    for (let index = 0; index < 20; index += 1) {
      if (index % 3 === 0) {
        store.getState().addWaypoint({
          id: `w-new-${index}`,
          label: `New ${index}`,
          type: 'Feature',
          position: { x: index, y: index },
        });
      } else if (index % 3 === 1) {
        store.getState().updateWaypoint('w-1', { notes: `note ${index}` });
      } else {
        const tour = store.getState().document?.tours[0];
        store.getState().setTourStops('t-1', [...(tour?.stops ?? []), { waypointId: 'w-1' }]);
      }
      recorded.push(JSON.stringify(store.getState().document));
    }
    for (let index = 0; index < 20; index += 1) {
      undo(store);
    }
    expect(JSON.stringify(store.getState().document)).toBe(recorded[0]);
    for (let index = 1; index <= 20; index += 1) {
      redo(store);
      expect(JSON.stringify(store.getState().document)).toBe(recorded[index]);
    }
  });

  it('discards the forward branch after a new change', () => {
    const store = storeWith();
    store.getState().updateWaypoint('w-1', { label: 'A' });
    store.getState().updateWaypoint('w-1', { label: 'B' });
    undo(store);
    expect(historyDepth(store).future).toBe(1);
    store.getState().updateWaypoint('w-1', { label: 'C' });
    expect(historyDepth(store).future).toBe(0);
    expect(canRedo(store)).toBe(false);
    expect(store.getState().document?.waypoints[0].label).toBe('C');
  });

  it('never records selection or status changes', () => {
    const store = storeWith();
    store.getState().selectWaypoint('w-1');
    store.getState().setStep(3);
    store.getState().setActiveTour('t-1');
    store.getState().setSaveStatus('pending');
    expect(canUndo(store)).toBe(false);
  });

  it('caps the history at fifty entries', () => {
    const store = storeWith();
    for (let index = 0; index < 60; index += 1) {
      store.getState().updateWaypoint('w-1', { notes: `n${index}` });
    }
    expect(historyDepth(store).past).toBe(50);
  });

  it('removes a deleted waypoint from edges and tours', () => {
    const store = storeWith(2);
    store.getState().addEdge({ id: 'e-1', source: 'w-1', target: 'w-2' });
    store.getState().setTourStops('t-1', [{ waypointId: 'w-2' }]);
    store.getState().deleteWaypoint('w-2');
    expect(store.getState().document?.edges).toHaveLength(0);
    expect(store.getState().document?.tours[0].stops).toHaveLength(0);
  });

  it('moves a stop without losing it', () => {
    const store = storeWith(3);
    store.getState().setTourStops('t-1', [{ waypointId: 'w-1' }, { waypointId: 'w-2' }, { waypointId: 'w-3' }]);
    store.getState().moveStop('t-1', 0, 2);
    expect(store.getState().document?.tours[0].stops.map(stop => stop.waypointId)).toEqual(['w-2', 'w-3', 'w-1']);
  });

  it('refuses to move a stop beyond the list', () => {
    const store = storeWith(2);
    store.getState().setTourStops('t-1', [{ waypointId: 'w-1' }]);
    store.getState().moveStop('t-1', 0, 5);
    expect(store.getState().document?.tours[0].stops).toEqual([{ waypointId: 'w-1' }]);
  });
});

describe('one history entry per committed change', () => {
  it('records exactly one entry per action type', () => {
    const store = storeWith(3);
    const before = historyDepth(store).past;

    store.getState().updateWaypoint('w-1', { description: 'one' });
    expect(historyDepth(store).past).toBe(before + 1);

    store.getState().addWaypoint({
      id: 'w-new',
      label: 'New',
      type: 'Feature',
      position: { x: 1, y: 1 },
    });
    expect(historyDepth(store).past).toBe(before + 2);

    store.getState().addEdge({ id: 'e-new', source: 'w-1', target: 'w-2' });
    expect(historyDepth(store).past).toBe(before + 3);

    store.getState().setTourStops('t-1', [{ waypointId: 'w-1' }, { waypointId: 'w-2' }]);
    expect(historyDepth(store).past).toBe(before + 4);

    store.getState().moveStop('t-1', 0, 1);
    expect(historyDepth(store).past).toBe(before + 5);

    store.getState().deleteWaypoint('w-3');
    expect(historyDepth(store).past).toBe(before + 6);
  });

  it('does not record a change that leaves the document identical', () => {
    const store = storeWith(2);
    const before = historyDepth(store).past;
    store.getState().setTourStops('t-1', []);
    expect(historyDepth(store).past).toBe(before);
    store.getState().selectWaypoint('w-1');
    store.getState().setSaveStatus('saved');
    expect(historyDepth(store).past).toBe(before);
  });
});
