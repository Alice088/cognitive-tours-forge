import type { LoadReport, MapDocument, MapRef } from '@/app/lib/workspace/types';

export interface MapChangedEvent {
  type: 'map-changed';
  document: MapDocument;
  report: LoadReport;
  mtimeMs: number;
}

export interface MapUnreadableEvent {
  type: 'map-unreadable';
  file: string;
  reason: string;
}

export interface MapGoneEvent {
  type: 'map-gone';
  file: string;
}

export interface MapsChangedEvent {
  type: 'maps-changed';
  maps: MapRef[];
}

export type SyncEvent = MapChangedEvent | MapUnreadableEvent | MapGoneEvent | MapsChangedEvent;

export type SyncEventKind = SyncEvent['type'];

export const SYNC_EVENT_KINDS: SyncEventKind[] = ['map-changed', 'maps-changed', 'map-unreadable', 'map-gone'];

export function parseSyncEvent(raw: string): SyncEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return isSyncEvent(value) ? value : null;
}

function isSyncEvent(value: unknown): value is SyncEvent {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case 'map-changed':
      return isDocument(value.document) && isReport(value.report) && typeof value.mtimeMs === 'number';
    case 'maps-changed':
      return Array.isArray(value.maps) && value.maps.every(isMapRef);
    case 'map-unreadable':
      return typeof value.file === 'string' && typeof value.reason === 'string';
    case 'map-gone':
      return typeof value.file === 'string';
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocument(value: unknown): value is MapDocument {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    isRecord(value.project) &&
    Array.isArray(value.waypoints) &&
    Array.isArray(value.edges) &&
    Array.isArray(value.tours)
  );
}

function isReport(value: unknown): value is LoadReport {
  return isRecord(value) && typeof value.waypointCount === 'number';
}

function isMapRef(value: unknown): value is MapRef {
  return isRecord(value) && typeof value.file === 'string' && typeof value.name === 'string';
}
