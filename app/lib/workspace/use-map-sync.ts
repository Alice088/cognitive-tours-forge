'use client';

import { useEffect, useRef } from 'react';
import {
  parseSyncEvent,
  type MapChangedEvent,
  type MapGoneEvent,
  type MapUnreadableEvent,
} from '@/app/lib/workspace/sync-events';
import { ApiError, fetchMap } from '@/app/lib/workspace/use-workspace';

export interface MapSyncHandlers {
  onChanged: (event: MapChangedEvent) => void;
  onUnreadable: (event: MapUnreadableEvent) => void;
  onGone: (event: MapGoneEvent) => void;
}

export interface MapSyncInput {
  projectId: string;
  mapFile: string;
  readOnly: boolean;
  handlers: MapSyncHandlers;
}

export function useMapSync({ projectId, mapFile, readOnly, handlers }: MapSyncInput): void {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (readOnly) {
      return;
    }
    const source = new EventSource(`/api/maps/${encodeURIComponent(projectId)}/${encodeURIComponent(mapFile)}/events`);
    let reconciling = false;

    const listen = (kind: string, apply: (event: unknown) => void) => {
      source.addEventListener(kind, message => {
        const event = parseSyncEvent((message as MessageEvent<string>).data);
        if (event && event.type === kind) {
          apply(event);
        }
      });
    };

    listen('map-changed', event => latest.current.onChanged(event as MapChangedEvent));
    listen('map-unreadable', event => latest.current.onUnreadable(event as MapUnreadableEvent));
    listen('map-gone', event => latest.current.onGone(event as MapGoneEvent));

    const reconcile = async () => {
      if (reconciling) {
        return;
      }
      reconciling = true;
      try {
        const payload = await fetchMap(projectId, mapFile);
        latest.current.onChanged({
          type: 'map-changed',
          document: payload.document,
          report: payload.report,
          mtimeMs: payload.mtimeMs ?? Date.now(),
        });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : '';
        const reason = error instanceof Error ? error.message : `${mapFile} cannot be read`;
        if (code === 'map-unreadable' || code === 'invalid-document') {
          latest.current.onUnreadable({ type: 'map-unreadable', file: mapFile, reason });
        }
        if (code === 'map-missing') {
          latest.current.onGone({ type: 'map-gone', file: mapFile });
        }
      } finally {
        reconciling = false;
      }
    };

    const onVisibility = () => {
      if (window.document.visibilityState === 'visible') {
        void reconcile();
      }
    };
    window.document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.document.removeEventListener('visibilitychange', onVisibility);
      source.close();
    };
  }, [mapFile, projectId, readOnly]);
}

export function useListSync(projectId: string, onChange: () => void, enabled = true): void {
  const latest = useRef(onChange);

  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const source = new EventSource(`/api/workspace/${encodeURIComponent(projectId)}/events`);
    source.addEventListener('maps-changed', message => {
      const event = parseSyncEvent((message as MessageEvent<string>).data);
      if (event?.type === 'maps-changed') {
        latest.current();
      }
    });
    source.addEventListener('open', () => latest.current());
    return () => {
      source.close();
    };
  }, [enabled, projectId]);
}
