import { describe, expect, it } from 'vitest';
import { buildMap } from '@/tests/unit/fixtures/build-map';

describe('map fixture builder', () => {
  it('builds the requested number of waypoints and tours', () => {
    const document = buildMap(250, 40);
    expect(document.waypoints).toHaveLength(250);
    expect(document.tours).toHaveLength(40);
    expect(document.edges).toHaveLength(249);
  });

  it('gives every waypoint a known type and a unique id', () => {
    const document = buildMap(30, 3);
    const ids = new Set(document.waypoints.map(waypoint => waypoint.id));
    expect(ids.size).toBe(30);
    for (const waypoint of document.waypoints) {
      expect(waypoint.type.length).toBeGreaterThan(0);
    }
  });

  it('points every stop at an existing waypoint', () => {
    const document = buildMap(10, 2);
    const ids = new Set(document.waypoints.map(waypoint => waypoint.id));
    for (const tour of document.tours) {
      for (const stop of tour.stops) {
        expect(ids.has(stop.waypointId)).toBe(true);
      }
    }
  });
});
