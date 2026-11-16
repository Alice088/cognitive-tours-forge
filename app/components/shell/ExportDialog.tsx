'use client';

import { useState } from 'react';
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
import type { ExportResult } from '@/app/lib/workspace/exchange';

export function ExportDialog({
  open,
  onOpenChange,
  mode,
  projectName,
  mapCount,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'one' | 'all';
  projectName: string;
  mapCount: number;
  onExport: (folder: string) => Promise<ExportResult>;
}) {
  const [folder, setFolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  const reset = () => {
    setResult(null);
    setError(null);
    setBusy(false);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await onExport(folder));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That copy could not be written.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'one' ? 'Save a copy' : 'Export all maps';
  const written = result?.written ?? [];
  const saved = written.map(entry => entry.file).join(', ');

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'one'
              ? `A copy of this map is written into a folder you choose. Nothing in ${projectName} changes.`
              : `One file per map of ${projectName} is written into a folder you choose. Nothing in the project changes.`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-2 text-sm" role="status">
            <p>
              {mode === 'one'
                ? `Saved ${saved} to ${folder}.`
                : `Saved ${written.length} of ${mapCount} maps to ${folder}.`}
              {result.source === 'last-known' ? ' The copy came from the last known version.' : ''}
            </p>
            {result.skipped.length > 0 ? (
              <ul className="space-y-1 text-muted-foreground">
                {result.skipped.map(entry => (
                  <li key={`${entry.file}-${entry.text}`}>{entry.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <>
            <FolderBrowser onPathChange={setFolder} />
            <p className="text-sm text-muted-foreground">
              {folder ? `Into ${folder}` : 'Choose a folder to write into.'}
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={busy || !folder} onClick={send}>
                {busy ? 'Writing' : mode === 'one' ? 'Save copy' : `Export ${mapCount} maps`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
