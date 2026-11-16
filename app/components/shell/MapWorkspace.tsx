'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AppShell } from '@/app/components/shell/AppShell';
import { Inspector } from '@/app/components/shell/Inspector';
import { MapCanvas } from '@/app/components/shell/MapCanvas';
import { TourDock } from '@/app/components/shell/TourDock';
import { WorkspaceRail } from '@/app/components/shell/WorkspaceRail';
import { FailedSurface, LoadingSurface } from '@/app/components/shell/states';
import { Button } from '@/app/components/ui/button';
import { clearHistory, redo, undo } from '@/app/lib/store/history';
import type { MapStore } from '@/app/lib/store/map-store';
import { useMapStore } from '@/app/components/shell/MapStoreProvider';
import { generateTourMarkdown, tourSlug } from '@/app/lib/tour-markdown';
import { useWorkspace, fetchMap, saveMap, saveViewState } from '@/app/lib/workspace/use-workspace';
import type { SaveStatus } from '@/app/lib/workspace/types';

const SAVE_DELAY = 800;

export function MapWorkspace({ projectId, mapFile }: { projectId: string; mapFile: string }) {
  const store = useMapStore();
  const searchParams = useSearchParams();
  const { snapshot, refresh } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [overview, setOverview] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = useStore(store, state => state.status);
  const failure = useStore(store, state => state.failure);
  const mapDocument = useStore(store, state => state.document);
  const selectedId = useStore(store, state => state.selectedWaypointId);
  const activeTourId = useStore(store, state => state.activeTourId);
  const step = useStore(store, state => state.step);
  const saveStatus = useStore(store, state => state.saveStatus);
  const saveError = useStore(store, state => state.saveError);
  const past = useStore(store.temporal, state => state.pastStates.length);
  const future = useStore(store.temporal, state => state.futureStates.length);

  const query = searchParams.toString();

  const load = useCallback(async () => {
    store.getState().setStatus('loading');
    try {
      const payload = await fetchMap(projectId, mapFile);
      store.getState().loadDocument(payload);
      clearHistory(store);
      const params = new URLSearchParams(window.location.search);
      const requested = payload.document.tours.find(tour => tour.id === params.get('tour'));
      if (requested) {
        store.getState().setActiveTour(requested.id);
        const requestedStep = Number(params.get('step') ?? '0');
        store.getState().setStep(Number.isFinite(requestedStep) ? requestedStep : 0);
      }
    } catch (cause) {
      store.getState().failLoad(cause instanceof Error ? cause.message : 'This map could not be loaded.');
    }
  }, [mapFile, projectId, store]);

  useEffect(() => {
    void load();
  }, [load, query]);

  useEffect(() => {
    let last = store.getState().document;
    const unsubscribe = store.subscribe(state => {
      if (state.document === last || !state.document) {
        return;
      }
      last = state.document;
      store.getState().setSaveStatus('pending');
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
      pendingSave.current = setTimeout(async () => {
        const current = store.getState().document;
        if (!current) {
          return;
        }
        try {
          const result = await saveMap(projectId, mapFile, current, store.getState().mtimeMs);
          store.getState().markSaved(result.mtimeMs ?? 0);
        } catch (cause) {
          const code =
            cause && typeof cause === 'object' && 'code' in cause
              ? String((cause as { code: unknown }).code)
              : 'save-failed';
          store.getState().setSaveStatus('failed', code);
        }
      }, SAVE_DELAY);
    });
    return () => {
      unsubscribe();
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
    };
  }, [mapFile, projectId, store]);

  useEffect(() => {
    if (!mapDocument) {
      return;
    }
    void saveViewState({ projectId, mapFile, tourId: activeTourId, step });
  }, [projectId, mapFile, activeTourId, step, mapDocument]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (typing) {
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) {
        return;
      }
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo(store);
        return;
      }
      if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo(store);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  const waypoints = mapDocument?.waypoints ?? [];
  const edges = mapDocument?.edges ?? [];
  const tours = mapDocument?.tours ?? [];
  const tour = tours.find(item => item.id === activeTourId) ?? null;
  const dimmed = useMemo(() => {
    if (!tour || overview) {
      return null;
    }
    return new Set(tour.stops.map(stop => stop.waypointId));
  }, [tour, overview]);

  const exportTour = tour
    ? () => {
        const markdown = generateTourMarkdown(tour, waypoints, { projectName: projectId });
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tourSlug(tour.name)}.md`;
        link.click();
        URL.revokeObjectURL(url);
      }
    : null;

  const rail = (
    <WorkspaceRail
      projects={snapshot?.projects ?? []}
      activeProjectId={projectId}
      activeMapFile={mapFile}
      onChanged={refresh}
    />
  );

  const canvas =
    status === 'loading' ? (
      <LoadingSurface label="Loading this map" />
    ) : status === 'failed' ? (
      <FailedSurface message={failure?.message ?? 'This map could not be loaded.'} onRetry={() => void load()} />
    ) : (
      <MapCanvas
        waypoints={waypoints}
        edges={edges}
        selectedId={selectedId}
        onSelect={id => {
          store.getState().selectWaypoint(id);
          setInspectorOpen(id !== null);
        }}
        dimmedIds={dimmed}
      />
    );

  const dock = (
    <TourDock
      tours={tours}
      activeTourId={activeTourId}
      step={step}
      onTourChange={id => {
        store.getState().setActiveTour(id);
        setOverview(false);
        setEditing(false);
      }}
      onStep={value => {
        store.getState().setStep(value);
        const stop = tour?.stops[value];
        store.getState().selectWaypoint(stop?.waypointId ?? null);
      }}
      editing={editing}
      onEditingChange={setEditing}
      overview={overview}
      onOverviewChange={setOverview}
      onExport={exportTour}
      canUndo={past > 0}
      canRedo={future > 0}
      onUndo={() => undo(store)}
      onRedo={() => redo(store)}
      saveStatus={saveStatus as SaveStatus}
    />
  );

  return (
    <div className="flex h-dvh w-full flex-col">
      {saveError === 'stale-document' ? (
        <div role="alert" className="flex items-center gap-2 border-b border-destructive bg-muted px-3 py-2 text-sm">
          <span className="flex-1">This map changed on disk while you were editing.</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reload
          </Button>
          <Button
            size="sm"
            onClick={() => {
              store.getState().setSaveStatus('idle', null);
            }}
          >
            Keep mine
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <AppShell
          rail={rail}
          canvas={canvas}
          dock={dock}
          inspector={<Inspector store={store} editing={editing} />}
          inspectorOpen={inspectorOpen}
          onInspectorOpenChange={setInspectorOpen}
        />
      </div>
    </div>
  );
}

export type { MapStore };
