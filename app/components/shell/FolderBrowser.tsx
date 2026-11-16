'use client';

import { ArrowUpIcon, FileIcon, FolderIcon, Loader2Icon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { browse } from '@/app/lib/workspace/use-workspace';

export type BrowserMode = 'folders' | 'files';

interface Entry {
  name: string;
  isProject: boolean;
  kind: 'folder' | 'file';
  size?: number;
}

interface Location {
  path: string;
  parent: string | null;
  entries: Entry[];
}

export function FolderBrowser({
  initialPath,
  onPathChange,
  mode = 'folders',
  onChooseFile,
  chosenFile,
}: {
  initialPath?: string;
  onPathChange: (path: string) => void;
  mode?: BrowserMode;
  onChooseFile?: (path: string) => void;
  chosenFile?: string | null;
}) {
  const [location, setLocation] = useState<Location | null>(null);
  const [manualPath, setManualPath] = useState(initialPath ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const typed = useRef(false);

  const go = useCallback(
    async (target?: string) => {
      const id = request.current + 1;
      request.current = id;
      setLoading(true);
      setError(null);
      try {
        const result = await browse(target, mode);
        if (id !== request.current) {
          return;
        }
        typed.current = false;
        setLocation(result);
        setManualPath(result.path);
        onPathChange(result.path);
      } catch (cause) {
        if (id === request.current) {
          setError(cause instanceof Error ? cause.message : 'That folder could not be read.');
        }
      } finally {
        if (id === request.current) {
          setLoading(false);
        }
      }
    },
    [mode, onPathChange]
  );

  useEffect(() => {
    const id = request.current + 1;
    request.current = id;
    void (async () => {
      try {
        const result = await browse(initialPath, mode);
        if (id !== request.current) {
          return;
        }
        setLocation(result);
        setLoading(false);
        if (typed.current) {
          return;
        }
        setManualPath(result.path);
        onPathChange(result.path);
        setError(null);
      } catch (cause) {
        if (id === request.current) {
          setError(cause instanceof Error ? cause.message : 'That folder could not be read.');
        }
      } finally {
        if (id === request.current) {
          setLoading(false);
        }
      }
    })();
  }, [initialPath, mode, onPathChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Go to the parent folder"
          disabled={!location?.parent}
          onClick={() => location?.parent && go(location.parent)}
        >
          <ArrowUpIcon aria-hidden="true" />
        </Button>
        <Input
          aria-label="Folder path"
          value={manualPath}
          onChange={event => {
            typed.current = true;
            setManualPath(event.target.value);
            onPathChange(event.target.value);
          }}
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
        ) : !location || location.entries.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="p-1">
            {location.entries.map(entry => {
              const full = `${location.path}/${entry.name}`;
              const selected = entry.kind === 'file' && chosenFile === full;
              return (
                <li key={entry.name}>
                  <button
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    className={
                      selected
                        ? 'flex w-full items-center gap-2 rounded-sm bg-primary px-2 py-1.5 text-left text-sm text-primary-foreground'
                        : 'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground'
                    }
                    onClick={() => {
                      if (entry.kind === 'file') {
                        onChooseFile?.(full);
                        return;
                      }
                      void go(full);
                    }}
                  >
                    {entry.kind === 'file' ? (
                      <FileIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <FolderIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="truncate">{entry.name}</span>
                    {entry.isProject ? <span className="ml-auto text-xs text-muted-foreground">has maps</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
