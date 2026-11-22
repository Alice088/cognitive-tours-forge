import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  HISTORY_LIMIT,
  type LoadReport,
  type MapDocument,
  type SaveStatus,
  type Stop,
  type SurfaceStatus,
  type Position,
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
  selectedIds: string[];
  activeTourId: string | null;
  step: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  saveErrorDetail: string | null;
  readOnly: boolean;
  drafting: boolean;
  documentEpoch: number;
  setDrafting: (drafting: boolean) => void;
  applyExternal: (payload: { document: MapDocument; report: LoadReport; mtimeMs: number }) => void;
  loadDocument: (payload: {
    document: MapDocument;
    report: LoadReport;
    mtimeMs: number | null;
    readOnly?: boolean;
  }) => void;
  setStatus: (status: SurfaceStatus) => void;
  failLoad: (message: string) => void;
  selectWaypoint: (id: string | null) => void;
  toggleSelection: (id: string, additive: boolean) => void;
  selectMany: (ids: string[]) => void;
  setActiveTour: (tourId: string | null) => void;
  setStep: (step: number) => void;
  updateWaypoint: (id: string, patch: Partial<Waypoint>) => void;
  moveWaypoint: (id: string, position: Position) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  deleteWaypoint: (id: string) => void;
  deleteWaypoints: (ids: string[]) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  addTour: (tour: Tour) => void;
  updateTour: (id: string, patch: Partial<Tour>) => void;
  deleteTour: (id: string) => void;
  setTourStops: (tourId: string, stops: Stop[]) => void;
  moveStop: (tourId: string, from: number, to: number) => void;
  setSaveStatus: (status: SaveStatus, error?: string | null, detail?: string | null) => void;
  markSaved: (mtimeMs: number) => void;
  adoptMtime: (mtimeMs: number) => void;
  setReadOnly: (readOnly: boolean) => void;
}

const initial = {
  document: null,
  status: 'empty' as SurfaceStatus,
  failure: null,
  report: null,
  mtimeMs: null,
  selectedWaypointId: null,
  selectedIds: [] as string[],
  activeTourId: null,
  step: 0,
  saveStatus: 'idle' as SaveStatus,
  saveError: null,
  saveErrorDetail: null,
  readOnly: false,
  drafting: false,
  documentEpoch: 0,
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
          setDrafting: drafting => set({ drafting }),
          applyExternal: ({ document, report, mtimeMs }) =>
            set(state => {
              const waypoint = document.waypoints.some(item => item.id === state.selectedWaypointId);
              const ids = state.selectedIds.filter(id => document.waypoints.some(item => item.id === id));
              const tour = document.tours.find(item => item.id === state.activeTourId) ?? null;
              const step = tour ? Math.min(state.step, Math.max(tour.stops.length - 1, 0)) : 0;
              return {
                document,
                report,
                mtimeMs,
                documentEpoch: state.documentEpoch + 1,
                drafting: false,
                status: 'ready',
                failure: null,
                selectedWaypointId: waypoint ? state.selectedWaypointId : null,
                selectedIds: ids,
                activeTourId: tour ? state.activeTourId : null,
                step,
              };
            }),
          loadDocument: ({ document, report, mtimeMs, readOnly = false }) =>
            set(state => ({
              document,
              report,
              mtimeMs,
              readOnly,
              documentEpoch: state.documentEpoch + 1,
              drafting: false,
              status: 'ready',
              failure: null,
              saveStatus: 'idle',
              saveError: null,
              saveErrorDetail: null,
              selectedWaypointId: null,
              selectedIds: [],
            })),
          setStatus: status => set({ status }),
          failLoad: message => set({ status: 'failed', failure: { message, retryable: true } }),
          selectWaypoint: id => set({ selectedWaypointId: id, selectedIds: id === null ? [] : [id] }),
          toggleSelection: (id, additive) =>
            set(state => {
              if (!additive) {
                return { selectedWaypointId: id, selectedIds: [id] };
              }
              if (state.selectedIds.includes(id)) {
                const rest = state.selectedIds.filter(item => item !== id);
                return {
                  selectedIds: rest,
                  selectedWaypointId:
                    state.selectedWaypointId === id ? (rest[rest.length - 1] ?? null) : state.selectedWaypointId,
                };
              }
              return { selectedIds: [...state.selectedIds, id], selectedWaypointId: id };
            }),
          selectMany: ids =>
            set(state => {
              if (sameIds(state.selectedIds, ids)) {
                return state;
              }
              const primary = state.selectedWaypointId;
              return {
                selectedIds: ids,
                selectedWaypointId: primary !== null && ids.includes(primary) ? primary : (ids[ids.length - 1] ?? null),
              };
            }),
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
          moveWaypoint: (id, position) =>
            change(document => {
              const target = document.waypoints.find(waypoint => waypoint.id === id);
              if (!target) {
                return document;
              }
              if (target.position.x === position.x && target.position.y === position.y) {
                return document;
              }
              return {
                ...document,
                waypoints: document.waypoints.map(waypoint =>
                  waypoint.id === id ? { ...waypoint, position: { x: position.x, y: position.y } } : waypoint
                ),
              };
            }),
          addWaypoint: waypoint =>
            change(document => ({
              ...document,
              waypoints: [...document.waypoints, waypoint],
            })),
          deleteWaypoint: id => get().deleteWaypoints([id]),
          deleteWaypoints: ids => {
            const doomed = new Set(ids);
            if (doomed.size === 0) {
              return;
            }
            const current = get().document;
            if (!current || !current.waypoints.some(waypoint => doomed.has(waypoint.id))) {
              return;
            }
            set(state => {
              const remaining = state.selectedIds.filter(id => !doomed.has(id));
              const primary = state.selectedWaypointId;
              return {
                document: {
                  ...current,
                  waypoints: current.waypoints.filter(waypoint => !doomed.has(waypoint.id)),
                  edges: current.edges.filter(edge => !doomed.has(edge.source) && !doomed.has(edge.target)),
                  tours: current.tours.map(tour => ({
                    ...tour,
                    stops: tour.stops.filter(stop => !doomed.has(stop.waypointId)),
                  })),
                },
                selectedIds: remaining,
                selectedWaypointId:
                  primary !== null && !doomed.has(primary) ? primary : (remaining[remaining.length - 1] ?? null),
              };
            });
          },
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
          setSaveStatus: (status, error = null, detail = null) =>
            set({ saveStatus: status, saveError: error, saveErrorDetail: detail }),
          markSaved: mtimeMs => set({ saveStatus: 'saved', saveError: null, saveErrorDetail: null, mtimeMs }),
          adoptMtime: mtimeMs => set({ mtimeMs }),
          setReadOnly: readOnly => set({ readOnly }),
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

function sameIds(current: string[], next: string[]): boolean {
  if (current.length !== next.length) {
    return false;
  }
  const set = new Set(current);
  return next.every(id => set.has(id));
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
