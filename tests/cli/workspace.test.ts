import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyDocument, mapDir, writeMap } from '@/app/lib/workspace/map-file';
import { writeCachedMap } from '@/app/lib/workspace/cache';
import { registerProject, writeLastView } from '@/app/lib/workspace/registry';
import { buildBundle } from '@/app/lib/workspace/bundle';
import { main } from '@/cli/lib/run';
import type { MapDocument } from '@/app/lib/workspace/types';

const created: string[] = [];

function sandbox(): { base: string; home: string; work: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-ws-'));
  created.push(base);
  const home = path.join(base, 'home');
  const work = path.join(base, 'work');
  mkdirSync(home, { recursive: true });
  mkdirSync(work, { recursive: true });
  return { base, home, work };
}

function documentFor(name: string, waypoints: number): MapDocument {
  const document = emptyDocument(name);
  document.waypoints = Array.from({ length: waypoints }, (_, index) => ({
    id: `w-${index + 1}`,
    label: `${name} ${index + 1}`,
    type: 'Goal' as const,
    position: { x: index * 240, y: 80 },
  }));
  return document;
}

async function capture(
  argv: string[],
  overrides: { home: string; cwd?: string }
): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
    out += String(chunk);
    return true;
  });
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
    err += String(chunk);
    return true;
  });
  try {
    const code = await main(argv, {
      home: overrides.home,
      userHome: overrides.home,
      cwd: overrides.cwd ?? overrides.home,
      packageRoot: process.cwd(),
    });
    return { code, out, err };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
}

async function seed(home: string, work: string): Promise<void> {
  for (const name of ['atlas', 'beacon']) {
    const folder = path.join(work, name);
    mkdirSync(folder, { recursive: true });
    const project = await registerProject(folder, home);
    await writeMap(folder, 'main.tour.json', documentFor(name, 2));
    await writeMap(folder, 'risks.tour.json', documentFor(name, 1));
    await writeCachedMap(home, project.id, 'main.tour.json', documentFor(name, 2));
    await writeCachedMap(home, project.id, 'risks.tour.json', documentFor(name, 1));
    if (name === 'atlas') {
      await writeLastView({ projectId: project.id, mapFile: 'main.tour.json', tourId: null, step: 0 }, home);
    }
  }
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('workspace export', () => {
  it('writes one file and says what went in', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');

    const { code, out } = await capture(['workspace', 'export', file], { home });

    expect(code).toBe(0);
    expect(out).toContain(`wrote    ${file}`);
    expect(out).toContain('2 projects, 4 maps, last view atlas/main.tour.json');
    const written = JSON.parse(readFileSync(file, 'utf8')) as { version: number; projects: unknown[]; maps: unknown };
    expect(written.version).toBe(1);
    expect(written.projects).toHaveLength(2);
  });

  it('defaults to ctour-workspace.json in the current folder', async () => {
    const { home, work } = sandbox();

    const { code } = await capture(['workspace', 'export'], { home, cwd: work });

    expect(code).toBe(0);
    expect(readFileSync(path.join(work, 'ctour-workspace.json'), 'utf8')).toContain('"version": 1');
  });

  it('replaces a file the person named', async () => {
    const { home, work } = sandbox();
    const file = path.join(work, 'move.json');
    writeFileSync(file, 'older', 'utf8');

    const { code } = await capture(['workspace', 'export', file], { home });

    expect(code).toBe(0);
    expect(readFileSync(file, 'utf8')).toContain('"version": 1');
  });

  it('refuses a destination outside the home folder', async () => {
    const { home } = sandbox();

    const { code, err } = await capture(['workspace', 'export', '/tmp/ctour-move.json'], { home });

    expect(code).toBe(3);
    expect(err).toContain('outside your home folder');
  });

  it('refuses a folder that is not there', async () => {
    const { home, work } = sandbox();

    const { code } = await capture(['workspace', 'export', path.join(work, 'nowhere', 'move.json')], { home });

    expect(code).toBe(3);
  });

  it('answers as JSON when asked', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');

    const { code, out } = await capture(['workspace', 'export', file, '--json'], { home });

    expect(code).toBe(0);
    expect(JSON.parse(out)).toMatchObject({ path: file, projects: 2, maps: 4 });
  });
});

describe('workspace import', () => {
  it('brings the projects, the missing map and the last view into an empty workspace', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    rmSync(path.join(work, 'atlas', '.ctour', 'risks.tour.json'), { force: true });
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });
    const { code, out } = await capture(['workspace', 'import', file], { home: path.join(target, 'home') });

    expect(code).toBe(0);
    expect(out).toContain('2 projects added, 1 map copied, 0 left out');
    expect(out).toContain('last view  atlas/main.tour.json');
    const cached = readFileSync(path.join(target, 'home', 'cache', 'atlas', 'risks.tour.json'), 'utf8');
    expect(cached).toContain('atlas 1');
  });

  it('adds nothing the second time', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });
    const second = path.join(target, 'home');

    await capture(['workspace', 'import', file], { home: second });
    const { code, out } = await capture(['workspace', 'import', file], { home: second });

    expect(code).toBe(0);
    expect(out).toContain('0 projects added, 0 maps copied, 0 left out');
    expect(out).toContain('already in your workspace');
  });

  it('reports a project whose folder moved and leaves it out', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    rmSync(path.join(work, 'beacon'), { recursive: true, force: true });
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });

    const { code, out } = await capture(['workspace', 'import', file], { home: target });

    expect(code).toBe(1);
    expect(out).toContain('no folder at');
    expect(out).toContain('rerun with --project beacon=');
    expect(out).toContain('1 left out');
  });

  it('takes the folder the person names for a moved project', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    rmSync(path.join(work, 'beacon'), { recursive: true, force: true });
    const restored = path.join(work, 'beacon-restored');
    mkdirSync(restored);
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });

    const { code, out } = await capture(['workspace', 'import', file, '--project', `beacon=${restored}`], {
      home: target,
    });

    expect(code).toBe(0);
    expect(out).toContain('2 projects added');
    expect(readFileSync(path.join(target, 'workspace.json'), 'utf8')).toContain(restored);
  });

  it('leaves out a project the person skipped', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });

    const { code, out } = await capture(['workspace', 'import', file, '--skip', 'beacon'], { home: target });

    expect(code).toBe(1);
    expect(out).toContain('left out as asked');
    expect(readFileSync(path.join(target, 'workspace.json'), 'utf8')).not.toContain('beacon');
  });

  it('refuses a file that is not a workspace file', async () => {
    const { home, work } = sandbox();
    const file = path.join(work, 'notes.json');
    writeFileSync(file, 'not json', 'utf8');

    const { code, err } = await capture(['workspace', 'import', file], { home });

    expect(code).toBe(3);
    expect(err).toContain('not a workspace file');
  });

  it('refuses a file written by a newer version', async () => {
    const { home, work } = sandbox();
    const file = path.join(work, 'future.json');
    writeFileSync(file, JSON.stringify({ version: 2, projects: [], maps: {} }), 'utf8');

    const { code, err } = await capture(['workspace', 'import', file], { home });

    expect(code).toBe(3);
    expect(err).toContain('newer version');
  });

  it('refuses a file that is not there', async () => {
    const { home, work } = sandbox();

    const { code } = await capture(['workspace', 'import', path.join(work, 'nothing.json')], { home });

    expect(code).toBe(3);
  });

  it('answers as JSON when asked', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const file = path.join(work, 'move.json');
    const { bundle } = await buildBundle(home);
    rmSync(path.join(work, 'atlas', '.ctour', 'risks.tour.json'), { force: true });
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    const target = path.join(work, 'fresh');
    mkdirSync(target, { recursive: true });

    const { code, out } = await capture(['workspace', 'import', file, '--json'], { home: target });

    expect(code).toBe(0);
    const report = JSON.parse(out) as { added: number; mapsWritten: number; projects: Array<{ action: string }> };
    expect(report.added).toBe(2);
    expect(report.mapsWritten).toBe(1);
    expect(report.projects.map(entry => entry.action)).toEqual(['add', 'add']);
  });
});

describe('workspace usage', () => {
  it('needs a subcommand', async () => {
    const { home } = sandbox();

    const { code, err } = await capture(['workspace'], { home });

    expect(code).toBe(2);
    expect(err).toContain('export or import');
  });

  it('needs a file to import', async () => {
    const { home } = sandbox();

    const { code } = await capture(['workspace', 'import'], { home });

    expect(code).toBe(2);
  });

  it('refuses --project on export', async () => {
    const { home, work } = sandbox();

    const { code } = await capture(['workspace', 'export', path.join(work, 'x.json'), '--project', 'a=b'], { home });

    expect(code).toBe(2);
  });

  it('refuses a --project that is not name=folder', async () => {
    const { home } = sandbox();

    const { code } = await capture(['workspace', 'import', 'file.json', '--project', 'atlas'], { home });

    expect(code).toBe(2);
  });

  it('lists both subcommands in the help', async () => {
    const { code, out } = await capture(['--help'], { home: sandbox().home });

    expect(code).toBe(0);
    expect(out).toContain('workspace export');
    expect(out).toContain('workspace import');
  });
});

describe('the map folder is untouched by a workspace move', () => {
  it('writes no map files into the project folder', async () => {
    const { home, work } = sandbox();
    await seed(home, work);
    const before = readFileSync(path.join(work, 'atlas', '.ctour', 'main.tour.json'), 'utf8');
    const file = path.join(work, 'move.json');

    await capture(['workspace', 'export', file], { home });

    expect(readFileSync(path.join(work, 'atlas', '.ctour', 'main.tour.json'), 'utf8')).toBe(before);
    expect(readFileSync(path.join(mapDir(path.join(work, 'atlas')), 'main.tour.json'), 'utf8')).toBe(before);
  });
});
