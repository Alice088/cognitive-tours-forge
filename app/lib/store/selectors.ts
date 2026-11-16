import type { Edge, Waypoint } from '@/app/lib/workspace/types';

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

export function nextEdgeId(edges: Edge[]): string {
  let index = edges.length + 1;
  const taken = new Set(edges.map(edge => edge.id));
  while (taken.has(`e-${index}`)) {
    index += 1;
  }
  return `e-${index}`;
}
