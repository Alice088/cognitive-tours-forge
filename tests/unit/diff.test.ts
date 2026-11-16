import { describe, expect, it } from 'vitest';
import { describeChange, summariseChange } from '@/app/lib/workspace/diff';
import type { MapDocument } from '@/app/lib/workspace/types';

function base(): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: [
      { id: 'w-1', label: 'Goal one', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-2', label: 'Risk two', type: 'Risk', position: { x: 10, y: 0 } },
      { id: 'w-3', label: 'Test three', type: 'Test', position: { x: 20, y: 0 } },
    ],
    edges: [
      { id: 'e-1', source: 'w-1', target: 'w-2', label: 'requires' },
      { id: 'e-2', source: 'w-2', target: 'w-3' },
    ],
    tours: [
      {
        id: 't-1',
        name: 'Why it exists',
        stops: [{ waypointId: 'w-1' }, { waypointId: 'w-2' }],
      },
    ],
  };
}

describe('change summary', () => {
  it('is empty for the same document', () => {
    const summary = summariseChange(base(), base());
    expect(summary.waypoints).toEqual({ added: 0, removed: 0, changed: 0 });
    expect(summary.edges).toEqual({ added: 0, removed: 0, changed: 0 });
    expect(summary.tours).toEqual({ added: 0, removed: 0, changed: 0 });
    expect(summary.names).toEqual({ added: [], removed: [], changed: [] });
    expect(describeChange(summary)).toBe('');
  });

  it('counts added, removed and changed waypoints', () => {
    const after = base();
    after.waypoints = [
      { id: 'w-1', label: 'Goal one', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-2', label: 'Risk two renamed', type: 'Risk', position: { x: 10, y: 0 } },
      { id: 'w-4', label: 'New one', type: 'Feature', position: { x: 30, y: 0 } },
    ];
    const summary = summariseChange(base(), after);
    expect(summary.waypoints).toEqual({ added: 1, removed: 1, changed: 1 });
    expect(summary.names.added).toContain('New one');
    expect(summary.names.changed).toContain('Risk two renamed');
    expect(summary.names.removed).toContain('Test three');
  });

  it('counts a moved waypoint as changed', () => {
    const after = base();
    after.waypoints[0] = { ...after.waypoints[0], position: { x: 5, y: 5 } };
    expect(summariseChange(base(), after).waypoints.changed).toBe(1);
  });

  it('counts links and their labels', () => {
    const after = base();
    after.edges = [
      { id: 'e-1', source: 'w-1', target: 'w-2', label: 'blocks' },
      { id: 'e-3', source: 'w-1', target: 'w-3' },
    ];
    const summary = summariseChange(base(), after);
    expect(summary.edges).toEqual({ added: 1, removed: 1, changed: 1 });
  });

  it('counts a moved stop as a tour change, not a waypoint change', () => {
    const after = base();
    after.tours[0] = { ...after.tours[0], stops: [...after.tours[0].stops].reverse() };
    const summary = summariseChange(base(), after);
    expect(summary.tours.changed).toBe(1);
    expect(summary.waypoints.changed).toBe(0);
  });

  it('names at most three per kind in document order', () => {
    const after = base();
    after.waypoints = [
      ...after.waypoints,
      { id: 'w-5', label: 'Alpha', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-6', label: 'Beta', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-7', label: 'Gamma', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-8', label: 'Delta', type: 'Goal', position: { x: 0, y: 0 } },
    ];
    const summary = summariseChange(base(), after);
    expect(summary.waypoints.added).toBe(4);
    expect(summary.names.added).toHaveLength(3);
    expect(summary.names.added[0]).toBe('Alpha');
  });

  it('describes what changed for a person', () => {
    const after = base();
    after.waypoints[1] = { ...after.waypoints[1], label: 'Renamed by the agent' };
    const text = describeChange(summariseChange(base(), after));
    expect(text).toContain('Renamed by the agent');
    expect(text).toContain('changed');
  });
});
