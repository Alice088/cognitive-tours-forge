import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BundleError,
  applyPlan,
  buildBundle,
  parseBundle,
  planImport,
  serializeBundle,
} from '@/app/lib/workspace/bundle';
import { writeCachedMap } from '@/app/lib/workspace/cache';
import { emptyDocument, mapDir, writeMap } from '@/app/lib/workspace/map-file';
import { readRegistryWithNotice, registerProject, writeLastView } from '@/app/lib/workspace/registry';
import type { MapDocument } from '@/app/lib/workspace/types';

const created: string[] = [];

function sandbox(): { base: string; home: string; work: string } {
  const base = mkdtempSync(path.join(homedir(), '.ctour-bundle-'));
  created.push(base);
  const home = path.join(base, 'home');
  const work = path.join(home, 'work');
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

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('a workspace becomes one file', () => {
  it('carries the projects, the last known maps and the last view by name', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    const beacon = path.join(work, 'beacon');
    mkdirSync(atlas, { recursive: true });
    mkdirSync(beacon, { recursive: true });
    const registered = await registerProject(atlas, home);
    await registerProject(beacon, home);
    await writeMap(atlas, 'main.tour.json', documentFor('atlas', 3));
    await writeCachedMap(home, registered.id, 'main.tour.json', documentFor('atlas', 3));
    await writeCachedMap(home, registered.id, 'risks.tour.json', documentFor('atlas', 1));
    await writeLastView({ projectId: registered.id, mapFile: 'main.tour.json', tourId: null, step: 0 }, home);

    const { bundle, recoveredFrom } = await buildBundle(home);

    expect(recoveredFrom).toBeNull();
    expect(bundle.projects.map(entry => entry.name)).toEqual(['atlas', 'beacon']);
    expect(Object.keys(bundle.maps).sort()).toEqual(['atlas/main.tour.json', 'atlas/risks.tour.json']);
    expect(bundle.lastView).toMatchObject({ project: 'atlas', mapFile: 'main.tour.json' });
  });

  it('writes the keys in a fixed order and only exportedAt differs between runs', async () => {
    const { home } = sandbox();

    const first = await buildBundle(home);
    const second = await buildBundle(home);
    const text = serializeBundle(first.bundle);
    const again = serializeBundle({ ...second.bundle, exportedAt: first.bundle.exportedAt });

    expect(text).toBe(again);
    expect(text.indexOf('"version"')).toBeLessThan(text.indexOf('"exportedAt"'));
    expect(text.indexOf('"exportedAt"')).toBeLessThan(text.indexOf('"projects"'));
    expect(text.indexOf('"projects"')).toBeLessThan(text.indexOf('"lastView"'));
    expect(text.indexOf('"lastView"')).toBeLessThan(text.indexOf('"maps"'));
  });

  it('refuses a file it does not understand', () => {
    expect(() => parseBundle('not json')).toThrowError(BundleError);
    expect(() => parseBundle('[]')).toThrowError(/workspace file/);
    expect(() => parseBundle(JSON.stringify({ version: 1 }))).toThrowError(/workspace file/);
    expect(() => parseBundle(JSON.stringify({ version: 2, projects: [], maps: {} }))).toThrowError(/newer version/);
  });

  it('reads a version below the current one', () => {
    const bundle = parseBundle(JSON.stringify({ version: 1, projects: [], maps: {}, lastView: null }));

    expect(bundle.version).toBe(1);
    expect(bundle.projects).toEqual([]);
    expect(bundle.lastView).toBeNull();
  });
});

describe('a workspace file arrives on another machine', () => {
  it('adds every project, copies the maps and restores the last view', async () => {
    const { home, work } = sandbox();
    const source = path.join(work, 'atlas');
    const beacon = path.join(work, 'beacon');
    mkdirSync(source, { recursive: true });
    mkdirSync(beacon, { recursive: true });
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        exportedAt: '2026-11-16T09:00:00.000Z',
        projects: [
          { name: 'atlas', path: source, addedAt: '2026-11-16T09:00:00.000Z' },
          { name: 'beacon', path: beacon, addedAt: '2026-11-16T09:00:00.000Z' },
        ],
        lastView: { project: 'atlas', mapFile: 'main.tour.json', tourId: null, step: 0 },
        maps: {
          'atlas/main.tour.json': documentFor('atlas', 2),
          'beacon/main.tour.json': documentFor('beacon', 4),
        },
      })
    );

    const plan = await planImport(bundle, { projects: {}, skip: [] }, home);
    const result = await applyPlan(bundle, plan, home);

    expect(result.added).toBe(2);
    expect(result.mapsWritten).toBe(2);
    expect(result.lastViewApplied).toBe(true);
    const { registry } = await readRegistryWithNotice(home);
    expect(registry.projects.map(project => project.name).sort()).toEqual(['atlas', 'beacon']);
    expect(registry.lastView?.mapFile).toBe('main.tour.json');
  });

  it('adds nothing twice', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    mkdirSync(atlas);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas', path: atlas, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: { 'atlas/main.tour.json': documentFor('atlas', 1) },
      })
    );

    const first = await applyPlan(bundle, await planImport(bundle, { projects: {}, skip: [] }, home), home);
    const second = await applyPlan(bundle, await planImport(bundle, { projects: {}, skip: [] }, home), home);

    expect(first.added).toBe(1);
    expect(second.added).toBe(0);
    expect(second.alreadyAdded).toBe(1);
    expect(second.mapsWritten).toBe(0);
    const { registry } = await readRegistryWithNotice(home);
    expect(registry.projects).toHaveLength(1);
  });

  it('leaves a project out when its folder is gone and names the rerun', async () => {
    const { home, work } = sandbox();
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'zenith', path: path.join(work, 'gone'), addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: {}, skip: [] }, home);

    expect(plan.projects[0]).toMatchObject({ action: 'missing-folder', folder: null });
    expect(plan.projects[0].text).toContain(path.join(work, 'gone'));
  });

  it('points a missing folder at the folder the person named', async () => {
    const { home, work } = sandbox();
    const target = path.join(work, 'zenith-here');
    mkdirSync(target);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'zenith', path: path.join(work, 'gone'), addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: { zenith: target }, skip: [] }, home);
    const result = await applyPlan(bundle, plan, home);

    expect(plan.projects[0]).toMatchObject({ action: 'add', folder: target });
    expect(result.added).toBe(1);
    const { registry } = await readRegistryWithNotice(home);
    expect(registry.projects[0].path).toBe(target);
  });

  it('keeps a registered project and moves it to the named folder', async () => {
    const { home, work } = sandbox();
    const old = path.join(work, 'atlas-old');
    const fresh = path.join(work, 'atlas-new');
    mkdirSync(old);
    mkdirSync(fresh);
    await registerProject(old, home);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas-old', path: old, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: { 'atlas-old': fresh }, skip: [] }, home);
    const result = await applyPlan(bundle, plan, home);

    expect(plan.projects[0].action).toBe('relink');
    expect(result.added).toBe(1);
    const { registry } = await readRegistryWithNotice(home);
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0].path).toBe(fresh);
  });

  it('leaves out a project the person skipped', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    mkdirSync(atlas);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas', path: atlas, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: {}, skip: ['atlas'] }, home);
    const result = await applyPlan(bundle, plan, home);

    expect(plan.projects[0].action).toBe('skipped');
    expect(result.skipped).toBe(1);
    const { registry } = await readRegistryWithNotice(home);
    expect(registry.projects).toEqual([]);
  });

  it('reports a flag it could not use', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    mkdirSync(atlas);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas', path: atlas, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: { atlas: path.join(work, 'nowhere') }, skip: [] }, home);

    expect(plan.projects[0]).toMatchObject({ action: 'add', folder: atlas });
    expect(plan.projects[1]).toMatchObject({ action: 'ignored-flag' });
  });

  it('never overwrites a map the folder holds', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    mkdirSync(mapDir(atlas), { recursive: true });
    writeFileSync(path.join(mapDir(atlas), 'main.tour.json'), JSON.stringify(documentFor('from-folder', 9)), 'utf8');
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas', path: atlas, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: null,
        maps: { 'atlas/main.tour.json': documentFor('travelled', 1) },
      })
    );

    const plan = await planImport(bundle, { projects: {}, skip: [] }, home);
    const result = await applyPlan(bundle, plan, home);

    expect(plan.mapsToCache).toEqual([]);
    expect(result.mapsWritten).toBe(0);
    expect(readFileSync(path.join(mapDir(atlas), 'main.tour.json'), 'utf8')).toContain('from-folder');
  });

  it('keeps the last view when the map did not come along', async () => {
    const { home, work } = sandbox();
    const atlas = path.join(work, 'atlas');
    mkdirSync(atlas);
    const bundle = parseBundle(
      JSON.stringify({
        version: 1,
        projects: [{ name: 'atlas', path: atlas, addedAt: '2026-11-16T09:00:00.000Z' }],
        lastView: { project: 'atlas', mapFile: 'main.tour.json', tourId: null, step: 0 },
        maps: {},
      })
    );

    const plan = await planImport(bundle, { projects: {}, skip: [] }, home);

    expect(plan.lastView).toBeNull();
    expect(plan.lastViewNote).toContain('kept');
  });

  it('reports a damaged workspace file without losing what is left', async () => {
    const { home } = sandbox();
    mkdirSync(home, { recursive: true });
    writeFileSync(path.join(home, 'workspace.json'), 'not json', 'utf8');

    const { bundle, recoveredFrom } = await buildBundle(home);

    expect(recoveredFrom).toContain('corrupt-');
    expect(bundle.projects).toEqual([]);
  });
});
