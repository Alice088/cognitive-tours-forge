import type { MapDocument } from '@/app/lib/workspace/types';

export interface DiffBucket {
  added: number;
  removed: number;
  changed: number;
}

export interface ChangeSummary {
  waypoints: DiffBucket;
  edges: DiffBucket;
  tours: DiffBucket;
  names: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

const NAME_LIMIT = 3;

export function summariseChange(before: MapDocument, after: MapDocument): ChangeSummary {
  const waypoints = compare(before.waypoints, after.waypoints, waypoint => waypoint.id, sameWaypoint);
  const edges = compare(before.edges, after.edges, edge => edge.id, sameEdge);
  const tours = compare(before.tours, after.tours, tour => tour.id, sameTour);

  const labelOf = (id: string): string | null => {
    const waypoint = after.waypoints.find(item => item.id === id) ?? before.waypoints.find(item => item.id === id);
    if (waypoint) {
      return waypoint.label;
    }
    const tour = after.tours.find(item => item.id === id) ?? before.tours.find(item => item.id === id);
    return tour ? tour.name : null;
  };

  const namesFor = (ids: string[]): string[] =>
    ids
      .map(labelOf)
      .filter((name): name is string => name !== null && name.trim() !== '')
      .slice(0, NAME_LIMIT);

  return {
    waypoints: bucket(waypoints),
    edges: bucket(edges),
    tours: bucket(tours),
    names: {
      added: namesFor([...waypoints.added, ...tours.added]),
      removed: namesFor([...waypoints.removed, ...tours.removed]),
      changed: namesFor([...waypoints.changed, ...tours.changed]),
    },
  };
}

export function isEmptyChange(summary: ChangeSummary): boolean {
  return [summary.waypoints, summary.edges, summary.tours].every(
    bucket => bucket.added + bucket.removed + bucket.changed === 0
  );
}

export function describeChange(summary: ChangeSummary): string {
  const clauses: string[] = [];
  addClause(clauses, summary.names.added, 'added');
  addClause(clauses, summary.names.removed, 'removed');
  addClause(clauses, summary.names.changed, 'changed');
  if (clauses.length > 0) {
    return clauses.join('; ');
  }
  const counts = [
    count(summary.waypoints, 'waypoint'),
    count(summary.edges, 'link'),
    count(summary.tours, 'tour'),
  ].filter((part): part is string => part !== null);
  return counts.length > 0 ? counts.join(', ') : '';
}

function addClause(clauses: string[], names: string[], verb: string): void {
  if (names.length === 0) {
    return;
  }
  const listed = names.map(name => `“${name}”`).join(', ');
  clauses.push(`${listed} ${verb}`);
}

function count(bucket: DiffBucket, noun: string): string | null {
  const total = bucket.added + bucket.removed + bucket.changed;
  if (total === 0) {
    return null;
  }
  return `${total} ${noun}${total === 1 ? '' : 's'}`;
}

function bucket(compared: Compared): DiffBucket {
  return {
    added: compared.added.length,
    removed: compared.removed.length,
    changed: compared.changed.length,
  };
}

interface Compared {
  added: string[];
  removed: string[];
  changed: string[];
}

function compare<T>(before: T[], after: T[], idOf: (item: T) => string, same: (a: T, b: T) => boolean): Compared {
  const previous = new Map(before.map(item => [idOf(item), item]));
  const next = new Map(after.map(item => [idOf(item), item]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const id of next.keys()) {
    if (!previous.has(id)) {
      added.push(id);
    }
  }
  for (const id of previous.keys()) {
    if (!next.has(id)) {
      removed.push(id);
    }
  }
  for (const [id, item] of next) {
    const old = previous.get(id);
    if (old && !same(old, item)) {
      changed.push(id);
    }
  }

  return { added, removed, changed };
}

function sameWaypoint(a: MapDocument['waypoints'][number], b: MapDocument['waypoints'][number]): boolean {
  return (
    a.label === b.label &&
    a.type === b.type &&
    a.description === b.description &&
    a.notes === b.notes &&
    a.file === b.file &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y
  );
}

function sameEdge(a: MapDocument['edges'][number], b: MapDocument['edges'][number]): boolean {
  return a.source === b.source && a.target === b.target && a.label === b.label;
}

function sameTour(a: MapDocument['tours'][number], b: MapDocument['tours'][number]): boolean {
  if (a.name !== b.name || a.description !== b.description || a.stops.length !== b.stops.length) {
    return false;
  }
  return a.stops.every(
    (stop, index) =>
      stop.waypointId === b.stops[index].waypointId && (stop.narrative ?? '') === (b.stops[index].narrative ?? '')
  );
}
