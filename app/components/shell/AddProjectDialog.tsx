'use client';

import { ArrowUpIcon, FolderIcon, Loader2Icon } from 'lucide-react';
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
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { addProject, browse } from '@/app/lib/workspace/use-workspace';
import type { ProjectSummary } from '@/app/lib/workspace/types';

interface Entry {
  name: string;
  isProject: boolean;
}

export function AddProjectDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (project: ProjectSummary) => void;
}) {
  const [current, setCurrent] = useState<string>('');
  const [parent, setParent] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [manualPath, setManualPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const go = async (target?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await browse(target);
      setCurrent(result.path);
      setParent(result.parent);
      setEntries(result.entries);
      setManualPath(result.path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That folder could not be read.');
    } finally {
      setLoading(false);
    }
  };

  const choose = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await addProject(target);
      onAdded(result.project);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That project could not be added.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next);
        if (next && !current) {
          void go();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Choose the folder that holds your code. The maps for it live in its .tours directory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Go to the parent folder"
            disabled={!parent}
            onClick={() => parent && go(parent)}
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
          <Input
            aria-label="Folder path"
            value={manualPath}
            onChange={event => setManualPath(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void go(manualPath);
              }
            }}
          />
        </div>

        <ScrollArea className="h-64 rounded-md border border-border">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              Reading folders
            </div>
          ) : entries.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No folders here.</p>
          ) : (
            <ul className="p-1">
              {entries.map(entry => (
                <li key={entry.name}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => go(`${current}/${entry.name}`)}
                  >
                    <FolderIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{entry.name}</span>
                    {entry.isProject ? <span className="ml-auto text-xs text-muted-foreground">has maps</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !current} onClick={() => choose(current)}>
            {busy ? 'Adding' : 'Add this folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
