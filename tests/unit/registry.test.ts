import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readRegistry,
  registerProject,
  registryPath,
  removeProject,
  uniqueId,
  writeLastView,
  writeRegistry,
} from '@/app/lib/workspace/registry';

const home = mkdtempSync(path.join(tmpdir(), 'ctour-registry-'));

describe('workspace registry', () => {
  it('starts empty when there is no file', async () => {
    const registry = await readRegistry(home);
    expect(registry.projects).toEqual([]);
  });

  it('registers a project with a slugged unique id', async () => {
    const first = await registerProject(path.join(home, 'My Project'), home);
    const second = await registerProject(path.join(home, 'My Project!'), home);
    expect(first.id).toBe('my-project');
    expect(second.id).toBe('my-project-2');
    expect(readFileSync(registryPath(home), 'utf8')).toContain('my-project-2');
  });

  it('returns the existing entry when the same path is registered twice', async () => {
    const one = await registerProject(path.join(home, 'again'), home);
    const two = await registerProject(path.join(home, 'again'), home);
    expect(two.id).toBe(one.id);
    const registry = await readRegistry(home);
    expect(registry.projects.filter(project => project.path === one.path)).toHaveLength(1);
  });

  it('stores the last view and drops it with its project', async () => {
    const project = await registerProject(path.join(home, 'viewed'), home);
    await writeLastView({ projectId: project.id, mapFile: 'a.tour.json', tourId: 't-1', step: 3 }, home);
    let registry = await readRegistry(home);
    expect(registry.lastView).toEqual({
      projectId: project.id,
      mapFile: 'a.tour.json',
      tourId: 't-1',
      step: 3,
    });
    await removeProject(project.id, home);
    registry = await readRegistry(home);
    expect(registry.lastView).toBeUndefined();
  });

  it('recovers from unparseable content without overwriting it', async () => {
    const brokenHome = mkdtempSync(path.join(tmpdir(), 'ctour-broken-'));
    writeFileSync(registryPath(brokenHome), '{ not json', 'utf8');
    const registry = await readRegistry(brokenHome);
    expect(registry.projects).toEqual([]);
    const entries = (await import('node:fs')).readdirSync(brokenHome);
    expect(entries.some(entry => entry.startsWith('workspace.json.corrupt-'))).toBe(true);
  });

  it('writes atomically and leaves no temporary behind', async () => {
    const atomicHome = mkdtempSync(path.join(tmpdir(), 'ctour-atomic-'));
    await writeRegistry({ version: 1, projects: [] }, atomicHome);
    const entries = (await import('node:fs')).readdirSync(atomicHome);
    expect(entries).toEqual(['workspace.json']);
  });

  it('clamps an out-of-range step to zero on read', async () => {
    const viewHome = mkdtempSync(path.join(tmpdir(), 'ctour-view-'));
    writeFileSync(
      registryPath(viewHome),
      JSON.stringify({
        version: 1,
        projects: [],
        lastView: { projectId: 'p', mapFile: 'm.tour.json', tourId: null, step: -4 },
      }),
      'utf8'
    );
    const registry = await readRegistry(viewHome);
    expect(registry.lastView?.step).toBe(0);
  });

  it('makes ids unique without clobbering an existing one', () => {
    expect(uniqueId('app', [])).toBe('app');
    expect(uniqueId('app', ['app'])).toBe('app-2');
    expect(uniqueId('app', ['app', 'app-2'])).toBe('app-3');
  });
});
