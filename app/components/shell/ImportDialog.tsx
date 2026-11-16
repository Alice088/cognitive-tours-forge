'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { FolderBrowser } from '@/app/components/shell/FolderBrowser';
import { importMaps, previewExchange } from '@/app/lib/workspace/use-workspace';
import type { FolderPreview, ImportOutcome, ImportPreview } from '@/app/lib/workspace/exchange';
import type { ProjectSummary } from '@/app/lib/workspace/types';

type Mode = 'file' | 'folder';

function isFolderPreview(value: ImportPreview | FolderPreview): value is FolderPreview {
  return 'entries' in value;
}

export function ImportDialog({
  open,
  onOpenChange,
  project,
  onImported,
  onOpenMap,
  initialMode = 'file',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectSummary | null;
  onImported: () => void;
  onOpenMap?: (file: string) => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [file, setFile] = useState<string | null>(null);
  const [folder, setFolder] = useState('');
  const [preview, setPreview] = useState<ImportPreview | FolderPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [acceptLosses, setAcceptLosses] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportOutcome | null>(null);

  const reset = () => {
    setPreview(null);
    setPreviewError(null);
    setFile(null);
    setAcceptLosses(false);
    setResult(null);
    setError(null);
  };

  const readFile = useCallback(
    async (target: string) => {
      if (!project) {
        return;
      }
      setPreviewError(null);
      setAcceptLosses(false);
      try {
        setPreview(await previewExchange({ projectId: project.id, path: target }));
      } catch (cause) {
        setPreview(null);
        setPreviewError(cause instanceof Error ? cause.message : 'That file could not be read.');
      }
    },
    [project]
  );

  const readFolder = useCallback(
    async (target: string) => {
      if (!project || !target) {
        return;
      }
      setPreviewError(null);
      setAcceptLosses(false);
      try {
        setPreview(await previewExchange({ projectId: project.id, folder: target }));
      } catch (cause) {
        setPreview(null);
        setPreviewError(cause instanceof Error ? cause.message : 'That folder could not be read.');
      }
    },
    [project]
  );

  const handleChoose = useCallback(
    (target: string) => {
      setFile(target);
      void readFile(target);
    },
    [readFile]
  );

  const handlePath = useCallback(
    (target: string) => {
      setFolder(target);
      if (mode === 'folder' && target) {
        void readFolder(target);
      }
    },
    [mode, readFolder]
  );

  const confirm = async () => {
    if (!project) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const outcome = await importMaps({
        projectId: project.id,
        path: mode === 'file' ? (file ?? undefined) : undefined,
        folder: mode === 'folder' ? folder : undefined,
        acceptLosses,
      });
      setResult(outcome);
      onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That map could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  const single = preview && !isFolderPreview(preview) ? preview : null;
  const many = preview && isFolderPreview(preview) ? preview : null;
  const refusal = single?.refusal ?? null;
  const losses = single
    ? single.lossText
    : many
      ? (many.entries.find(entry => entry.lossText)?.lossText ?? null)
      : null;
  const tooBig = single ? single.tooBig : many ? many.entries.some(entry => entry.tooBig) : false;
  const ready = mode === 'file' ? file !== null : folder !== '';
  const canConfirm = ready && preview !== null && refusal === null && (losses === null || acceptLosses);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bring in maps</DialogTitle>
          <DialogDescription>
            A map is read from a file you choose and written into {project?.name ?? 'this project'} as a new map. An
            existing map is never replaced.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-2 text-sm" role="status">
            {result.added.map(entry => (
              <p key={entry.file}>
                Imported {entry.displayName}: {entry.waypoints} waypoints, {entry.links} links, {entry.tours} tours.
              </p>
            ))}
            {result.added.length === 0 ? <p>Nothing was imported.</p> : null}
            {result.skipped.length > 0 ? (
              <ul className="space-y-1 text-muted-foreground">
                {result.skipped.map(entry => (
                  <li key={`${entry.file}-${entry.text}`}>{entry.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1">
              <Button
                variant={mode === 'file' ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={mode === 'file'}
                onClick={() => {
                  setMode('file');
                  setPreview(null);
                  setFile(null);
                }}
              >
                One file
              </Button>
              <Button
                variant={mode === 'folder' ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={mode === 'folder'}
                onClick={() => {
                  setMode('folder');
                  setPreview(null);
                }}
              >
                A folder of maps
              </Button>
            </div>

            <FolderBrowser
              mode={mode === 'file' ? 'files' : 'folders'}
              chosenFile={file}
              onChooseFile={handleChoose}
              onPathChange={handlePath}
            />

            {previewError ? (
              <p role="alert" className="text-sm text-destructive">
                {previewError}
              </p>
            ) : null}

            {refusal ? (
              <p role="alert" className="text-sm text-destructive">
                {refusal.text}
              </p>
            ) : null}

            {single && !refusal ? (
              <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                <p>
                  Map name: <span className="font-medium">{single.displayName}</span>
                </p>
                <p className="text-muted-foreground">
                  {single.waypoints} waypoints, {single.links} links, {single.tours} tours
                </p>
                {single.taken.length > 0 ? (
                  <p className="text-muted-foreground">
                    {single.taken.join(', ')} is already in this project, so the map is {single.name}.
                  </p>
                ) : null}
                {single.lossText ? <p className="text-destructive">{single.lossText}</p> : null}
                {single.tooBig ? (
                  <p className="text-muted-foreground">
                    This map is larger than the product is built for: it will open, but it is beyond the supported size.
                  </p>
                ) : null}
              </div>
            ) : null}

            {many && !refusal ? (
              <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                <p>
                  {many.entries.length} maps will be added, {many.refused.length} files will be left out.
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {many.entries.map(entry => (
                    <li key={entry.file}>
                      {entry.name}: {entry.waypoints} waypoints, {entry.links} links, {entry.tours} tours
                      {entry.lossText ? ` — ${entry.lossText}` : ''}
                    </li>
                  ))}
                  {many.refused.map(entry => (
                    <li key={entry.file}>{entry.refusal?.text}</li>
                  ))}
                </ul>
                {tooBig ? (
                  <p className="text-muted-foreground">
                    At least one of these maps is larger than the product is built for.
                  </p>
                ) : null}
              </div>
            ) : null}

            {losses ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acceptLosses}
                  onChange={event => setAcceptLosses(event.target.checked)}
                  aria-label="Confirm the entries that cannot be represented"
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>Write the map anyway, without the entries that cannot be represented.</span>
              </label>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              {result.added.length === 1 && onOpenMap ? (
                <Button onClick={() => onOpenMap(result.added[0].file)}>Open {result.added[0].displayName}</Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={busy || !canConfirm} onClick={confirm}>
                {busy ? 'Importing' : 'Import'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
