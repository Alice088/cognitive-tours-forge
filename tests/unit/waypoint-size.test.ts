import { describe, expect, it } from 'vitest';
import {
  MAX_WAYPOINT_HEIGHT,
  MAX_WAYPOINT_WIDTH,
  MIN_WAYPOINT_HEIGHT,
  MIN_WAYPOINT_WIDTH,
  autoHeight,
  autoWidth,
  clampSize,
  storedSize,
  waypointSize,
} from '@/app/lib/waypoint-size';
import type { Waypoint } from '@/app/lib/workspace/types';

function waypoint(patch: Partial<Waypoint> = {}): Waypoint {
  return {
    id: 'w-1',
    label: 'A short label',
    type: 'Goal',
    position: { x: 0, y: 0 },
    ...patch,
  };
}

describe('waypoint size', () => {
  it('grows with a long label and stops at the maximum', () => {
    const short = autoWidth('Goal');
    const long = autoWidth('Understanding is the deliverable, and a tour is how you get it back');
    expect(short).toBe(MIN_WAYPOINT_WIDTH);
    expect(long).toBeGreaterThan(short);
    expect(autoWidth('x'.repeat(400))).toBe(MAX_WAYPOINT_WIDTH);
  });

  it('adds a line of height per wrapped line', () => {
    const width = autoWidth('One two three');
    expect(autoHeight('One', width)).toBe(MIN_WAYPOINT_HEIGHT);
    expect(autoHeight('x'.repeat(2000), width)).toBe(MAX_WAYPOINT_HEIGHT);
    expect(autoHeight('x'.repeat(60), width)).toBeGreaterThan(MIN_WAYPOINT_HEIGHT);
  });

  it('prefers the stored size over the estimate', () => {
    expect(waypointSize(waypoint({ size: { width: 300, height: 200 } }))).toEqual({ width: 300, height: 200 });
    expect(waypointSize(waypoint())).toEqual({
      width: autoWidth('A short label'),
      height: autoHeight('A short label', autoWidth('A short label')),
    });
  });

  it('clamps a dragged size', () => {
    expect(clampSize({ width: 10, height: 10 })).toEqual({ width: MIN_WAYPOINT_WIDTH, height: MIN_WAYPOINT_HEIGHT });
    expect(clampSize({ width: 5000, height: 5000 })).toEqual({
      width: MAX_WAYPOINT_WIDTH,
      height: MAX_WAYPOINT_HEIGHT,
    });
    expect(clampSize({ width: 250.4, height: 120.6 })).toEqual({ width: 250, height: 121 });
  });

  it('reads a stored size only when both sides are usable numbers', () => {
    expect(storedSize({ width: 200, height: 120 })).toEqual({ width: 200, height: 120 });
    for (const value of [
      undefined,
      null,
      'big',
      {},
      { width: 200 },
      { width: -1, height: 120 },
      { width: 200, height: 0 },
      { width: '200', height: 120 },
      { width: 200, height: 9000 },
      { width: Number.NaN, height: 120 },
    ]) {
      expect(storedSize(value), JSON.stringify(value)).toBeNull();
    }
  });
});
