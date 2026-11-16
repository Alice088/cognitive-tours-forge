import type { MapDocument } from '@/app/lib/workspace/types';

const COLUMN = 240;
const ROW = 160;
const ORIGIN = 80;
const CLEAR_X = 224;
const CLEAR_Y = 80;
const SLOTS = 4000;

export function freePosition(document: MapDocument): { x: number; y: number } {
  for (let index = 0; index < SLOTS; index += 1) {
    const candidate = {
      x: ORIGIN + Math.floor(index / 20) * COLUMN,
      y: ORIGIN + (index % 20) * ROW,
    };
    const clear = document.waypoints.every(
      waypoint =>
        Math.abs(waypoint.position.x - candidate.x) >= CLEAR_X || Math.abs(waypoint.position.y - candidate.y) >= CLEAR_Y
    );
    if (clear) {
      return candidate;
    }
  }
  return { x: ORIGIN + document.waypoints.length * COLUMN, y: ORIGIN };
}
