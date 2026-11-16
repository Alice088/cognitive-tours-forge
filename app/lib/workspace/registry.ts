import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ProjectRef, ViewState, WorkspaceRegistry } from '@/app/lib/workspace/types';

export function workspaceHome(): string {
  const configured = process.env.CTOUR_HOME;
  return configured ? path.resolve(configured) : path.join(homedir(), '.ctour');
}

export function registryPath(home: string = workspaceHome()): string {
  return path.join(home, 'workspace.json');
}

export function emptyRegistry(): WorkspaceRegistry {
  return { version: 1, projects: [] };
}

export type RegistryRead = { registry: WorkspaceRegistry; recoveredFrom: string | null };

export async function readRegistryWithNotice(home: string = workspaceHome()): Promise<RegistryRead> {
  const file = registryPath(home);
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return { registry: emptyRegistry(), recoveredFrom: null };
  }
  try {
    return { registry: parseRegistry(text), recoveredFrom: null };
  } catch {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const recoveredFrom = `${file}.corrupt-${stamp}`;
    await fs.rename(file, recoveredFrom).catch(() => undefined);
    return { registry: emptyRegistry(), recoveredFrom };
  }
}

export async function readRegistry(home: string = workspaceHome()): Promise<WorkspaceRegistry> {
  const { registry } = await readRegistryWithNotice(home);
  return registry;
}

export function parseRegistry(text: string): WorkspaceRegistry {
  const parsed = JSON.parse(text) as Partial<WorkspaceRegistry>;
  if (!Array.isArray(parsed.projects)) {
    throw new Error('registry has no projects array');
  }
  const projects: ProjectRef[] = [];
  for (const entry of parsed.projects) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.path !== 'string') {
      continue;
    }
    projects.push({
      id: entry.id,
      path: path.resolve(entry.path),
      name: typeof entry.name === 'string' && entry.name ? entry.name : path.basename(entry.path),
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : new Date().toISOString(),
    });
  }
  return { version: 1, projects, lastView: normalizeView(parsed.lastView) };
}

export async function writeRegistry(registry: WorkspaceRegistry, home: string = workspaceHome()): Promise<void> {
  await fs.mkdir(home, { recursive: true });
  const file = registryPath(home);
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
}

export function uniqueId(candidate: string, taken: string[]): string {
  const base = candidate || 'project';
  if (!taken.includes(base)) {
    return base;
  }
  let index = 2;
  while (taken.includes(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export function slugifyProject(target: string): string {
  return path
    .basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function registerProject(target: string, home: string = workspaceHome()): Promise<ProjectRef> {
  const registry = await readRegistry(home);
  const resolved = path.resolve(target);
  const existing = registry.projects.find(project => project.path === resolved);
  if (existing) {
    return existing;
  }
  const project: ProjectRef = {
    id: uniqueId(
      slugifyProject(resolved),
      registry.projects.map(entry => entry.id)
    ),
    path: resolved,
    name: path.basename(resolved),
    addedAt: new Date().toISOString(),
  };
  registry.projects.push(project);
  await writeRegistry(registry, home);
  return project;
}

export async function removeProject(projectId: string, home: string = workspaceHome()): Promise<void> {
  const registry = await readRegistry(home);
  registry.projects = registry.projects.filter(project => project.id !== projectId);
  if (registry.lastView?.projectId === projectId) {
    delete registry.lastView;
  }
  await writeRegistry(registry, home);
}

export async function relinkProject(
  projectId: string,
  target: string,
  home: string = workspaceHome()
): Promise<ProjectRef> {
  const registry = await readRegistry(home);
  const project = registry.projects.find(entry => entry.id === projectId);
  if (!project) {
    throw new Error('unknown project');
  }
  project.path = path.resolve(target);
  await writeRegistry(registry, home);
  return project;
}

export async function writeLastView(view: ViewState | null, home: string = workspaceHome()): Promise<void> {
  const registry = await readRegistry(home);
  if (view) {
    registry.lastView = normalizeView(view);
  } else {
    delete registry.lastView;
  }
  await writeRegistry(registry, home);
}

function normalizeView(value: unknown): ViewState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const view = value as Record<string, unknown>;
  if (typeof view.projectId !== 'string' || typeof view.mapFile !== 'string') {
    return undefined;
  }
  return {
    projectId: view.projectId,
    mapFile: view.mapFile,
    tourId: typeof view.tourId === 'string' ? view.tourId : null,
    step: typeof view.step === 'number' && view.step >= 0 ? Math.floor(view.step) : 0,
  };
}
