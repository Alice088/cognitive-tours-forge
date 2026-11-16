import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildMap } from '../unit/fixtures/build-map';
import { mapDocument, open, sandbox, structuredOf, textOf, writeRegistry } from './mcp-fixtures';
import { serializeDocument } from '@/app/lib/workspace/map-file';

const boxes: string[] = [];
const make = (...args: Parameters<typeof sandbox>) => {
  const box = sandbox(...args);
  boxes.push(box.root);
  return box;
};

afterAll(() => {
  for (const root of boxes) rmSync(root, { recursive: true, force: true });
});

async function opened(home: string) {
  const { session, call } = await open(home);
  return { session, call };
}

describe('list_projects', () => {
  it('names every project with its folder and maps', async () => {
    const box = make();
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'list_projects', arguments: {} });
    const projects = structuredOf(response).projects as Array<Record<string, unknown>>;

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ id: 'repo', name: 'Repo', folder: box.folder, available: true });
    expect(projects[0].maps).toEqual([
      { file: 'main.tour.json', name: 'main', waypoints: 2, tours: 1, readable: true },
    ]);
    await session.close();
  });

  it('lists a project whose folder is gone instead of hiding it', async () => {
    const box = make();
    rmSync(box.folder, { recursive: true, force: true });
    const { session, call } = await opened(box.home);

    const projects = structuredOf(await call('tools/call', { name: 'list_projects', arguments: {} })).projects as Array<
      Record<string, unknown>
    >;

    expect(projects[0].available).toBe(false);
    expect(projects[0].maps).toEqual([]);
    await session.close();
  });

  it('answers with no projects on a fresh machine', async () => {
    const box = make();
    writeRegistry(box.home, []);
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'list_projects', arguments: {} });

    expect(textOf(response)).toContain('no projects yet');
    await session.close();
  });

  it('refuses a workspace file it cannot read instead of repairing it', async () => {
    const box = make();
    writeFileSync(path.join(box.home, 'workspace.json'), '{"projects": 3}', 'utf8');
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'list_projects', arguments: {} });

    expect(structuredOf(response).code).toBe('workspace-unreadable');
    expect((await import('node:fs')).readdirSync(box.home)).toEqual(['workspace.json']);
    await session.close();
  });
});

describe('read_map', () => {
  it('returns the whole document and a state token', async () => {
    const box = make();
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });
    const structured = structuredOf(response);

    expect(structured.map).toBe('main.tour.json');
    expect(String(structured.state)).toMatch(/^[0-9a-f]{16}$/);
    expect((structured.document as { waypoints: unknown[] }).waypoints).toHaveLength(2);
    expect((structured.document as { tours: unknown[] }).tours).toHaveLength(1);
    expect(textOf(response)).toContain('state ');
    expect(textOf(response)).toContain('2 waypoints, 1 links, 1 tours');
    await session.close();
  });

  it('opens the only map when none is named', async () => {
    const box = make();
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'Repo' } });

    expect(structuredOf(response).map).toBe('main.tour.json');
    await session.close();
  });

  it('refuses to choose between several maps', async () => {
    const box = make();
    mkdirSync(path.join(box.folder, '.ctour'), { recursive: true });
    writeFileSync(path.join(box.folder, '.ctour', 'other.tour.json'), serializeDocument(mapDocument()), 'utf8');
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });

    expect(structuredOf(response).code).toBe('map-required');
    expect(structuredOf(response).allowed).toEqual(['main.tour.json', 'other.tour.json']);
    await session.close();
  });

  it('refuses an ambiguous project name', async () => {
    const box = make();
    writeRegistry(box.home, [
      { id: 'one', name: 'Repo', path: box.folder },
      { id: 'two', name: 'Repo', path: box.folder },
    ]);
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'Repo' } });

    expect(structuredOf(response).code).toBe('project-ambiguous');
    expect(structuredOf(response).allowed).toEqual(['one', 'two']);
    await session.close();
  });

  it('refuses a folder that is gone', async () => {
    const box = make();
    rmSync(box.folder, { recursive: true, force: true });
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });

    expect(structuredOf(response).code).toBe('project-gone');
    await session.close();
  });

  it('refuses a map that is not there', async () => {
    const box = make();
    rmSync(path.join(box.folder, '.ctour', 'main.tour.json'));
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', {
      name: 'read_map',
      arguments: { project: 'repo', map: 'main.tour.json' },
    });

    expect(structuredOf(response).code).toBe('map-unknown');
    await session.close();
  });

  it('refuses a file that is not JSON instead of returning an empty map', async () => {
    const box = make();
    writeFileSync(path.join(box.folder, '.ctour', 'main.tour.json'), '{"version":1,', 'utf8');
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });

    expect(structuredOf(response).code).toBe('map-unreadable');
    expect(structuredOf(response).document).toBeUndefined();
    await session.close();
  });

  it('says how many entries it could not represent', async () => {
    const box = make();
    writeFileSync(
      path.join(box.folder, '.ctour', 'main.tour.json'),
      serializeDocument(
        mapDocument({
          waypoints: [
            { id: 'w-goal', label: '', type: 'Goal', position: { x: 80, y: 80 } },
            { id: 'w-risk', label: 'Drift', type: 'Risk', position: { x: 320, y: 80 } },
          ],
        })
      ),
      'utf8'
    );
    const { session, call } = await opened(box.home);

    const structured = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }));

    expect(structured.omitted).toMatchObject({ waypoints: 1 });
    expect((structured.document as { waypoints: unknown[] }).waypoints).toHaveLength(1);
    await session.close();
  });

  it('reads a 250-waypoint map in under a second', async () => {
    const box = make(buildMap(250, 40));
    const { session, call } = await opened(box.home);

    const started = Date.now();
    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });
    const elapsed = Date.now() - started;

    expect((structuredOf(response).document as { waypoints: unknown[] }).waypoints).toHaveLength(250);
    expect(elapsed).toBeLessThan(1000);
    await session.close();
  });

  it('works with no interface involved', async () => {
    const box = make();
    const { session, call } = await opened(box.home);

    const response = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });

    expect(structuredOf(response).code).toBeUndefined();
    await session.close();
  });
});
