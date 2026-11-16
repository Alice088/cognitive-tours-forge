'use client';

import { AlertTriangleIcon, MapIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import type { ProjectSummary } from '@/app/lib/workspace/types';

export function ProjectGroup({
  project,
  activeMapFile,
  onCreateMap,
}: {
  project: ProjectSummary;
  activeMapFile: string | null;
  onCreateMap: (project: ProjectSummary) => void;
}) {
  return (
    <li className="px-1 py-1" data-project={project.id}>
      <div className="flex items-center gap-1 px-1 py-1">
        <span
          data-rail-label
          className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {project.name}
        </span>
        {project.availability === 'unavailable' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label="Not found on disk" className="text-destructive">
                <AlertTriangleIcon className="size-4" aria-hidden="true" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{project.error ?? 'The folder cannot be reached'}</TooltipContent>
          </Tooltip>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Create a map in ${project.name}`}
          disabled={project.availability === 'unavailable'}
          onClick={() => onCreateMap(project)}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      </div>

      {project.maps.length === 0 ? (
        <p data-rail-label className="px-2 pb-1 text-xs text-muted-foreground">
          {project.availability === 'unavailable' ? (
            'Not reachable'
          ) : (
            <Link href={`/p/${project.id}`} className="underline underline-offset-2">
              No maps yet
            </Link>
          )}
        </p>
      ) : (
        <ul>
          {project.maps.map(map => {
            const active = activeMapFile === map.file;
            return (
              <li key={map.file}>
                <Link
                  href={`/p/${project.id}/${map.file}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-rail-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <MapIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span data-rail-label className="truncate">
                    {map.name}
                  </span>
                  {project.availability === 'unavailable' ? (
                    <span data-rail-wide className="text-xs">
                      read only
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
