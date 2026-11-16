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
import { relinkProject } from '@/app/lib/workspace/use-workspace';
import type { ProjectSummary } from '@/app/lib/workspace/types';

export function RelinkDialog({
  project,
  onOpenChange,
  onRelinked,
}: {
  project: ProjectSummary | null;
  onOpenChange: (open: boolean) => void;
  onRelinked: () => void;
}) {
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    if (!project) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await relinkProject(project.id, path);
      onRelinked();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That folder could not be used.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Point {project?.name ?? 'this project'} at a new location</DialogTitle>
          <DialogDescription>
            The folder this project was added from cannot be reached. Nothing on disk is moved: choosing a new location
            only updates where this project is read from.
          </DialogDescription>
        </DialogHeader>

        <FolderBrowser onPathChange={setPath} />

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !path} onClick={choose}>
            {busy ? 'Linking' : 'Use this folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
