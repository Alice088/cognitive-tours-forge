'use client';

import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddProjectDialog } from '@/app/components/shell/AddProjectDialog';
import { CreateMapDialog } from '@/app/components/shell/CreateMapDialog';
import { ProjectGroup } from '@/app/components/shell/ProjectGroup';
import { ThemeToggle } from '@/app/components/shell/ThemeToggle';
import { Button } from '@/app/components/ui/button';
import { createMap } from '@/app/lib/workspace/use-workspace';
import type { ProjectSummary } from '@/app/lib/workspace/types';

export function WorkspaceRail({
  projects,
  activeProjectId,
  activeMapFile,
  onChanged,
}: {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  activeMapFile: string | null;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [mapProject, setMapProject] = useState<ProjectSummary | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-2 py-2">
        <span data-rail-label className="min-w-0 flex-1 truncate text-sm font-semibold">
          Cognitive Tours
        </span>
        <ThemeToggle />
      </div>

      <nav aria-label="Projects and maps" className="min-h-0 flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <p data-rail-label className="px-3 py-2 text-xs text-muted-foreground">
            No projects yet
          </p>
        ) : (
          <ul>
            {projects.map(project => (
              <ProjectGroup
                key={project.id}
                project={project}
                activeMapFile={project.id === activeProjectId ? activeMapFile : null}
                onCreateMap={setMapProject}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          aria-label="Add a project"
          onClick={() => setAdding(true)}
        >
          <PlusIcon aria-hidden="true" />
          <span data-rail-label>Add project</span>
        </Button>
      </div>

      <AddProjectDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={project => {
          onChanged();
          const first = project.maps[0];
          if (first) {
            router.push(`/p/${project.id}/${first.file}`);
          }
        }}
      />

      <CreateMapDialog
        open={mapProject !== null}
        onOpenChange={open => {
          if (!open) {
            setMapProject(null);
          }
        }}
        projectName={mapProject?.name ?? ''}
        onCreate={async name => {
          if (!mapProject) {
            return;
          }
          const result = await createMap(mapProject.id, name);
          onChanged();
          router.push(`/p/${mapProject.id}/${result.map.file}`);
        }}
      />
    </div>
  );
}
