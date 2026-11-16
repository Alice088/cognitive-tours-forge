import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertInsideHome } from '@/app/lib/fs/safe-path';
import { applyPlan, buildBundle, parseBundle, planImport, serializeBundle } from '@/app/lib/workspace/bundle';
import type { WorkspaceExportReport, WorkspaceImportReport } from '../lib/report';

const DEFAULT_FILE = 'ctour-workspace.json';

function insideHome(target: string): string {
  try {
    return assertInsideHome(target);
  } catch {
    throw new Error(`${target} is outside your home folder.`);
  }
}

async function ensureFolder(folder: string): Promise<void> {
  const stat = await fs.stat(folder).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`${folder} is not a folder.`);
  }
}

export async function exportWorkspace(options: {
  file?: string;
  cwd: string;
  home: string;
}): Promise<WorkspaceExportReport> {
  const target = insideHome(path.resolve(options.cwd, options.file ?? DEFAULT_FILE));
  await ensureFolder(path.dirname(target));

  const { bundle, recoveredFrom } = await buildBundle(options.home);
  const temporary = `${target}.tmp`;
  try {
    await fs.writeFile(temporary, serializeBundle(bundle), 'utf8');
    await fs.rename(temporary, target);
  } catch {
    await fs.unlink(temporary).catch(() => undefined);
    throw new Error(`${target} cannot be written to.`);
  }

  return {
    path: target,
    projects: bundle.projects.length,
    maps: Object.keys(bundle.maps).length,
    lastView: bundle.lastView ? `${bundle.lastView.project}/${bundle.lastView.mapFile}` : null,
    recoveredFrom,
  };
}

export function parseProjectFlags(values: string[]): Record<string, string> {
  const projects: Record<string, string> = {};
  for (const value of values) {
    const separator = value.indexOf('=');
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(`--project needs name=folder, not ${value}`);
    }
    projects[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return projects;
}

export async function importWorkspace(options: {
  file: string;
  projects: string[];
  skip: string[];
  cwd: string;
  home: string;
}): Promise<WorkspaceImportReport> {
  const target = insideHome(path.resolve(options.cwd, options.file));
  const stat = await fs.stat(target).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error(`There is no workspace file at ${target}.`);
  }
  const text = await fs.readFile(target, 'utf8').catch(() => null);
  if (text === null) {
    throw new Error(`${target} cannot be read.`);
  }

  const bundle = parseBundle(text);
  const flags = parseProjectFlags(options.projects);
  const plan = await planImport(bundle, { projects: flags, skip: options.skip }, options.home);
  const result = await applyPlan(bundle, plan, options.home);

  const counts = new Map<string, number>();
  for (const key of Object.keys(bundle.maps)) {
    const name = key.slice(0, key.indexOf('/'));
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return {
    file: target,
    added: result.added,
    alreadyAdded: result.alreadyAdded,
    missing: result.missing,
    skipped: result.skipped,
    mapsWritten: result.mapsWritten,
    lastViewApplied: result.lastViewApplied,
    lastView: result.lastView ? `${result.lastView.project}/${result.lastView.mapFile}` : null,
    lastViewNote: result.lastViewNote,
    projects: result.projects.map(entry => ({
      name: entry.name,
      action: entry.action,
      folder: entry.folder,
      recorded: entry.recorded,
      text: entry.text,
      maps: counts.get(entry.name) ?? 0,
    })),
  };
}
