import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runDoctor } from '@/cli/commands/doctor';
import { doctorLines } from '@/cli/lib/report';
import { emptyDocument, mapDir, writeMap } from '@/app/lib/workspace/map-file';
import { registerProject } from '@/app/lib/workspace/registry';

const created: string[] = [];

function sandbox(): { home: string; base: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-doctor-'));
  created.push(base);
  const home = path.join(base, 'home');
  mkdirSync(home);
  return { home, base };
}

function repo(base: string, name: string): string {
  const folder = path.join(base, name);
  mkdirSync(folder, { recursive: true });
  return folder;
}

function digest(folder: string): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(folder, { recursive: true }).map(String).sort()) {
    const target = path.join(folder, file);
    hash.update(file);
    try {
      hash.update(readFileSync(target));
    } catch {
      hash.update('dir');
    }
  }
  return hash.digest('hex');
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('doctor', () => {
  it('passes a healthy workspace', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    await writeMap(alpha, 'main.tour.json', emptyDocument('alpha'));

    const report = await runDoctor(home);

    expect(report.ok).toBe(true);
    expect(report.checks.every(check => check.ok)).toBe(true);
  });

  it('names a map that would lose a waypoint', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    mkdirSync(mapDir(alpha));
    const document = emptyDocument('alpha');
    document.waypoints = [
      { id: 'w-1', label: 'Kept', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-2', label: '', type: 'Goal', position: { x: 0, y: 0 } },
    ];
    writeFileSync(path.join(mapDir(alpha), 'main.tour.json'), JSON.stringify(document), 'utf8');

    const report = await runDoctor(home);
    const failing = report.checks.filter(check => !check.ok);

    expect(report.ok).toBe(false);
    expect(failing).toHaveLength(1);
    expect(failing[0]).toMatchObject({ id: 'project-map', ok: false });
    expect(failing[0].target).toBe(path.join(mapDir(alpha), 'main.tour.json'));
    expect(failing[0].fix).toBeTruthy();
    expect(doctorLines(report).join('\n')).toContain('fix:');
  });

  it('names a folder that moved away', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    rmSync(alpha, { recursive: true, force: true });

    const report = await runDoctor(home);
    const failing = report.checks.filter(check => !check.ok);

    expect(failing.map(check => check.id)).toContain('project-folder');
    expect(failing[0].target).toBe(alpha);
  });

  it('reports a damaged workspace and leaves the file alone', async () => {
    const { home } = sandbox();
    const file = path.join(home, 'workspace.json');
    writeFileSync(file, 'not json', 'utf8');
    const before = digest(path.dirname(home));

    const report = await runDoctor(home);

    expect(report.checks[0]).toMatchObject({ id: 'workspace', ok: false, target: file });
    expect(readdirSync(home)).toEqual(['workspace.json']);
    expect(digest(path.dirname(home))).toBe(before);
  });

  it('reports a leftover .tours folder', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    await writeMap(alpha, 'main.tour.json', emptyDocument('alpha'));
    mkdirSync(path.join(alpha, '.tours'));

    const report = await runDoctor(home);

    expect(report.checks.map(check => check.id)).toContain('leftover-tours');
    expect(report.ok).toBe(false);
  });

  it('changes nothing on any run', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    await writeMap(alpha, 'main.tour.json', emptyDocument('alpha'));
    writeFileSync(path.join(mapDir(alpha), 'broken.tour.json'), 'not json', 'utf8');
    const before = digest(base);

    await runDoctor(home);

    expect(digest(base)).toBe(before);
  });
});
