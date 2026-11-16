import { promises as fs } from 'node:fs';
import path from 'node:path';
import { emptyDocument, isMapFile, mapFileName, writeMap } from '@/app/lib/workspace/map-file';
import { listProjects, addProject, WorkspaceError } from '@/app/lib/workspace/service';
import { readRegistryWithNotice, workspaceHome } from '@/app/lib/workspace/registry';
import { resolveTarget } from '../lib/target';
import type { ProjectSummary } from '@/app/lib/workspace/types';

export type PreparedProject = {
  root: string;
  mapFile: string;
  created: boolean;
  project: ProjectSummary;
  recoveredFrom: string | null;
};

async function mapsIn(mapDir: string): Promise<string[]> {
  const entries = await fs.readdir(mapDir).catch(() => [] as string[]);
  return entries.filter(isMapFile).sort();
}

async function samePath(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([fs.realpath(left).catch(() => left), fs.realpath(right).catch(() => right)]);
  return a === b;
}

async function registeredProject(root: string, home: string): Promise<ProjectSummary | null> {
  const projects = await listProjects(home);
  for (const project of projects) {
    if (await samePath(project.path, root)) {
      return project;
    }
  }
  return null;
}

async function register(root: string, home: string): Promise<ProjectSummary> {
  try {
    return await addProject(root, home, null);
  } catch (error) {
    if (error instanceof WorkspaceError && error.code === 'already-registered') {
      const existing = await registeredProject(root, home);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

export async function prepareProject(folder: string, home = workspaceHome()): Promise<PreparedProject> {
  const target = await resolveTarget(folder, 'write');
  const { recoveredFrom } = await readRegistryWithNotice(home);
  const project = await register(target.root, home);
  const existing = await mapsIn(target.mapDir);

  if (existing.length > 0) {
    return { root: target.root, mapFile: existing[0], created: false, project, recoveredFrom };
  }

  const mapFile = mapFileName(path.basename(target.root));
  await writeMap(target.root, mapFile, emptyDocument(project.name));
  return { root: target.root, mapFile, created: true, project, recoveredFrom };
}
