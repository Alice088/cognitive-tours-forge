'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AppShell } from '@/app/components/shell/AppShell';
import { ExportDialog } from '@/app/components/shell/ExportDialog';
import { Inspector } from '@/app/components/shell/Inspector';
import { MapActions } from '@/app/components/shell/MapActions';
import { MapCanvas } from '@/app/components/shell/MapCanvas';
import { MapNotice, type MapNoticeState } from '@/app/components/shell/MapNotice';
import { RelinkDialog } from '@/app/components/shell/RelinkDialog';
import { TourDock } from '@/app/components/shell/TourDock';
import { WorkspaceRail } from '@/app/components/shell/WorkspaceRail';
import { FailedSurface, LoadingSurface } from '@/app/components/shell/states';
import { clearHistory, redo, undo } from '@/app/lib/store/history';
import type { MapStore } from '@/app/lib/store/map-store';
import { nextTourId } from '@/app/lib/store/selectors';
import { useMapStore } from '@/app/components/shell/MapStoreProvider';
import { generateTourMarkdown, tourSlug } from '@/app/lib/tour-markdown';
import { isEmptyChange, summariseChange, type ChangeSummary } from '@/app/lib/workspace/diff';
import { serializeDocument } from '@/app/lib/workspace/serialize';
import { useListSync, useMapSync } from '@/app/lib/workspace/use-map-sync';
import type { MapChangedEvent } from '@/app/lib/workspace/sync-events';
import {
  ApiError,
  useWorkspace,
  fetchMap,
  saveMap,
  saveViewState,
  exportMaps,
} from '@/app/lib/workspace/use-workspace';
import { SUPPORTED_TOURS, SUPPORTED_WAYPOINTS, type SaveStatus } from '@/app/lib/workspace/types';

const SAVE_DELAY = 800;

export function MapWorkspace({ projectId, mapFile }: { projectId: string; mapFile: string }) {
  const store = useMapStore();
  const searchParams = useSearchParams();
  const { snapshot, refresh } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [overview, setOverview] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [exportMode, setExportMode] = useState<'one' | 'all' | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [oversizedDismissed, setOversizedDismissed] = useState(false);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const dirty = useRef(false);
  const retrySave = useRef<() => void>(() => undefined);
  const diskText = useRef<string | null>(null);
  const skipAutosave = useRef(false);
  const saveGeneration = useRef(0);
  const holdAutosave = useRef(false);
  const blocked = useRef(false);
  const [external, setExternal] = useState<{ event: MapChangedEvent; summary: ChangeSummary | null } | null>(null);
  const [unreadable, setUnreadable] = useState<{ file: string; reason: string } | null>(null);
  const [gone, setGone] = useState<string | null>(null);

  const status = useStore(store, state => state.status);
  const failure = useStore(store, state => state.failure);
  const mapDocument = useStore(store, state => state.document);
  const selectedId = useStore(store, state => state.selectedWaypointId);
  const activeTourId = useStore(store, state => state.activeTourId);
  const step = useStore(store, state => state.step);
  const saveStatus = useStore(store, state => state.saveStatus);
  const saveError = useStore(store, state => state.saveError);
  const saveErrorDetail = useStore(store, state => state.saveErrorDetail);
  const readOnly = useStore(store, state => state.readOnly);
  const past = useStore(store.temporal, state => state.pastStates.length);
  const future = useStore(store.temporal, state => state.futureStates.length);

  const query = searchParams.toString();
  const projectAvailability = snapshot?.projects.find(item => item.id === projectId)?.availability ?? null;

  const load = useCallback(async () => {
    store.getState().setStatus('loading');
    try {
      const payload = await fetchMap(projectId, mapFile);
      skipAutosave.current = true;
      store.getState().loadDocument(payload);
      diskText.current = serializeDocument(payload.document);
      clearHistory(store);
      const params = new URLSearchParams(window.location.search);
      const requested = payload.document.tours.find(tour => tour.id === params.get('tour'));
      if (requested) {
        store.getState().setActiveTour(requested.id);
        const stored = Number(params.get('step') ?? '0');
        const safe = Number.isFinite(stored) ? Math.floor(stored) : 0;
        store.getState().setStep(Math.min(Math.max(safe, 0), Math.max(requested.stops.length - 1, 0)));
      }
    } catch (cause) {
      store.getState().failLoad(cause instanceof Error ? cause.message : 'This map could not be loaded.');
    }
  }, [mapFile, projectId, store]);

  useEffect(() => {
    void load();
  }, [load, query]);

  const save = useCallback(
    async (force = false) => {
      const current = store.getState().document;
      if (!current || store.getState().readOnly || (blocked.current && !force)) {
        return;
      }
      if (holdAutosave.current && !force) {
        return;
      }
      if (saving.current) {
        dirty.current = true;
        return;
      }
      saving.current = true;
      const generation = saveGeneration.current;
      store.getState().setSaveStatus('pending');
      const writeOnce = async (expected: number | null) => {
        try {
          return await saveMap(projectId, mapFile, current, expected);
        } catch (cause) {
          const retryable = expected !== null && cause instanceof ApiError && cause.code === 'stale-document';
          const disk = retryable ? await fetchMap(projectId, mapFile).catch(() => null) : null;
          if (!disk || disk.mtimeMs === null || !isEmptyChange(summariseChange(current, disk.document))) {
            throw cause;
          }
          store.getState().adoptMtime(disk.mtimeMs);
          return saveMap(projectId, mapFile, current, disk.mtimeMs);
        }
      };
      try {
        const result = await writeOnce(force ? null : store.getState().mtimeMs);
        if (generation !== saveGeneration.current) {
          return;
        }
        diskText.current = serializeDocument(current);
        store.getState().markSaved(result.mtimeMs ?? 0);
        if (force) {
          blocked.current = false;
          holdAutosave.current = false;
          setUnreadable(null);
          setGone(null);
        }
      } catch (cause) {
        if (generation !== saveGeneration.current) {
          return;
        }
        const code =
          cause && typeof cause === 'object' && 'code' in cause
            ? String((cause as { code: unknown }).code)
            : 'save-failed';
        const detail = cause instanceof Error ? cause.message : 'This change could not be saved.';
        store.getState().setSaveStatus('failed', code, detail);
      } finally {
        saving.current = false;
        if (dirty.current) {
          dirty.current = false;
          retrySave.current();
        }
      }
    },
    [mapFile, projectId, store]
  );

  useEffect(() => {
    retrySave.current = () => void save();
  }, [save]);

  useEffect(() => {
    let last = store.getState().document;
    const unsubscribe = store.subscribe(state => {
      if (state.document === last || !state.document) {
        return;
      }
      last = state.document;
      if (state.readOnly) {
        return;
      }
      if (skipAutosave.current) {
        skipAutosave.current = false;
        return;
      }
      if (holdAutosave.current || blocked.current) {
        return;
      }
      store.getState().setSaveStatus('pending');
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
      pendingSave.current = setTimeout(() => void save(), SAVE_DELAY);
    });
    return () => {
      unsubscribe();
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
    };
  }, [save, store]);

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
      if (meta) {
        if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo(store);
          return;
        }
        if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
          event.preventDefault();
          redo(store);
        }
        return;
      }
      if (event.key !== 'Escape') {
        return;
      }
      if (window.document.querySelector('[role="dialog"]')) {
        return;
      }
      if (editing) {
        event.preventDefault();
        setEditing(false);
        return;
      }
      if (store.getState().selectedWaypointId) {
        event.preventDefault();
        store.getState().selectWaypoint(null);
        setInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing, store]);

  const dirtyNow = useCallback(() => {
    const current = store.getState().document;
    if (!current) {
      return false;
    }
    return store.getState().drafting || serializeDocument(current) !== diskText.current;
  }, [store]);

  const cancelScheduledSave = useCallback(() => {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
    }
  }, []);

  const flushForExport = useCallback(async (): Promise<string | null> => {
    cancelScheduledSave();
    const current = store.getState().document;
    if (!current || store.getState().readOnly || !dirtyNow()) {
      return null;
    }
    try {
      const result = await saveMap(projectId, mapFile, current, store.getState().mtimeMs);
      store.getState().markSaved(result.mtimeMs ?? 0);
      diskText.current = serializeDocument(current);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : 'This map could not be written to the project.';
    }
  }, [cancelScheduledSave, dirtyNow, mapFile, projectId, store]);

  const runExport = useCallback(
    async (folder: string) => {
      const refusal = await flushForExport();
      if (refusal) {
        throw new Error(refusal);
      }
      return exportMaps({
        projectId,
        folder,
        mapFile: exportMode === 'all' ? undefined : mapFile,
        all: exportMode === 'all',
      });
    },
    [exportMode, flushForExport, mapFile, projectId]
  );

  const applyFromDisk = useCallback(
    (event: MapChangedEvent, restart = false) => {
      const text = serializeDocument(event.document);
      if (text === diskText.current) {
        store.getState().adoptMtime(event.mtimeMs);
        return;
      }
      const selected = store.getState().selectedWaypointId;
      const selectedLabel = selected
        ? (store.getState().document?.waypoints.find(waypoint => waypoint.id === selected)?.label ?? null)
        : null;
      diskText.current = text;
      skipAutosave.current = true;
      store.getState().applyExternal(event);
      store.getState().markSaved(event.mtimeMs);
      if (restart) {
        clearHistory(store);
        setLiveMessage('Reloaded from disk. The history starts again.');
        return;
      }
      const selectionLost = selected !== null && !event.document.waypoints.some(waypoint => waypoint.id === selected);
      if (selectionLost) {
        setLiveMessage(
          `${selectedLabel ? `“${selectedLabel}”` : 'The selected waypoint'} is no longer on the map on disk, so the selection is cleared.`
        );
        return;
      }
      setLiveMessage(
        `Updated from disk: ${event.document.waypoints.length} waypoints and ${event.document.tours.length} tours`
      );
    },
    [store]
  );

  const reloadFromDisk = useCallback(() => {
    if (!external) {
      return;
    }
    saveGeneration.current += 1;
    cancelScheduledSave();
    holdAutosave.current = false;
    blocked.current = false;
    setUnreadable(null);
    setGone(null);
    applyFromDisk(external.event, true);
    setExternal(null);
  }, [applyFromDisk, cancelScheduledSave, external]);

  const keepMine = useCallback(() => {
    saveGeneration.current += 1;
    const active = window.document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    cancelScheduledSave();
    holdAutosave.current = false;
    blocked.current = false;
    setExternal(null);
    void save(true);
  }, [cancelScheduledSave, save]);

  useMapSync({
    projectId,
    mapFile,
    readOnly: readOnly || status !== 'ready',
    handlers: {
      onChanged: event => {
        if (serializeDocument(event.document) === diskText.current) {
          store.getState().adoptMtime(event.mtimeMs);
          blocked.current = false;
          setUnreadable(null);
          setGone(null);
          return;
        }
        if (dirtyNow()) {
          cancelScheduledSave();
          holdAutosave.current = true;
          setUnreadable(null);
          setGone(null);
          const current = store.getState().document;
          setExternal({
            event,
            summary: current ? summariseChange(current, event.document) : null,
          });
          return;
        }
        blocked.current = false;
        holdAutosave.current = false;
        setUnreadable(null);
        setGone(null);
        applyFromDisk(event);
      },
      onUnreadable: event => {
        blocked.current = true;
        setExternal(null);
        setGone(null);
        setUnreadable({ file: event.file, reason: event.reason });
      },
      onGone: event => {
        blocked.current = true;
        setExternal(null);
        setUnreadable(null);
        setGone(event.file);
      },
    },
  });

  useListSync(projectId, () => void refresh(), projectAvailability !== 'unavailable');

  useEffect(() => {
    if (projectAvailability === 'ready') {
      void refresh();
    }
  }, [projectAvailability, refresh]);

  useEffect(() => {
    if (!liveMessage) {
      return;
    }
    const timer = setTimeout(() => setLiveMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [liveMessage]);

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

  const oversized = waypoints.length > SUPPORTED_WAYPOINTS || tours.length > SUPPORTED_TOURS;
  const frozen = status !== 'ready';
  const project = snapshot?.projects.find(item => item.id === projectId) ?? null;

  const announcement =
    liveMessage ??
    (status === 'loading'
      ? 'Loading map'
      : status === 'failed'
        ? 'The map could not be loaded'
        : mapDocument
          ? `Map open with ${waypoints.length} waypoints and ${tours.length} tours${readOnly ? ', read only' : ''}`
          : '');

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
      <div className="relative h-full">
        <MapCanvas
          waypoints={waypoints}
          edges={edges}
          selectedId={selectedId}
          readOnly={readOnly}
          onSelect={id => {
            store.getState().selectWaypoint(id);
            setInspectorOpen(id !== null);
          }}
          onMove={(id, position) => store.getState().moveWaypoint(id, position)}
          dimmedIds={dimmed}
        />
        <MapActions
          onSaveCopy={() => setExportMode('one')}
          onExportAll={() => setExportMode('all')}
          allDisabled={frozen}
        />
      </div>
    );

  const dock = (
    <TourDock
      tours={tours}
      activeTourId={activeTourId}
      step={step}
      disabled={frozen}
      readOnly={readOnly}
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
      onCreateTour={() => {
        if (!mapDocument) {
          return;
        }
        const id = nextTourId(mapDocument.tours);
        store.getState().addTour({ id, name: 'Untitled tour', stops: [] });
        store.getState().setActiveTour(id);
        setOverview(false);
        setEditing(true);
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

  const notice: MapNoticeState | null = readOnly
    ? { kind: 'read-only', onRelink: () => setRelinking(true) }
    : unreadable
      ? {
          kind: 'unreadable',
          file: unreadable.file,
          reason: unreadable.reason,
          onKeepMine: () => void save(true),
        }
      : external
        ? {
            kind: 'outside-change',
            summary: external.summary,
            onReload: reloadFromDisk,
            onKeepMine: keepMine,
          }
        : gone
          ? {
              kind: 'gone',
              file: gone,
              onWriteBack: () => void save(true),
              onDismiss: () => setGone(null),
            }
          : saveStatus === 'failed'
            ? saveError === 'stale-document'
              ? {
                  kind: 'outside-change',
                  summary: null,
                  onReload: () => {
                    saveGeneration.current += 1;
                    cancelScheduledSave();
                    void load().then(() => setLiveMessage('Reloaded from disk. The history starts again.'));
                  },
                  onKeepMine: () => void save(true),
                }
              : {
                  kind: 'save-failed',
                  detail: saveErrorDetail ?? 'This change could not be saved.',
                  onRetry: () => void save(),
                }
            : oversized && !oversizedDismissed
              ? {
                  kind: 'oversized',
                  waypointLimit: SUPPORTED_WAYPOINTS,
                  tourLimit: SUPPORTED_TOURS,
                  onDismiss: () => setOversizedDismissed(true),
                }
              : null;

  return (
    <div className="flex h-dvh w-full flex-col">
      <MapNotice notice={notice} />
      <div className="min-h-0 flex-1">
        <AppShell
          rail={rail}
          canvas={canvas}
          dock={dock}
          inspector={<Inspector store={store} editing={editing} />}
          inspectorOpen={inspectorOpen}
          onInspectorOpenChange={setInspectorOpen}
          announcement={announcement}
        />
      </div>

      <RelinkDialog
        project={relinking && project ? project : null}
        onOpenChange={open => {
          if (!open) {
            setRelinking(false);
          }
        }}
        onRelinked={() => {
          refresh();
          void load();
        }}
      />

      <ExportDialog
        open={exportMode !== null}
        onOpenChange={open => {
          if (!open) {
            setExportMode(null);
          }
        }}
        mode={exportMode ?? 'one'}
        projectName={project?.name ?? projectId}
        mapCount={project?.maps.length ?? 0}
        onExport={runExport}
      />
    </div>
  );
}

export type { MapStore };
