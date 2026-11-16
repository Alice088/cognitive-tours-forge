import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildStatus } from '@/cli/commands/status';
import { toStatusJson } from '@/cli/lib/report';
import { emptyDocument, mapDir, writeMap } from '@/app/lib/workspace/map-file';
import { registerProject } from '@/app/lib/workspace/registry';

const created: string[] = [];

function sandbox(): { home: string; base: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-status-'));
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

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('status rows', () => {
  it('reports every project with its counts', async () => {
    const { home, base } = sandbox();
    const first = repo(base, 'alpha');
    const second = repo(base, 'beta');
    await registerProject(first, home);
    await registerProject(second, home);

    const document = emptyDocument('alpha');
    document.waypoints = [
      { id: 'w-1', label: 'One', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-2', label: 'Two', type: 'Risk', position: { x: 10, y: 10 } },
    ];
    document.tours = [{ id: 't-1', name: 'First', stops: [{ waypointId: 'w-1' }] }];
    await writeMap(first, 'main.tour.json', document);

    const { rows, workspaceProblem } = await buildStatus(home);

    expect(workspaceProblem).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'alpha', state: 'ok', maps: 1, waypoints: 2, tours: 1 });
    expect(rows[1]).toMatchObject({ id: 'beta', state: 'no-map', maps: 0, waypoints: 0, tours: 0 });
  });

  it('marks a folder that moved away', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    rmSync(alpha, { recursive: true, force: true });

    const { rows } = await buildStatus(home);

    expect(rows[0]).toMatchObject({ state: 'missing', maps: null, waypoints: null });
    expect(rows[0].problem).toContain('not there');
  });

  it('reports an unreadable map without partial counts', async () => {
    const { home, base } = sandbox();
    const alpha = repo(base, 'alpha');
    await registerProject(alpha, home);
    mkdirSync(mapDir(alpha));
    const document = emptyDocument('alpha');
    document.waypoints = [
      { id: 'w-1', label: 'One', type: 'Goal', position: { x: 0, y: 0 } },
      { id: 'w-2', label: '', type: 'Goal', position: { x: 0, y: 0 } },
    ];
    writeFileSync(path.join(mapDir(alpha), 'main.tour.json'), JSON.stringify(document), 'utf8');

    const { rows } = await buildStatus(home);

    expect(rows[0]).toMatchObject({ state: 'unreadable', maps: 1, waypoints: null, tours: null });
  });

  it('reports an empty workspace', async () => {
    const { home } = sandbox();

    const { rows, workspaceProblem } = await buildStatus(home);

    expect(rows).toEqual([]);
    expect(workspaceProblem).toBeNull();
  });

  it('reports a workspace file that cannot be parsed', async () => {
    const { home } = sandbox();
    writeFileSync(path.join(home, 'workspace.json'), 'not json', 'utf8');

    const { workspaceProblem } = await buildStatus(home);

    expect(workspaceProblem).toContain('workspace');
  });

  it('serialises rows for scripts', async () => {
    const { home, base } = sandbox();
    await registerProject(repo(base, 'alpha'), home);

    const { rows } = await buildStatus(home);
    const parsed = JSON.parse(toStatusJson(rows)) as { version: number; projects: unknown[] };

    expect(parsed.version).toBe(1);
    expect(parsed.projects).toHaveLength(1);
  });

  it('reports six projects in under two seconds', async () => {
    const { home, base } = sandbox();
    for (let index = 0; index < 6; index += 1) {
      const folder = repo(base, `project-${index}`);
      await registerProject(folder, home);
      await writeMap(folder, 'main.tour.json', emptyDocument(`project-${index}`));
    }

    const started = Date.now();
    const { rows } = await buildStatus(home);

    expect(rows).toHaveLength(6);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
