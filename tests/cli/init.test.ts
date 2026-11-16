import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareProject } from '@/cli/commands/init';
import { readRegistry } from '@/app/lib/workspace/registry';
import { mapDir } from '@/app/lib/workspace/map-file';

const created: string[] = [];

function sandbox(): { home: string; repo: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-init-'));
  created.push(base);
  const home = path.join(base, 'home');
  const repo = path.join(base, 'demo-repo');
  mkdirSync(home);
  mkdirSync(repo);
  mkdirSync(path.join(repo, '.git'));
  return { home, repo };
}

function digest(folder: string): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(folder, { recursive: true }).map(String).sort()) {
    const target = path.join(folder, file);
    try {
      hash.update(file);
      hash.update(readFileSync(target));
    } catch {
      hash.update(`${file}:dir`);
    }
  }
  return hash.digest('hex');
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('init', () => {
  it('creates one map named after the folder', async () => {
    const { home, repo } = sandbox();

    const prepared = await prepareProject(repo, home);

    expect(prepared.created).toBe(true);
    expect(prepared.mapFile).toBe('demo-repo.tour.json');
    expect(readdirSync(mapDir(repo))).toEqual(['demo-repo.tour.json']);
  });

  it('registers the project once', async () => {
    const { home, repo } = sandbox();

    await prepareProject(repo, home);
    await prepareProject(repo, home);
    const registry = await readRegistry(home);

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0].path).toBe(repo);
  });

  it('changes no file on a second run', async () => {
    const { home, repo } = sandbox();

    await prepareProject(repo, home);
    const before = digest(repo);
    const again = await prepareProject(repo, home);

    expect(again.created).toBe(false);
    expect(digest(repo)).toBe(before);
  });

  it('adopts a hand-written map byte for byte', async () => {
    const { home, repo } = sandbox();
    mkdirSync(mapDir(repo));
    const text =
      '{"version":1,"project":{"name":"demo","createdAt":"2026-01-01T00:00:00.000Z"},"waypoints":[],"edges":[],"tours":[]}\n';
    const file = path.join(mapDir(repo), 'hand-made.tour.json');
    writeFileSync(file, text, 'utf8');

    const prepared = await prepareProject(repo, home);

    expect(prepared.mapFile).toBe('hand-made.tour.json');
    expect(prepared.created).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe(text);
    expect(readdirSync(mapDir(repo))).toEqual(['hand-made.tour.json']);
  });

  it('puts the map at the repository root when started from a subdirectory', async () => {
    const { home, repo } = sandbox();
    const nested = path.join(repo, 'app', 'components');
    mkdirSync(nested, { recursive: true });

    const prepared = await prepareProject(nested, home);

    expect(prepared.root).toBe(repo);
    expect(readdirSync(mapDir(repo))).toEqual(['demo-repo.tour.json']);
    expect(readdirSync(nested)).toEqual([]);
  });

  it('opens the first map by name order', async () => {
    const { home, repo } = sandbox();
    mkdirSync(mapDir(repo));
    for (const file of ['b.tour.json', 'a.tour.json']) {
      writeFileSync(
        path.join(mapDir(repo), file),
        '{"version":1,"project":{"name":"demo","createdAt":"2026-01-01T00:00:00.000Z"},"waypoints":[],"edges":[],"tours":[]}\n',
        'utf8'
      );
    }

    const prepared = await prepareProject(repo, home);

    expect(prepared.mapFile).toBe('a.tour.json');
  });

  it('refuses a map folder that is a file', async () => {
    const { home, repo } = sandbox();
    writeFileSync(path.join(repo, '.ctour'), 'x', 'utf8');

    await expect(prepareProject(repo, home)).rejects.toMatchObject({ code: 'map-dir-blocked' });
  });
});
