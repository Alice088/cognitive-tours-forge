import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { serializeDocument } from '@/app/lib/workspace/map-file';
import { mapDocument, mapOnDisk, open, parsedOnDisk, sandbox, snapshot, structuredOf, textOf } from './mcp-fixtures';

const boxes: string[] = [];
const make = (...args: Parameters<typeof sandbox>) => {
  const box = sandbox(...args);
  boxes.push(box.root);
  return box;
};

afterAll(() => {
  for (const root of boxes) rmSync(root, { recursive: true, force: true });
});

async function mapped(box = make()) {
  const { session, call } = await open(box.home);
  const read = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });
  const state = structuredOf(read).state as string;
  const invoke = async (name: string, args: Record<string, unknown> = {}) =>
    call('tools/call', { name, arguments: { project: 'repo', state, ...args } });
  return { box, session, call, state, invoke };
}

async function stateOf(call: Awaited<ReturnType<typeof mapped>>['call']): Promise<string> {
  const read = await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } });
  return structuredOf(read).state as string;
}

describe('create_waypoint', () => {
  it('adds a waypoint with the given position', async () => {
    const { box, session, invoke } = await mapped();

    const response = await invoke('create_waypoint', {
      label: 'Retry storm',
      type: 'Risk',
      position: { x: 600, y: 400 },
      description: 'Backoff is missing',
    });

    expect(structuredOf(response).changed).toBe(true);
    const saved = parsedOnDisk(box).waypoints.find(entry => entry.label === 'Retry storm');
    expect(saved).toMatchObject({ type: 'Risk', description: 'Backoff is missing', position: { x: 600, y: 400 } });
    expect(saved?.id).toMatch(/^w-/);
    await session.close();
  });

  it('chooses a free slot when no position is given', async () => {
    const { box, session, invoke } = await mapped();

    await invoke('create_waypoint', { label: 'No overlap', type: 'Feature' });

    const saved = parsedOnDisk(box).waypoints.find(entry => entry.label === 'No overlap');
    expect(saved?.position).toBeDefined();
    expect(saved?.position).not.toEqual({ x: 80, y: 80 });
    await session.close();
  });

  it('keeps every other waypoint untouched', async () => {
    const { box, session, invoke } = await mapped();
    const before = parsedOnDisk(box).waypoints;

    await invoke('create_waypoint', { label: 'Added', type: 'Test' });

    const after = parsedOnDisk(box).waypoints;
    expect(after.filter(entry => before.some(old => old.id === entry.id))).toEqual(before);
    await session.close();
  });
});

describe('update_waypoint', () => {
  it('changes only the fields named', async () => {
    const { box, session, invoke } = await mapped();

    await invoke('update_waypoint', { waypoint: 'w-risk', notes: 'Watch the queue' });

    const saved = parsedOnDisk(box).waypoints.find(entry => entry.id === 'w-risk');
    expect(saved).toMatchObject({ label: 'Drift', description: 'The map rots', notes: 'Watch the queue' });
    await session.close();
  });

  it('clears a field sent as null', async () => {
    const { box, session, invoke } = await mapped();
    await invoke('update_waypoint', { waypoint: 'w-risk', notes: 'Temporary' });
    const state = await stateOf(session.call);

    await session.call('tools/call', {
      name: 'update_waypoint',
      arguments: { project: 'repo', state, waypoint: 'w-risk', notes: null },
    });

    expect(parsedOnDisk(box).waypoints.find(entry => entry.id === 'w-risk')?.notes).toBeUndefined();
    await session.close();
  });

  it('finds a waypoint by its exact label', async () => {
    const { box, session, invoke } = await mapped();

    await invoke('update_waypoint', { waypoint: 'Drift', description: 'Rewritten' });

    expect(parsedOnDisk(box).waypoints.find(entry => entry.id === 'w-risk')?.description).toBe('Rewritten');
    await session.close();
  });

  it('does not rewrite the file when nothing changes', async () => {
    const { box, session, invoke } = await mapped();
    await invoke('update_waypoint', { waypoint: 'w-risk', notes: 'Same' });
    const before = mapOnDisk(box);
    const state = await stateOf(session.call);

    const response = await session.call('tools/call', {
      name: 'update_waypoint',
      arguments: { project: 'repo', state, waypoint: 'w-risk', notes: 'Same' },
    });

    expect(structuredOf(response).changed).toBe(false);
    expect(mapOnDisk(box)).toBe(before);
    await session.close();
  });
});

describe('delete_waypoint', () => {
  it('takes links and tour stops with it and counts them', async () => {
    const { box, session, invoke } = await mapped();

    const response = await invoke('delete_waypoint', { waypoint: 'w-goal' });

    expect(structuredOf(response).removed).toEqual({ ways: 1, links: 1, stops: 1 });
    const saved = parsedOnDisk(box);
    expect(saved.waypoints).toHaveLength(1);
    expect(saved.edges).toHaveLength(0);
    expect(saved.tours[0].stops).toHaveLength(1);
    await session.close();
  });
});

describe('links', () => {
  it('connects two waypoints with a label', async () => {
    const { box, session, invoke } = await mapped();
    await invoke('create_waypoint', { label: 'Third', type: 'Feature', position: { x: 600, y: 400 } });
    const waypoint = parsedOnDisk(box).waypoints.find(entry => entry.label === 'Third');
    const state = await stateOf(session.call);

    const response = await session.call('tools/call', {
      name: 'connect_waypoints',
      arguments: { project: 'repo', state, source: 'w-goal', target: waypoint?.id, label: 'leads to' },
    });

    expect(structuredOf(response).changed).toBe(true);
    expect(parsedOnDisk(box).edges.find(edge => edge.label === 'leads to')).toMatchObject({
      source: 'w-goal',
      target: waypoint?.id,
    });
    await session.close();
  });

  it('removes a link', async () => {
    const { box, session, invoke } = await mapped();

    const response = await invoke('disconnect_waypoints', { source: 'w-goal', target: 'w-risk' });

    expect(structuredOf(response).changed).toBe(true);
    expect(parsedOnDisk(box).edges).toHaveLength(0);
    await session.close();
  });
});

describe('tours', () => {
  it('creates a tour and sets its stops in order', async () => {
    const { box, session, invoke } = await mapped();

    const created = await invoke('create_tour', { name: 'Second walk', description: 'For review' });
    const id = structuredOf(created).id as string;
    const state = await stateOf(session.call);

    await session.call('tools/call', {
      name: 'set_tour_stops',
      arguments: {
        project: 'repo',
        state,
        tour: id,
        stops: [{ waypoint: 'w-risk', narrative: 'Then the risk' }, { waypoint: 'w-goal' }],
      },
    });

    const tour = parsedOnDisk(box).tours.find(entry => entry.id === id);
    expect(tour?.stops).toEqual([{ waypointId: 'w-risk', narrative: 'Then the risk' }, { waypointId: 'w-goal' }]);
    await session.close();
  });

  it('clears the stops when the list is empty', async () => {
    const { box, session, invoke } = await mapped();

    await invoke('set_tour_stops', { tour: 't-main', stops: [] });

    expect(parsedOnDisk(box).tours.find(tour => tour.id === 't-main')?.stops).toEqual([]);
    await session.close();
  });
});

describe('writes stay inside the project', () => {
  it('changes nothing outside the map folder', async () => {
    const { box, session, invoke } = await mapped();
    const before = snapshot(box.root);

    await invoke('create_waypoint', { label: 'Outside check', type: 'Feature' });

    const after = snapshot(box.root);
    const changed = Object.keys(after).filter(key => before[key] !== after[key]);
    expect(changed).toEqual(['repo']);
    expect(snapshot(path.join(box.folder, '.ctour'))).not.toEqual({});
    await session.close();
  });

  it('writes twenty times in a row', async () => {
    const { session } = await mapped();
    const states = new Set<string>([await stateOf(session.call)]);

    for (let index = 0; index < 20; index += 1) {
      const state = await stateOf(session.call);
      await session.call('tools/call', {
        name: 'create_waypoint',
        arguments: { project: 'repo', state, label: `Bulk ${index}`, type: 'Feature' },
      });
      states.add(await stateOf(session.call));
    }

    expect(states.size).toBe(21);
    await session.close();
  });
});

describe('refusals', () => {
  async function refused(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ code: string; response: Record<string, unknown>; unchanged: boolean }> {
    const { box, session, invoke } = await mapped();
    const before = mapOnDisk(box);
    const response = await invoke(name, args);
    const code = String(structuredOf(response).code);
    const unchanged = mapOnDisk(box) === before;
    await session.close();
    return { code, response, unchanged };
  }

  it('refuses an unknown type and lists the ten', async () => {
    const { code, response, unchanged } = await refused('create_waypoint', { label: 'Bad', type: 'Depndency' });

    expect(code).toBe('type-unknown');
    expect(structuredOf(response).allowed).toHaveLength(10);
    expect(textOf(response)).toContain('Valid: Goal');
    expect(unchanged).toBe(true);
  });

  it('refuses an empty label', async () => {
    const { code, unchanged } = await refused('create_waypoint', { label: '   ', type: 'Goal' });

    expect(code).toBe('label-empty');
    expect(unchanged).toBe(true);
  });

  it('refuses an unknown waypoint', async () => {
    const { code, unchanged } = await refused('update_waypoint', { waypoint: 'w-nope', notes: 'x' });

    expect(code).toBe('waypoint-unknown');
    expect(unchanged).toBe(true);
  });

  it('refuses an ambiguous label', async () => {
    const box = make(
      mapDocument({
        waypoints: [
          { id: 'w-one', label: 'Same', type: 'Goal', position: { x: 80, y: 80 } },
          { id: 'w-two', label: 'Same', type: 'Risk', position: { x: 400, y: 80 } },
        ],
        edges: [],
        tours: [],
      })
    );
    const { session, call } = await open(box.home);
    const state = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }))
      .state as string;

    const response = await call('tools/call', {
      name: 'update_waypoint',
      arguments: { project: 'repo', state, waypoint: 'Same', notes: 'x' },
    });

    expect(structuredOf(response).code).toBe('waypoint-ambiguous');
    expect(structuredOf(response).allowed).toEqual(['w-one', 'w-two']);
    await session.close();
  });

  it('refuses an update with no fields', async () => {
    const { code, unchanged } = await refused('update_waypoint', { waypoint: 'w-goal' });

    expect(code).toBe('nothing-to-update');
    expect(unchanged).toBe(true);
  });

  it('refuses a link from a waypoint to itself', async () => {
    const { code, unchanged } = await refused('connect_waypoints', { source: 'w-goal', target: 'w-goal' });

    expect(code).toBe('self-link');
    expect(unchanged).toBe(true);
  });

  it('refuses a link that is not there', async () => {
    const box = make();
    const { call } = await open(box.home);
    const state = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }))
      .state as string;
    await call('tools/call', {
      name: 'create_waypoint',
      arguments: { project: 'repo', state, label: 'Third', type: 'Feature' },
    });
    const next = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }))
      .state as string;
    const before = mapOnDisk(box);

    const response = await call('tools/call', {
      name: 'disconnect_waypoints',
      arguments: { project: 'repo', state: next, source: 'w-goal', target: 'w-third' },
    });

    expect(structuredOf(response).code).toBe('link-unknown');
    expect(mapOnDisk(box)).toBe(before);
  });

  it('refuses a stop on a waypoint that is not on the map', async () => {
    const { code, unchanged } = await refused('set_tour_stops', { tour: 't-main', stops: [{ waypoint: 'w-nope' }] });

    expect(code).toBe('stop-unknown');
    expect(unchanged).toBe(true);
  });

  it('refuses the same waypoint twice in one tour', async () => {
    const { code, unchanged } = await refused('set_tour_stops', {
      tour: 't-main',
      stops: [{ waypoint: 'w-goal' }, { waypoint: 'w-goal' }],
    });

    expect(code).toBe('stop-duplicate');
    expect(unchanged).toBe(true);
  });

  it('refuses an unknown tour', async () => {
    const { code, unchanged } = await refused('set_tour_stops', { tour: 't-nope', stops: [] });

    expect(code).toBe('tour-unknown');
    expect(unchanged).toBe(true);
  });

  it('refuses an empty tour name', async () => {
    const { code, unchanged } = await refused('create_tour', { name: '  ' });

    expect(code).toBe('name-empty');
    expect(unchanged).toBe(true);
  });

  it('refuses a path outside the project', async () => {
    const { code, unchanged } = await refused('create_waypoint', {
      label: 'Escape',
      type: 'Goal',
      file: '../../etc/passwd',
    });

    expect(code).toBe('path-outside');
    expect(unchanged).toBe(true);
  });

  it('refuses a write based on a stale reading and carries the current map', async () => {
    const box = make();
    const { call } = await open(box.home);
    const state = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }))
      .state as string;
    const changed = mapDocument({ waypoints: mapDocument().waypoints.slice(0, 1), edges: [], tours: [] });
    writeFileSync(path.join(box.folder, '.ctour', 'main.tour.json'), serializeDocument(changed), 'utf8');

    const response = await call('tools/call', {
      name: 'create_waypoint',
      arguments: { project: 'repo', state, label: 'Too late', type: 'Feature' },
    });

    expect(structuredOf(response).code).toBe('map-changed');
    expect(structuredOf(response).state).toBeTruthy();
    expect((structuredOf(response).map as { document: unknown }).document).toEqual(changed);
    expect(parsedOnDisk(box).waypoints).toHaveLength(1);
  });

  it('answers unchanged rather than refusing when the same content was written outside', async () => {
    const box = make();
    const { session, call } = await open(box.home);
    const state = structuredOf(await call('tools/call', { name: 'read_map', arguments: { project: 'repo' } }))
      .state as string;
    const reordered = JSON.stringify(JSON.parse(serializeDocument(mapDocument())), null, 4);
    writeFileSync(path.join(box.folder, '.ctour', 'main.tour.json'), reordered, 'utf8');

    const response = await call('tools/call', {
      name: 'update_waypoint',
      arguments: { project: 'repo', state, waypoint: 'w-risk', notes: 'Drift' },
    });

    expect(structuredOf(response).code).toBe('map-changed');
    await session.close();
  });
});
