import type { MapState } from '@/app/lib/store/map-store';
import { SUPPORTED_TOURS, SUPPORTED_WAYPOINTS, type Waypoint } from '@/app/lib/workspace/types';

export const selectWaypoints = (state: MapState): Waypoint[] => state.document?.waypoints ?? [];

export const selectTours = (state: MapState) => state.document?.tours ?? [];

export const selectEdges = (state: MapState) => state.document?.edges ?? [];

export const selectActiveTour = (state: MapState) =>
  state.document?.tours.find(tour => tour.id === state.activeTourId) ?? null;

export const selectSelectedWaypoint = (state: MapState) =>
  state.document?.waypoints.find(waypoint => waypoint.id === state.selectedWaypointId) ?? null;

export const selectWaypointById = (state: MapState, id: string) =>
  state.document?.waypoints.find(waypoint => waypoint.id === id) ?? null;

export const selectStopWaypoint = (state: MapState): Waypoint | null => {
  const tour = selectActiveTour(state);
  if (!tour) {
    return null;
  }
  const stop = tour.stops[state.step];
  if (!stop) {
    return null;
  }
  return selectWaypointById(state, stop.waypointId);
};

export const selectIsOversized = (state: MapState): boolean =>
  (state.document?.waypoints.length ?? 0) > SUPPORTED_WAYPOINTS ||
  (state.document?.tours.length ?? 0) > SUPPORTED_TOURS;

export function nextWaypointId(waypoints: Waypoint[]): string {
  let index = waypoints.length + 1;
  const taken = new Set(waypoints.map(waypoint => waypoint.id));
  while (taken.has(`w-${index}`)) {
    index += 1;
  }
  return `w-${index}`;
}

export function nextTourId(tours: Array<{ id: string }>): string {
  let index = tours.length + 1;
  const taken = new Set(tours.map(tour => tour.id));
  while (taken.has(`t-${index}`)) {
    index += 1;
  }
  return `t-${index}`;
}
