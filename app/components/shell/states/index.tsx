'use client';

import { AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

export function EmptyWorkspace({ onAddProject }: { onAddProject: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-lg font-semibold">No projects yet</h1>
        <p className="text-sm text-muted-foreground">
          A project is a folder on your machine that holds a map of how its code works. Add one to begin.
        </p>
        <Button onClick={onAddProject}>Add project</Button>
      </div>
    </div>
  );
}

export function EmptyProject({ projectName, onCreateMap }: { projectName: string; onCreateMap: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-lg font-semibold">{projectName} has no maps yet</h1>
        <p className="text-sm text-muted-foreground">
          A map holds the waypoints and tours that explain this project. It is stored inside the project, in its .ctour
          directory.
        </p>
        <Button onClick={onCreateMap}>Create map</Button>
      </div>
    </div>
  );
}

export function LoadingSurface({ label }: { label: string }) {
  return (
    <div className="space-y-3 p-6" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-2/3" />
    </div>
  );
}

export function FailedSurface({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <AlertTriangleIcon className="mx-auto size-6 text-destructive" aria-hidden="true" />
        <h2 className="text-lg font-semibold">That did not load</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
