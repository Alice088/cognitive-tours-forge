import type { WaypointType } from '@/app/lib/theme/tokens';

export interface Position {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  label: string;
  type: WaypointType;
  description?: string;
  notes?: string;
  file?: string;
  position: Position;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Stop {
  waypointId: string;
  narrative?: string;
}

export interface Tour {
  id: string;
  name: string;
  description?: string;
  author?: string;
  updatedAt?: string;
  stops: Stop[];
}

export interface MapDocument {
  version: number;
  project: {
    name: string;
    createdAt: string;
  };
  waypoints: Waypoint[];
  edges: Edge[];
  tours: Tour[];
}

export interface LoadReport {
  droppedEdges: number;
  droppedStops: number;
  droppedPaths: number;
  unknownTypes: number;
  waypointCount: number;
}

export interface ProjectRef {
  id: string;
  name: string;
  path: string;
  addedAt: string;
}

export interface MapRef {
  file: string;
  name: string;
}

export interface ViewState {
  projectId: string;
  mapFile: string;
  tourId: string | null;
  step: number;
}

export interface WorkspaceRegistry {
  version: number;
  projects: ProjectRef[];
  lastView?: ViewState;
}

export type Availability = 'ready' | 'unavailable' | 'uninitialised';

export interface ProjectSummary extends ProjectRef {
  availability: Availability;
  maps: MapRef[];
  error: string | null;
}

export type SurfaceStatus = 'empty' | 'loading' | 'ready' | 'failed';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'failed';

export const MAP_VERSION = 1;
export const HISTORY_LIMIT = 50;
export const SUPPORTED_WAYPOINTS = 250;
export const SUPPORTED_TOURS = 40;
