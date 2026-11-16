import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { isMapFile, mapDir, readMapStrict } from '@/app/lib/workspace/map-file';
import { emptyRegistry, parseRegistry, registryPath, workspaceHome } from '@/app/lib/workspace/registry';
import type { DiagnosticReport, DoctorCheck } from '../lib/report';
import { isReportOk } from '../lib/report';

const FIX_WORKSPACE = 'move the file away and run ctour init in each project again';
const FIX_MISSING = 'restore the folder, or remove the project from the workspace';
const FIX_MAP = 'edit the file, or remove it and run ctour init again';
const FIX_LEGACY = 'move its maps into .ctour/ and delete the old folder';
const FIX_WRITE = 'make the folder writable, or move the project';

async function checkWorkspace(home: string): Promise<DoctorCheck> {
  const target = registryPath(home);
  const text = await fs.readFile(target, 'utf8').catch(() => null);
  if (text === null) {
    return { id: 'workspace', target, ok: true, reason: null, fix: null };
  }
  try {
    parseRegistry(text);
    return { id: 'workspace', target, ok: true, reason: null, fix: null };
  } catch {
    return { id: 'workspace', target, ok: false, reason: 'it is not a workspace file', fix: FIX_WORKSPACE };
  }
}

async function checkProject(project: { id: string; path: string }): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const stat = await fs.stat(project.path).catch(() => null);

  if (!stat?.isDirectory()) {
    checks.push({ id: 'project-folder', target: project.path, ok: false, reason: 'it is not there', fix: FIX_MISSING });
    return checks;
  }

  checks.push({ id: 'project-folder', target: project.path, ok: true, reason: null, fix: null });

  const dir = mapDir(project.path);
  const files = (await fs.readdir(dir).catch(() => [] as string[])).filter(isMapFile).sort();

  for (const file of files) {
    const target = path.join(dir, file);
    try {
      await readMapStrict(project.path, file);
      checks.push({ id: 'project-map', target, ok: true, reason: null, fix: null });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'it cannot be read';
      checks.push({ id: 'project-map', target, ok: false, reason, fix: FIX_MAP });
    }
  }

  const legacy = await fs.stat(path.join(project.path, '.tours')).catch(() => null);
  if (legacy) {
    checks.push({
      id: 'leftover-tours',
      target: path.join(project.path, '.tours'),
      ok: false,
      reason: 'maps live in .ctour/ now',
      fix: FIX_LEGACY,
    });
  }

  const writable = await fs
    .access(
      await fs
        .stat(dir)
        .then(() => dir)
        .catch(() => project.path),
      constants.W_OK
    )
    .then(() => true)
    .catch(() => false);

  checks.push({
    id: 'map-write',
    target: dir,
    ok: writable,
    reason: writable ? null : 'it cannot be written to',
    fix: writable ? null : FIX_WRITE,
  });

  return checks;
}

export async function runDoctor(home = workspaceHome()): Promise<DiagnosticReport> {
  const file = registryPath(home);
  const text = await fs.readFile(file, 'utf8').catch(() => null);
  const checks: DoctorCheck[] = [await checkWorkspace(home)];

  let registry = emptyRegistry();
  if (text !== null) {
    try {
      registry = parseRegistry(text);
    } catch {
      registry = emptyRegistry();
    }
  }

  for (const project of registry.projects) {
    checks.push(...(await checkProject(project)));
  }

  return { ok: isReportOk(checks), checks };
}
