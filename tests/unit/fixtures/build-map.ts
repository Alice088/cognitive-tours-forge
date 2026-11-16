import type { MapDocument, Stop, Tour, Waypoint } from '@/app/lib/workspace/types';
import { WAYPOINT_TYPES } from '@/app/lib/theme/tokens';

export function buildMap(waypointCount: number, tourCount: number): MapDocument {
  const waypoints: Waypoint[] = Array.from({ length: waypointCount }, (_, index) => ({
    id: `w-${index + 1}`,
    label: `Waypoint ${index + 1}`,
    type: WAYPOINT_TYPES[index % WAYPOINT_TYPES.length],
    description: `Description for waypoint ${index + 1}`,
    position: { x: (index % 20) * 240, y: Math.floor(index / 20) * 160 },
  }));

  const tours: Tour[] = Array.from({ length: tourCount }, (_, index) => {
    const stops: Stop[] = waypoints
      .slice(0, 6)
      .map(waypoint => ({ waypointId: waypoint.id, narrative: `Stop in tour ${index + 1}` }));
    return { id: `t-${index + 1}`, name: `Tour ${index + 1}`, stops };
  });

  return {
    version: 1,
    project: { name: 'performance', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints,
    edges: waypoints.slice(1).map((waypoint, index) => ({
      id: `e-${index + 1}`,
      source: waypoints[index].id,
      target: waypoint.id,
    })),
    tours,
  };
}
