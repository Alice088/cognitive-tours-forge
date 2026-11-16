import { describe, expect, it } from 'vitest';
import { freePosition } from '@/cli/mcp/placement';
import { buildMap } from '../unit/fixtures/build-map';
import { mapDocument } from './mcp-fixtures';
import type { MapDocument, Waypoint } from '@/app/lib/workspace/types';

const COLUMN = 240;
const ROW = 160;

function waypoint(x: number, y: number): Waypoint {
  return { id: `w-${x}-${y}`, label: `At ${x} ${y}`, type: 'Goal', position: { x, y } };
}

function withWaypoints(positions: Array<[number, number]>): MapDocument {
  return mapDocument({
    waypoints: positions.map(([x, y]) => waypoint(x, y)),
    edges: [],
    tours: [],
  });
}

function overlaps(document: MapDocument, position: { x: number; y: number }): string | null {
  for (const existing of document.waypoints) {
    const dx = Math.abs(existing.position.x - position.x);
    const dy = Math.abs(existing.position.y - position.y);
    if (dx < 224 && dy < 80) {
      return existing.id;
    }
  }
  return null;
}

describe('freePosition', () => {
  it('starts at the grid origin', () => {
    expect(freePosition(withWaypoints([]))).toEqual({ x: 80, y: 80 });
  });

  it('fills downwards before moving right', () => {
    const document = withWaypoints([
      [80, 80],
      [80, 240],
      [80, 400],
    ]);

    expect(freePosition(document)).toEqual({ x: 80, y: 560 });
  });

  it('moves to the next column when the first is full', () => {
    const column: Array<[number, number]> = Array.from({ length: 20 }, (_, index) => [80, 80 + index * ROW]);

    const position = freePosition(withWaypoints(column));

    expect(position.x).toBe(80 + COLUMN);
    expect(position.y).toBe(80);
  });

  it('never covers an existing waypoint', () => {
    const positions: Array<[number, number]> = [];
    for (let column = 0; column < 5; column += 1) {
      for (let row = 0; row < 5; row += 1) {
        positions.push([column * COLUMN, row * ROW]);
      }
    }
    const document = withWaypoints(positions);

    const position = freePosition(document);

    expect(overlaps(document, position)).toBeNull();
  });

  it('finds a slot between the waypoints of a 250-waypoint map', () => {
    const document = buildMap(250, 40);

    const position = freePosition(document);

    expect(overlaps(document, position)).toBeNull();
  });

  it('gives the same answer twice for the same map', () => {
    const document = withWaypoints([[80, 80]]);

    expect(freePosition(document)).toEqual(freePosition(document));
  });

  it('is not fooled by a waypoint drawn off the grid', () => {
    const document = withWaypoints([[83, 78]]);

    expect(overlaps(document, freePosition(document))).toBeNull();
  });
});
