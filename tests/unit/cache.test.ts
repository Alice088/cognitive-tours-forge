import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listCachedMaps, readCachedMap, writeCachedMap } from '@/app/lib/workspace/cache';
import type { MapDocument } from '@/app/lib/workspace/types';

const homes: string[] = [];

function home(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'ctour-cache-'));
  homes.push(dir);
  return dir;
}

function documentWith(label: string): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: [{ id: 'w-1', label, type: 'Goal', position: { x: 0, y: 0 } }],
    edges: [],
    tours: [],
  };
}

afterEach(() => {
  for (const dir of homes.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('map cache', () => {
  it('reads back what was written', async () => {
    const root = home();
    await writeCachedMap(root, 'demo', 'main.tour.json', documentWith('Kept'));
    const cached = await readCachedMap(root, 'demo', 'main.tour.json');
    expect(cached?.document.waypoints[0].label).toBe('Kept');
    expect(cached?.report.waypointCount).toBe(1);
  });

  it('lists the cached maps of one project only', async () => {
    const root = home();
    await writeCachedMap(root, 'demo', 'main.tour.json', documentWith('One'));
    await writeCachedMap(root, 'demo', 'backend.tour.json', documentWith('Two'));
    await writeCachedMap(root, 'other', 'main.tour.json', documentWith('Three'));
    expect((await listCachedMaps(root, 'demo')).map(map => map.file)).toEqual(['backend.tour.json', 'main.tour.json']);
  });

  it('returns nothing for a missing or escaping file', async () => {
    const root = home();
    expect(await readCachedMap(root, 'demo', 'main.tour.json')).toBeNull();
    expect(await readCachedMap(root, 'demo', '../escape.tour.json')).toBeNull();
    expect(await readCachedMap(root, '../demo', 'main.tour.json')).toBeNull();
  });
});
