'use client';

import { ArrowUpIcon, FolderIcon, Loader2Icon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { browse } from '@/app/lib/workspace/use-workspace';

interface Entry {
  name: string;
  isProject: boolean;
}

interface Location {
  path: string;
  parent: string | null;
  entries: Entry[];
}

export function FolderBrowser({
  initialPath,
  onPathChange,
}: {
  initialPath?: string;
  onPathChange: (path: string) => void;
}) {
  const [location, setLocation] = useState<Location | null>(null);
  const [manualPath, setManualPath] = useState(initialPath ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const request = useRef(0);

  const go = useCallback(
    async (target?: string) => {
      const id = request.current + 1;
      request.current = id;
      setLoading(true);
      setError(null);
      try {
        const result = await browse(target);
        if (id !== request.current) {
          return;
        }
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
    [onPathChange]
  );

  useEffect(() => {
    const id = request.current + 1;
    request.current = id;
    void (async () => {
      try {
        const result = await browse(initialPath);
        if (id !== request.current) {
          return;
        }
        setLocation(result);
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
  }, [initialPath, onPathChange]);

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
        ) : !location || location.entries.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No folders here.</p>
        ) : (
          <ul className="p-1">
            {location.entries.map(entry => (
              <li key={entry.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => go(`${location.path}/${entry.name}`)}
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
    </div>
  );
}
