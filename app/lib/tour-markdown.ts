import type { Tour, Waypoint } from '@/app/lib/workspace/types';

export function tourSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ExportContext {
  projectName?: string | null;
}

function pushWaypointBody(lines: string[], waypoint: Waypoint): void {
  if (waypoint.description?.trim()) {
    lines.push(waypoint.description);
    lines.push('');
  }
  if (waypoint.notes?.trim()) {
    lines.push(waypoint.notes);
    lines.push('');
  }
  if (waypoint.file?.trim()) {
    lines.push(`\`${waypoint.file}\``);
    lines.push('');
  }
}

export function tourByline(tour: Tour): string {
  const parts: string[] = [];
  if (tour.author) {
    parts.push(`By ${tour.author}`);
  }
  if (tour.updatedAt) {
    const date = new Date(tour.updatedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    parts.push(`Updated ${date}`);
  }
  return parts.join(' · ');
}

export function generateTourMarkdown(tour: Tour, waypoints: Waypoint[], { projectName }: ExportContext = {}): string {
  const waypointMap = new Map(waypoints.map(waypoint => [waypoint.id, waypoint]));
  const lines: string[] = [];

  lines.push(`# ${tour.name}`);
  lines.push('');

  if (projectName) {
    lines.push(`*Project: ${projectName}*`);
    lines.push('');
  }

  const byline = tourByline(tour);
  if (byline) {
    lines.push(`*${byline}*`);
    lines.push('');
  }

  if (tour.description?.trim()) {
    lines.push(tour.description);
    lines.push('');
  }

  lines.push(`*${tour.stops.length} stop${tour.stops.length === 1 ? '' : 's'}*`);
  lines.push('');

  tour.stops.forEach((stop, index) => {
    const waypoint = waypointMap.get(stop.waypointId);
    if (!waypoint) {
      return;
    }
    lines.push('---');
    lines.push('');
    lines.push(`## Stop ${index + 1}: ${waypoint.label} (${waypoint.type})`);
    lines.push('');
    pushWaypointBody(lines, waypoint);
    if (stop.narrative?.trim()) {
      lines.push(`> ${stop.narrative}`);
      lines.push('');
    }
  });

  return lines.join('\n');
}
