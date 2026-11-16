import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  HISTORY_LIMIT,
  type LoadReport,
  type MapDocument,
  type SaveStatus,
  type Stop,
  type SurfaceStatus,
  type Tour,
  type Waypoint,
  type Edge,
} from '@/app/lib/workspace/types';

export interface Failure {
  message: string;
  retryable: boolean;
}

export interface MapState {
  document: MapDocument | null;
  status: SurfaceStatus;
  failure: Failure | null;
  report: LoadReport | null;
  mtimeMs: number | null;
  selectedWaypointId: string | null;
  activeTourId: string | null;
  step: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  loadDocument: (payload: { document: MapDocument; report: LoadReport; mtimeMs: number | null }) => void;
  setStatus: (status: SurfaceStatus) => void;
  failLoad: (message: string) => void;
  selectWaypoint: (id: string | null) => void;
  setActiveTour: (tourId: string | null) => void;
  setStep: (step: number) => void;
  updateWaypoint: (id: string, patch: Partial<Waypoint>) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  deleteWaypoint: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  addTour: (tour: Tour) => void;
  updateTour: (id: string, patch: Partial<Tour>) => void;
  deleteTour: (id: string) => void;
  setTourStops: (tourId: string, stops: Stop[]) => void;
  moveStop: (tourId: string, from: number, to: number) => void;
  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  markSaved: (mtimeMs: number) => void;
}

const initial = {
  document: null,
  status: 'empty' as SurfaceStatus,
  failure: null,
  report: null,
  mtimeMs: null,
  selectedWaypointId: null,
  activeTourId: null,
  step: 0,
  saveStatus: 'idle' as SaveStatus,
  saveError: null,
};

export function createMapStore(seed: Partial<MapState> = {}) {
  return create<MapState>()(
    temporal(
      (set, get) => {
        const change = (transform: (document: MapDocument) => MapDocument) => {
          const current = get().document;
          if (!current) {
            return;
          }
          set({ document: transform(current) });
        };

        return {
          ...initial,
          ...seed,
          loadDocument: ({ document, report, mtimeMs }) =>
            set({
              document,
              report,
              mtimeMs,
              status: 'ready',
              failure: null,
              saveStatus: 'idle',
              saveError: null,
            }),
          setStatus: status => set({ status }),
          failLoad: message => set({ status: 'failed', failure: { message, retryable: true } }),
          selectWaypoint: id => set({ selectedWaypointId: id }),
          setActiveTour: tourId => set({ activeTourId: tourId, step: 0 }),
          setStep: step => set({ step: Math.max(0, Math.floor(step)) }),
          updateWaypoint: (id, patch) =>
            change(document => {
              const target = document.waypoints.find(waypoint => waypoint.id === id);
              if (!target || !differs(target, patch)) {
                return document;
              }
              return {
                ...document,
                waypoints: document.waypoints.map(waypoint =>
                  waypoint.id === id ? { ...waypoint, ...patch } : waypoint
                ),
              };
            }),
          addWaypoint: waypoint =>
            change(document => ({
              ...document,
              waypoints: [...document.waypoints, waypoint],
            })),
          deleteWaypoint: id =>
            change(document => ({
              ...document,
              waypoints: document.waypoints.filter(waypoint => waypoint.id !== id),
              edges: document.edges.filter(edge => edge.source !== id && edge.target !== id),
              tours: document.tours.map(tour => ({
                ...tour,
                stops: tour.stops.filter(stop => stop.waypointId !== id),
              })),
            })),
          addEdge: edge => change(document => ({ ...document, edges: [...document.edges, edge] })),
          deleteEdge: id =>
            change(document => ({
              ...document,
              edges: document.edges.filter(edge => edge.id !== id),
            })),
          addTour: tour => change(document => ({ ...document, tours: [...document.tours, tour] })),
          updateTour: (id, patch) =>
            change(document => {
              const target = document.tours.find(tour => tour.id === id);
              if (!target || !differs(target, patch)) {
                return document;
              }
              return {
                ...document,
                tours: document.tours.map(tour => (tour.id === id ? { ...tour, ...patch } : tour)),
              };
            }),
          deleteTour: id =>
            change(document => ({
              ...document,
              tours: document.tours.filter(tour => tour.id !== id),
            })),
          setTourStops: (tourId, stops) =>
            change(document => {
              const target = document.tours.find(tour => tour.id === tourId);
              if (!target || sameStops(target.stops, stops)) {
                return document;
              }
              return {
                ...document,
                tours: document.tours.map(tour => (tour.id === tourId ? { ...tour, stops } : tour)),
              };
            }),
          moveStop: (tourId, from, to) =>
            change(document => {
              const target = document.tours.find(tour => tour.id === tourId);
              if (!target) {
                return document;
              }
              if (from < 0 || from >= target.stops.length || to < 0 || to >= target.stops.length) {
                return document;
              }
              if (from === to) {
                return document;
              }
              return {
                ...document,
                tours: document.tours.map(tour => {
                  if (tour.id !== tourId) {
                    return tour;
                  }
                  const stops = [...tour.stops];
                  const [moved] = stops.splice(from, 1);
                  stops.splice(to, 0, moved);
                  return { ...tour, stops };
                }),
              };
            }),
          setSaveStatus: (status, error = null) => set({ saveStatus: status, saveError: error }),
          markSaved: mtimeMs => set({ saveStatus: 'saved', saveError: null, mtimeMs }),
        };
      },
      {
        limit: HISTORY_LIMIT,
        partialize: state => ({ document: state.document }),
        equality: (past, current) => past.document === current.document,
      }
    )
  );
}

function differs<T extends object>(current: T, patch: Partial<T>): boolean {
  const values = current as Record<string, unknown>;
  return Object.entries(patch).some(([key, value]) => values[key] !== value);
}

function sameStops(current: Stop[], next: Stop[]): boolean {
  if (current.length !== next.length) {
    return false;
  }
  return current.every(
    (stop, index) => stop.waypointId === next[index].waypointId && stop.narrative === next[index].narrative
  );
}

export type MapStore = ReturnType<typeof createMapStore>;
