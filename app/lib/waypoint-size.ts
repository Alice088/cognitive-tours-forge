import type { Waypoint } from '@/app/lib/workspace/types';

export interface WaypointSize {
  width: number;
  height: number;
}

export const MIN_WAYPOINT_WIDTH = 168;
export const MAX_WAYPOINT_WIDTH = 360;
export const MIN_WAYPOINT_HEIGHT = 64;
export const MAX_WAYPOINT_HEIGHT = 480;
export const MAX_STORED_SIZE = 4000;

const PADDING_X = 24;
const PADDING_TOP = 22;
const PADDING_BOTTOM = 8;
const CHARACTER = 6.3;
const LINE = 20;

export function autoWidth(label: string): number {
  const wanted = label.trim().length * CHARACTER + PADDING_X;
  return Math.round(Math.min(Math.max(wanted, MIN_WAYPOINT_WIDTH), MAX_WAYPOINT_WIDTH));
}

export function autoHeight(label: string, width: number): number {
  const perLine = Math.max(Math.floor((width - PADDING_X) / CHARACTER), 1);
  const lines = Math.max(Math.ceil(label.trim().length / perLine), 1);
  const wanted = PADDING_TOP + lines * LINE + PADDING_BOTTOM;
  return Math.round(Math.min(Math.max(wanted, MIN_WAYPOINT_HEIGHT), MAX_WAYPOINT_HEIGHT));
}

export function clampSize(size: WaypointSize): WaypointSize {
  return {
    width: Math.round(Math.min(Math.max(size.width, MIN_WAYPOINT_WIDTH), MAX_WAYPOINT_WIDTH)),
    height: Math.round(Math.min(Math.max(size.height, MIN_WAYPOINT_HEIGHT), MAX_WAYPOINT_HEIGHT)),
  };
}

export function storedSize(value: unknown): WaypointSize | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const width = usable(candidate.width);
  const height = usable(candidate.height);
  if (width === null || height === null) {
    return null;
  }
  return { width, height };
}

function usable(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_STORED_SIZE) {
    return null;
  }
  return value;
}

export function waypointSize(waypoint: Waypoint): WaypointSize {
  if (waypoint.size) {
    return waypoint.size;
  }
  const width = autoWidth(waypoint.label);
  return { width, height: autoHeight(waypoint.label, width) };
}
