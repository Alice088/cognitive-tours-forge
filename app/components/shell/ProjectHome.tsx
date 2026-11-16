'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/app/components/shell/AppShell';
import { CreateMapDialog } from '@/app/components/shell/CreateMapDialog';
import { WorkspaceRail } from '@/app/components/shell/WorkspaceRail';
import { EmptyProject, FailedSurface, LoadingSurface } from '@/app/components/shell/states';
import { createMap, useWorkspace } from '@/app/lib/workspace/use-workspace';

export function ProjectHome({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { snapshot, status, failure, refresh } = useWorkspace();
  const [creating, setCreating] = useState(false);

  const project = snapshot?.projects.find(item => item.id === projectId) ?? null;
  const firstMap = project?.maps[0] ?? null;

  useEffect(() => {
    if (firstMap) {
      router.replace(`/p/${projectId}/${firstMap.file}`);
    }
  }, [firstMap, projectId, router]);

  const canvas =
    status === 'loading' ? (
      <LoadingSurface label="Reading this project" />
    ) : status === 'failed' ? (
      <FailedSurface message={failure ?? 'This project could not be read.'} onRetry={refresh} />
    ) : project ? (
      <EmptyProject projectName={project.name} onCreateMap={() => setCreating(true)} />
    ) : (
      <FailedSurface message="That project is no longer in your workspace." onRetry={refresh} />
    );

  return (
    <div className="flex h-dvh w-full flex-col">
      <div className="min-h-0 flex-1">
        <AppShell
          rail={
            <WorkspaceRail
              projects={snapshot?.projects ?? []}
              activeProjectId={projectId}
              activeMapFile={null}
              onChanged={refresh}
            />
          }
          canvas={canvas}
          dock={<p className="px-3 py-2 text-xs text-muted-foreground">No map open</p>}
          inspector={<p className="p-3 text-sm text-muted-foreground">Open a map to see what you can edit.</p>}
          inspectorOpen={false}
          onInspectorOpenChange={() => undefined}
          announcement={project ? `${project.name} has no maps yet` : 'Project unavailable'}
        />
      </div>

      <CreateMapDialog
        open={creating}
        onOpenChange={setCreating}
        projectName={project?.name ?? ''}
        onCreate={async name => {
          if (!project) {
            return;
          }
          const result = await createMap(project.id, name);
          router.push(`/p/${project.id}/${result.map.file}`);
        }}
      />
    </div>
  );
}
