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
import { addProject } from '@/app/lib/workspace/use-workspace';
import type { ProjectSummary } from '@/app/lib/workspace/types';

export function AddProjectDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (project: ProjectSummary) => void;
}) {
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await addProject(path);
      onAdded(result.project);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That project could not be added.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Choose the folder that holds your code. The maps for it live in its .tours directory.
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
            {busy ? 'Adding' : 'Add this folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
