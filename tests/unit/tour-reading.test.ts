import { describe, expect, it } from 'vitest';
import { cardBox, hasAnyNarration, intersects, pickCorner, stopSentence, stopView } from '@/app/lib/tour-reading';
import type { Stop, Tour, Waypoint } from '@/app/lib/workspace/types';

function waypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return { id: 'w-1', label: 'Support queue', type: 'Goal', position: { x: 0, y: 0 }, ...overrides };
}

function tour(stops: Stop[]): Tour {
  return { id: 't-1', name: 'Why this exists', stops };
}

describe('stopView', () => {
  it('carries the narration, the type and the description', () => {
    const view = stopView(
      { waypointId: 'w-1', narrative: 'This is where a ticket starts.' },
      waypoint({ description: 'The queue itself.' }),
      0,
      3
    );
    expect(view).toEqual({
      position: 1,
      total: 3,
      label: 'Support queue',
      type: 'Goal',
      narration: 'This is where a ticket starts.',
      description: 'The queue itself.',
      hasNarration: true,
    });
  });

  it('reports a missing narration as absent', () => {
    const view = stopView({ waypointId: 'w-1' }, waypoint(), 1, 3);
    expect(view.narration).toBeNull();
    expect(view.hasNarration).toBe(false);
    expect(view.position).toBe(2);
    expect(view.total).toBe(3);
  });

  it('treats a whitespace-only narration as absent', () => {
    const view = stopView({ waypointId: 'w-1', narrative: '   \n\t ' }, waypoint(), 0, 2);
    expect(view.narration).toBeNull();
    expect(view.hasNarration).toBe(false);
  });

  it('treats a whitespace-only description as absent', () => {
    const view = stopView({ waypointId: 'w-1' }, waypoint({ description: '  ' }), 0, 1);
    expect(view.description).toBeNull();
  });

  it('survives a stop whose waypoint is gone', () => {
    const view = stopView({ waypointId: 'w-missing', narrative: 'Words without a box.' }, null, 4, 5);
    expect(view.label).toBe('');
    expect(view.type).toBeNull();
    expect(view.description).toBeNull();
    expect(view.narration).toBe('Words without a box.');
  });

  it('reads its position and total out loud', () => {
    expect(stopSentence(stopView({ waypointId: 'w-1' }, waypoint(), 2, 7))).toBe('Stop 3 of 7');
  });
});

describe('hasAnyNarration', () => {
  it('is true when one stop carries words', () => {
    expect(hasAnyNarration(tour([{ waypointId: 'w-1' }, { waypointId: 'w-2', narrative: 'Here.' }]))).toBe(true);
  });

  it('is false when every narration is whitespace or missing', () => {
    expect(hasAnyNarration(tour([{ waypointId: 'w-1' }, { waypointId: 'w-2', narrative: '  ' }]))).toBe(false);
    expect(hasAnyNarration(tour([]))).toBe(false);
  });
});

describe('pickCorner', () => {
  const area = { width: 1000, height: 600 };

  it('keeps the bottom-left corner when the stop is elsewhere', () => {
    expect(pickCorner(area, { x: 700, y: 40, width: 208, height: 74 })).toBe('bottom-left');
  });

  it('moves to the bottom-right corner when the stop sits in the bottom-left', () => {
    expect(pickCorner(area, { x: 60, y: 500, width: 208, height: 74 })).toBe('bottom-right');
  });

  it('falls back to the top-right corner when both bottom corners are taken', () => {
    const stop = { x: 12, y: 400, width: 976, height: 120 };
    expect(pickCorner(area, stop)).toBe('top-right');
  });

  it('defaults to the bottom-left when there is no focused stop', () => {
    expect(pickCorner(area, null)).toBe('bottom-left');
  });

  it('never chooses a corner whose card covers the stop', () => {
    for (const x of [0, 120, 240, 360, 480, 600, 720]) {
      for (const y of [0, 100, 200, 300, 400, 500]) {
        const stop = { x, y, width: 208, height: 74 };
        expect(intersects(cardBox(pickCorner(area, stop), area), stop)).toBe(false);
      }
    }
  });

  it('keeps the bottom-left card clear of the map controls', () => {
    const box = cardBox('bottom-left', area);
    expect(box.y + box.height).toBeLessThanOrEqual(area.height - 96);
  });

  it('narrows the card on a narrow map instead of overflowing it', () => {
    const narrow = { width: 320, height: 500 };
    const box = cardBox('bottom-left', narrow);
    expect(box.width).toBeLessThanOrEqual(narrow.width - 24);
    expect(box.x + box.width).toBeLessThanOrEqual(narrow.width);
  });
});
