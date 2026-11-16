'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddProjectDialog } from '@/app/components/shell/AddProjectDialog';
import { CreateMapDialog } from '@/app/components/shell/CreateMapDialog';
import { EmptyProject, EmptyWorkspace, FailedSurface, LoadingSurface } from '@/app/components/shell/states';
import { createMap, useWorkspace } from '@/app/lib/workspace/use-workspace';

export function HomeView() {
  const router = useRouter();
  const { snapshot, status, failure, refresh } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    const stored = snapshot.lastView;
    if (stored) {
      const project = snapshot.projects.find(item => item.id === stored.projectId);
      if (project?.maps.some(map => map.file === stored.mapFile)) {
        router.replace(`/p/${stored.projectId}/${stored.mapFile}?tour=${stored.tourId ?? ''}&step=${stored.step}`);
        return;
      }
    }
    const first = snapshot.projects.find(project => project.maps.length > 0);
    if (first) {
      router.replace(`/p/${first.id}/${first.maps[0].file}`);
    }
  }, [snapshot, router]);

  if (status === 'loading') {
    return <LoadingSurface label="Reading your workspace" />;
  }

  if (status === 'failed') {
    return <FailedSurface message={failure ?? 'The workspace could not be read.'} onRetry={refresh} />;
  }

  const projects = snapshot?.projects ?? [];
  const withMaps = projects.filter(project => project.maps.length > 0);
  const first = projects[0];

  return (
    <div className="flex h-dvh items-center justify-center bg-background text-foreground">
      {projects.length === 0 ? (
        <EmptyWorkspace onAddProject={() => setAdding(true)} />
      ) : withMaps.length === 0 && first ? (
        <EmptyProject projectName={first.name} onCreateMap={() => setCreating(true)} />
      ) : (
        <LoadingSurface label="Opening your last map" />
      )}
      <CreateMapDialog
        open={creating}
        onOpenChange={setCreating}
        projectName={first?.name ?? ''}
        onCreate={async name => {
          if (!first) {
            return;
          }
          const result = await createMap(first.id, name);
          router.push(`/p/${first.id}/${result.map.file}`);
        }}
      />

      <AddProjectDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={project => {
          refresh();
          const first = project.maps[0];
          if (first) {
            router.push(`/p/${project.id}/${first.file}`);
          }
        }}
      />
    </div>
  );
}
