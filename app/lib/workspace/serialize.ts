import type { MapDocument } from '@/app/lib/workspace/types';

export function serializeDocument(document: MapDocument): string {
  const ordered = {
    version: document.version,
    project: {
      name: document.project.name,
      createdAt: document.project.createdAt,
    },
    waypoints: [...document.waypoints]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(waypoint =>
        stripUndefined({
          id: waypoint.id,
          label: waypoint.label,
          type: waypoint.type,
          description: waypoint.description,
          notes: waypoint.notes,
          file: waypoint.file,
          position: { x: waypoint.position.x, y: waypoint.position.y },
          size: waypoint.size ? { width: waypoint.size.width, height: waypoint.size.height } : undefined,
        })
      ),
    edges: [...document.edges]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(edge => stripUndefined({ id: edge.id, source: edge.source, target: edge.target, label: edge.label })),
    tours: [...document.tours]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(tour =>
        stripUndefined({
          id: tour.id,
          name: tour.name,
          description: tour.description,
          author: tour.author,
          updatedAt: tour.updatedAt,
          stops: tour.stops.map(stop => stripUndefined({ waypointId: stop.waypointId, narrative: stop.narrative })),
        })
      ),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }
  return value;
}
