'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportResult, FolderPreview, ImportOutcome, ImportPreview } from '@/app/lib/workspace/exchange';
import type { LoadReport, MapDocument, ProjectSummary, ViewState } from '@/app/lib/workspace/types';

export interface WorkspaceSnapshot {
  projects: ProjectSummary[];
  lastView: ViewState | null;
}

export interface ApiFailure {
  error: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(failure?.error ?? 'unexpected', failure?.message ?? 'Request failed');
  }
  return payload as T;
}

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [failure, setFailure] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = latestRequest.current + 1;
    latestRequest.current = request;
    try {
      const data = await requestJson<WorkspaceSnapshot>('/api/workspace');
      if (request !== latestRequest.current) {
        return;
      }
      setSnapshot(data);
      setStatus('ready');
      setFailure(null);
    } catch (error) {
      if (request !== latestRequest.current) {
        return;
      }
      setStatus('failed');
      setFailure(error instanceof Error ? error.message : 'The workspace could not be read.');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await requestJson<WorkspaceSnapshot>('/api/workspace');
        if (!alive) {
          return;
        }
        setSnapshot(data);
        setStatus('ready');
        setFailure(null);
      } catch (error) {
        if (!alive) {
          return;
        }
        setStatus('failed');
        setFailure(error instanceof Error ? error.message : 'The workspace could not be read.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { snapshot, status, failure, refresh };
}

export async function fetchMap(
  projectId: string,
  mapFile: string
): Promise<{
  document: MapDocument;
  report: LoadReport;
  mtimeMs: number | null;
  readOnly: boolean;
}> {
  return requestJson(`/api/maps/${encodeURIComponent(projectId)}/${encodeURIComponent(mapFile)}`);
}

export async function saveMap(
  projectId: string,
  mapFile: string,
  document: MapDocument,
  expectedMtimeMs: number | null
): Promise<{ savedAt: string; mtimeMs: number }> {
  return requestJson(`/api/maps/${encodeURIComponent(projectId)}/${encodeURIComponent(mapFile)}`, {
    method: 'PUT',
    body: JSON.stringify({ document, expectedMtimeMs }),
  });
}

export async function saveViewState(view: ViewState): Promise<void> {
  await requestJson('/api/workspace/view-state', { method: 'PUT', body: JSON.stringify(view) });
}

export async function previewExchange(options: {
  projectId: string;
  path?: string;
  folder?: string;
}): Promise<ImportPreview | FolderPreview> {
  const query = new URLSearchParams({ projectId: options.projectId });
  if (options.path) {
    query.set('path', options.path);
  }
  if (options.folder) {
    query.set('folder', options.folder);
  }
  return requestJson(`/api/exchange/preview?${query.toString()}`);
}

export async function exportMaps(options: {
  projectId: string;
  folder: string;
  mapFile?: string;
  all?: boolean;
}): Promise<ExportResult> {
  return requestJson('/api/exchange/export', { method: 'POST', body: JSON.stringify(options) });
}

export async function importMaps(options: {
  projectId: string;
  path?: string;
  folder?: string;
  acceptLosses?: boolean;
}): Promise<ImportOutcome> {
  return requestJson('/api/exchange/import', { method: 'POST', body: JSON.stringify(options) });
}

export async function relinkProject(projectId: string, path: string): Promise<{ project: ProjectSummary }> {
  return requestJson(`/api/workspace/${encodeURIComponent(projectId)}/relink`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function addProject(path: string): Promise<{ project: ProjectSummary }> {
  return requestJson('/api/workspace', { method: 'POST', body: JSON.stringify({ path }) });
}

export async function createMap(projectId: string, name: string): Promise<{ map: { file: string; name: string } }> {
  return requestJson(`/api/workspace/${encodeURIComponent(projectId)}/maps`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function browse(
  path?: string,
  mode: 'folders' | 'files' = 'folders'
): Promise<{
  path: string;
  parent: string | null;
  entries: Array<{ name: string; isProject: boolean; kind: 'folder' | 'file'; size?: number }>;
}> {
  const query = new URLSearchParams();
  if (path) {
    query.set('path', path);
  }
  if (mode === 'files') {
    query.set('mode', 'files');
  }
  const suffix = query.toString();
  return requestJson(`/api/workspace/browse${suffix ? `?${suffix}` : ''}`);
}
