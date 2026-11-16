import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ExchangeError, exportMaps, freeName, importOne, previewPath, readSource } from '@/app/lib/workspace/exchange';
import { mapDir, writeMapIfAbsent } from '@/app/lib/workspace/map-file';
import { writeCachedMap } from '@/app/lib/workspace/cache';
import type { MapDocument, ProjectSummary } from '@/app/lib/workspace/types';

const created: string[] = [];

function sandbox(): { base: string; home: string; work: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-exchange-'));
  created.push(base);
  const home = path.join(base, 'home');
  const work = path.join(home, 'work');
  mkdirSync(work, { recursive: true });
  return { base, home, work };
}

function mapDocument(name: string, waypoints: number, tours = 0): MapDocument {
  return {
    version: 1,
    project: { name, createdAt: '2026-11-16T09:00:00.000Z' },
    waypoints: Array.from({ length: waypoints }, (_, index) => ({
      id: `w-${index + 1}`,
      label: `Waypoint ${index + 1}`,
      type: 'Goal' as const,
      position: { x: index * 240, y: 80 },
    })),
    edges: [],
    tours: Array.from({ length: tours }, (_, index) => ({
      id: `t-${index + 1}`,
      name: `Tour ${index + 1}`,
      stops: [{ waypointId: 'w-1' }],
    })),
  };
}

function project(root: string, availability: ProjectSummary['availability'], maps: string[]): ProjectSummary {
  return {
    id: 'atlas',
    name: 'atlas',
    path: root,
    addedAt: '2026-11-16T09:00:00.000Z',
    availability,
    maps: maps.map(file => ({ file, name: file.replace('.tour.json', '') })),
    error: null,
  };
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('copies leave a project', () => {
  it('copies the bytes, not a re-serialised map', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    const destination = path.join(work, 'copies');
    mkdirSync(destination, { recursive: true });
    mkdirSync(mapDir(root), { recursive: true });
    const handFormatted = `{"version":1,"project":{"name":"atlas"},"waypoints":[],"edges":[],"tours":[]}`;
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), handFormatted, 'utf8');

    const result = await exportMaps({
      project: project(root, 'ready', ['main.tour.json']),
      home,
      folder: destination,
      mapFile: 'main.tour.json',
    });

    expect(result.source).toBe('project');
    expect(result.written).toHaveLength(1);
    expect(result.written[0].file).toBe('main.tour.json');
    expect(readFileSync(path.join(destination, 'main.tour.json'), 'utf8')).toBe(handFormatted);
  });

  it('never replaces a file that is already there', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    const destination = path.join(work, 'copies');
    mkdirSync(destination, { recursive: true });
    mkdirSync(mapDir(root), { recursive: true });
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), '{"version":1}', 'utf8');
    writeFileSync(path.join(destination, 'main.tour.json'), 'older', 'utf8');

    const result = await exportMaps({
      project: project(root, 'ready', ['main.tour.json']),
      home,
      folder: destination,
      mapFile: 'main.tour.json',
    });

    expect(result.written[0].file).toBe('main-2.tour.json');
    expect(readFileSync(path.join(destination, 'main.tour.json'), 'utf8')).toBe('older');
    expect(result.skipped[0].file).toBe('main.tour.json');
    expect(result.skipped[0].text).toContain('main-2.tour.json');
  });

  it('uses the last known copy when the folder is unreachable', async () => {
    const { home, work } = sandbox();
    const destination = path.join(work, 'copies');
    mkdirSync(destination, { recursive: true });
    await writeCachedMap(home, 'atlas', 'main.tour.json', mapDocument('atlas', 2));

    const result = await exportMaps({
      project: project(path.join(work, 'gone'), 'unavailable', ['main.tour.json']),
      home,
      folder: destination,
      mapFile: 'main.tour.json',
    });

    expect(result.source).toBe('last-known');
    expect(readFileSync(path.join(destination, 'main.tour.json'), 'utf8')).toContain('Waypoint 2');
  });

  it('exports every map of a project and names one that failed', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    const destination = path.join(work, 'copies');
    mkdirSync(destination, { recursive: true });
    mkdirSync(mapDir(root), { recursive: true });
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), '{"version":1}', 'utf8');
    writeFileSync(path.join(mapDir(root), 'risks.tour.json'), '{"version":1}', 'utf8');

    const result = await exportMaps({
      project: project(root, 'ready', ['gone.tour.json', 'main.tour.json', 'risks.tour.json']),
      home,
      folder: destination,
      all: true,
    });

    expect(result.written.map(entry => entry.file)).toEqual(['main.tour.json', 'risks.tour.json']);
    expect(result.skipped.map(entry => entry.file)).toEqual(['gone.tour.json']);
  });

  it('refuses a destination that is not a folder', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(mapDir(root), { recursive: true });
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), '{"version":1}', 'utf8');
    const file = path.join(work, 'not-a-folder');
    writeFileSync(file, 'x', 'utf8');

    await expect(
      exportMaps({
        project: project(root, 'ready', ['main.tour.json']),
        home,
        folder: file,
        mapFile: 'main.tour.json',
      })
    ).rejects.toMatchObject({ code: 'target-not-folder', status: 409 });
  });

  it('refuses a folder outside the home directory', async () => {
    const { home, work } = sandbox();

    await expect(
      exportMaps({
        project: project(path.join(work, 'atlas'), 'ready', ['main.tour.json']),
        home,
        folder: '/tmp',
        mapFile: 'main.tour.json',
      })
    ).rejects.toMatchObject({ code: 'outside-home', status: 403 });
  });
});

describe('names', () => {
  it('counts up from the name it wanted', () => {
    expect(freeName('main.tour.json', [])).toBe('main.tour.json');
    expect(freeName('main.tour.json', ['main.tour.json'])).toBe('main-2.tour.json');
    expect(freeName('main.tour.json', ['main.tour.json', 'main-2.tour.json'])).toBe('main-3.tour.json');
    expect(freeName('main.tour.json', ['main.tour.json', 'main-3.tour.json'])).toBe('main-2.tour.json');
  });

  it('runs out after a hundred attempts', () => {
    const taken = ['main.tour.json', ...Array.from({ length: 99 }, (_, index) => `main-${index + 2}.tour.json`)];
    expect(freeName('main.tour.json', taken)).toBeNull();
  });
});

describe('a file becomes a map', () => {
  it('derives a name the project accepts and reports the counts', async () => {
    const { work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(mapDir(root), { recursive: true });
    const source = path.join(work, 'Q3 Roadmap.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('q3', 8, 2)), 'utf8');

    const preview = await previewPath(source, root);

    expect(preview.name).toBe('q3-roadmap.tour.json');
    expect(preview.displayName).toBe('q3-roadmap');
    expect(preview.waypoints).toBe(8);
    expect(preview.tours).toBe(2);
    expect(preview.refusal).toBeNull();
    expect(preview.tooBig).toBe(false);
    expect(preview.lossText).toBeNull();
  });

  it('steps aside when the name is taken and says so', async () => {
    const { work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(mapDir(root), { recursive: true });
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), '{"version":1}', 'utf8');
    const source = path.join(work, 'main.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('main', 1)), 'utf8');

    const preview = await previewPath(source, root);

    expect(preview.name).toBe('main-2.tour.json');
    expect(preview.taken).toEqual(['main.tour.json']);
  });

  it('refuses a file that is not a map', async () => {
    const { work } = sandbox();
    const source = path.join(work, 'notes.json');
    writeFileSync(source, 'not json', 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.refusal?.code).toBe('not-json');
    expect(preview.refusal?.text).toContain('notes.json');
  });

  it('tells a broken file from a different kind of file', async () => {
    const { work } = sandbox();
    const source = path.join(work, 'other.json');
    writeFileSync(source, JSON.stringify({ shapes: [] }), 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.refusal?.code).toBe('not-a-map');
  });

  it('refuses a version it does not read', async () => {
    const { work } = sandbox();
    const source = path.join(work, 'future.tour.json');
    writeFileSync(source, JSON.stringify({ ...mapDocument('future', 1), version: 2 }), 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.refusal?.code).toBe('map-version');
  });

  it('refuses a path that is not there and one that is a folder', async () => {
    const { work } = sandbox();

    const missing = await readSource(path.join(work, 'nothing.json'));
    const folder = await readSource(work);

    expect(missing).toMatchObject({ ok: false, code: 'not-found' });
    expect(folder).toMatchObject({ ok: false, code: 'not-a-file' });
  });

  it('refuses a name with nothing usable in it', async () => {
    const { work } = sandbox();
    const source = path.join(work, '???.json');
    writeFileSync(source, JSON.stringify(mapDocument('x', 1)), 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.refusal?.code).toBe('name-unusable');
  });

  it('drops the waypoints whose type this product does not know, and counts them', async () => {
    const { work } = sandbox();
    const document = mapDocument('odd', 8);
    document.waypoints[3] = { ...document.waypoints[3], type: 'Mystery' as never };
    document.waypoints[5] = { ...document.waypoints[5], type: 'Ritual' as never };
    const source = path.join(work, 'odd.tour.json');
    writeFileSync(source, JSON.stringify(document), 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.waypoints).toBe(6);
    expect(preview.dropped.unknownTypes).toBe(2);
    expect(preview.dropped.droppedWaypoints).toBe(2);
    expect(preview.lossText).toContain('2 waypoints');
  });

  it('says a map is beyond what the product is built for without refusing it', async () => {
    const { work } = sandbox();
    const source = path.join(work, 'big.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('big', 251)), 'utf8');

    const preview = await previewPath(source, null);

    expect(preview.tooBig).toBe(true);
    expect(preview.refusal).toBeNull();
  });
});

describe('a map arrives in a project', () => {
  it('writes the map and the last known copy', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(root, { recursive: true });
    const source = path.join(work, 'main.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('main', 3, 1)), 'utf8');

    const outcome = await importOne({
      project: project(root, 'ready', []),
      home,
      sourcePath: source,
    });

    expect(outcome.added[0]).toMatchObject({ file: 'main.tour.json', waypoints: 3, tours: 1 });
    expect(readdirSync(mapDir(root))).toContain('main.tour.json');
    expect(readFileSync(path.join(home, 'cache', 'atlas', 'main.tour.json'), 'utf8')).toContain('Waypoint 3');
  });

  it('adds a second copy under a free name and leaves the first alone', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(root, { recursive: true });
    const source = path.join(work, 'main.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('main', 1)), 'utf8');

    await importOne({ project: project(root, 'ready', []), home, sourcePath: source });
    const before = readFileSync(path.join(mapDir(root), 'main.tour.json'), 'utf8');
    const second = await importOne({ project: project(root, 'ready', []), home, sourcePath: source });

    expect(second.added[0].file).toBe('main-2.tour.json');
    expect(readFileSync(path.join(mapDir(root), 'main.tour.json'), 'utf8')).toBe(before);
  });

  it('leaves the folder identical when the file cannot become a map', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(root, { recursive: true });
    const source = path.join(work, 'notes.json');
    writeFileSync(source, 'not json', 'utf8');
    const before = readdirSync(root).sort();

    const outcome = await importOne({ project: project(root, 'ready', []), home, sourcePath: source });

    expect(outcome.added).toEqual([]);
    expect(outcome.skipped[0].text).toContain('notes.json');
    expect(readdirSync(root).sort()).toEqual(before);
  });

  it('writes nothing until the losses are confirmed', async () => {
    const { home, work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(root, { recursive: true });
    const document = mapDocument('odd', 8);
    document.waypoints[0] = { ...document.waypoints[0], type: 'Mystery' as never };
    const source = path.join(work, 'odd.tour.json');
    writeFileSync(source, JSON.stringify(document), 'utf8');

    const refused = await importOne({
      project: project(root, 'ready', []),
      home,
      sourcePath: source,
    }).catch(error => error as ExchangeError);

    expect(refused).toBeInstanceOf(ExchangeError);
    expect((refused as ExchangeError).code).toBe('losses-not-accepted');
    expect((refused as ExchangeError).status).toBe(409);
    expect(JSON.parse((refused as ExchangeError).detail ?? '{}').dropped.unknownTypes).toBe(1);
    expect(readdirSync(root)).toEqual([]);

    const accepted = await importOne({
      project: project(root, 'ready', []),
      home,
      sourcePath: source,
      acceptLosses: true,
    });

    expect(accepted.added[0].waypoints).toBe(7);
    expect(readdirSync(mapDir(root))).toEqual(['odd.tour.json']);
  });

  it('refuses a project folder that cannot be reached', async () => {
    const { home, work } = sandbox();
    const source = path.join(work, 'main.tour.json');
    writeFileSync(source, JSON.stringify(mapDocument('main', 1)), 'utf8');

    await expect(
      importOne({
        project: project(path.join(work, 'gone'), 'unavailable', []),
        home,
        sourcePath: source,
      })
    ).rejects.toMatchObject({ code: 'project-unavailable', status: 409 });
  });

  it('never replaces an existing file at the moment of writing', async () => {
    const { work } = sandbox();
    const root = path.join(work, 'atlas');
    mkdirSync(mapDir(root), { recursive: true });
    writeFileSync(path.join(mapDir(root), 'main.tour.json'), 'kept', 'utf8');

    const created = await writeMapIfAbsent(root, 'main.tour.json', mapDocument('main', 1));

    expect(created).toBeNull();
    expect(readFileSync(path.join(mapDir(root), 'main.tour.json'), 'utf8')).toBe('kept');
  });
});

describe('the exchange never reaches the network', () => {
  it('imports no client that could', () => {
    const text = readFileSync(path.join(process.cwd(), 'app/lib/workspace/exchange.ts'), 'utf8');
    const bundle = readFileSync(path.join(process.cwd(), 'app/lib/workspace/bundle.ts'), 'utf8');

    for (const source of [text, bundle]) {
      expect(source).not.toMatch(/\bfetch\(/);
      expect(source).not.toMatch(/from 'node:(http|https|net|dns)'/);
    }
  });
});
