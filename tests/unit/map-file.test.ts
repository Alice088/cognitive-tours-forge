import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MapFileError,
  canonicalText,
  emptyDocument,
  mapFileName,
  normalizeDocument,
  readMap,
  readMapStrict,
  serializeDocument,
  validateDocument,
  writeMap,
} from '@/app/lib/workspace/map-file';
import type { MapDocument } from '@/app/lib/workspace/types';

const project = mkdtempSync(path.join(tmpdir(), 'ctour-map-'));

function sample(): MapDocument {
  return {
    version: 1,
    project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
    waypoints: [
      {
        id: 'w-b',
        label: 'Second',
        type: 'Risk',
        position: { x: 10, y: 20 },
        file: 'app/b.ts',
      },
      { id: 'w-a', label: 'First', type: 'Goal', position: { x: 0, y: 0 }, notes: 'n' },
    ],
    edges: [
      { id: 'e-2', source: 'w-a', target: 'w-b', label: 'requires' },
      { id: 'e-1', source: 'w-b', target: 'w-a' },
    ],
    tours: [
      {
        id: 't-1',
        name: 'Why',
        stops: [{ waypointId: 'w-b', narrative: 'second first' }, { waypointId: 'w-a' }],
      },
    ],
  };
}

describe('map file', () => {
  it('slugs a display name', () => {
    expect(mapFileName('Backend Flow')).toBe('backend-flow.tour.json');
    expect(mapFileName('   ')).toBe('');
    expect(mapFileName('!!!')).toBe('');
  });

  it('round-trips a document', async () => {
    await writeMap(project, 'main.tour.json', sample());
    const { document, report } = await readMap(project, 'main.tour.json');
    expect(document.waypoints).toHaveLength(2);
    expect(document.tours[0].stops.map(stop => stop.waypointId)).toEqual(['w-b', 'w-a']);
    expect(report).toEqual({
      droppedWaypoints: 0,
      droppedEdges: 0,
      droppedStops: 0,
      droppedPaths: 0,
      unknownTypes: 0,
      waypointCount: 2,
    });
  });

  it('writes sorted collections and keeps stop order', async () => {
    await writeMap(project, 'sorted.tour.json', sample());
    const text = readFileSync(path.join(project, '.ctour', 'sorted.tour.json'), 'utf8');
    expect(text.indexOf('"w-a"')).toBeLessThan(text.indexOf('"w-b"'));
    expect(text.indexOf('"e-1"')).toBeLessThan(text.indexOf('"e-2"'));
    expect(text.endsWith('\n')).toBe(true);
    const { document } = await readMap(project, 'sorted.tour.json');
    expect(document.tours[0].stops.map(stop => stop.waypointId)).toEqual(['w-b', 'w-a']);
  });

  it('serialises deterministically', () => {
    const first = serializeDocument(sample());
    const second = serializeDocument(sample());
    expect(first).toBe(second);
  });

  it('drops orphaned edges and stops when reading', async () => {
    const broken = {
      version: 1,
      project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
      waypoints: [{ id: 'w-a', label: 'A', type: 'Goal', position: { x: 0, y: 0 } }],
      edges: [{ id: 'e-1', source: 'w-a', target: 'w-missing' }],
      tours: [{ id: 't-1', name: 'T', stops: [{ waypointId: 'w-missing' }] }],
    };
    await writeMap(project, 'broken.tour.json', sample());
    const { report, document } = normalizeDocument(broken);
    expect(report.droppedEdges).toBe(1);
    expect(report.droppedStops).toBe(1);
    expect(document.edges).toHaveLength(0);
    expect(document.tours[0].stops).toHaveLength(0);
  });

  it('maps an unknown type to Open Question and counts it', () => {
    const raw = {
      version: 1,
      project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
      waypoints: [{ id: 'w-a', label: 'A', type: 'Fancy', position: { x: 0, y: 0 } }],
      edges: [],
      tours: [],
    };
    const { document, report } = normalizeDocument(raw);
    expect(document.waypoints[0].type).toBe('Open Question');
    expect(report.unknownTypes).toBe(1);
  });

  it('coerces a broken position and drops an absolute file path', () => {
    const raw = {
      version: 1,
      project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
      waypoints: [{ id: 'w-a', label: 'A', type: 'Goal', position: { x: 'nope' }, file: '/etc/passwd' }],
      edges: [],
      tours: [],
    };
    const { document, report } = normalizeDocument(raw);
    expect(document.waypoints[0].position).toEqual({ x: 0, y: 0 });
    expect(document.waypoints[0].file).toBeUndefined();
    expect(report.droppedPaths).toBe(1);
  });

  it('keeps a waypoint size across a write and a read', async () => {
    const sized = sample();
    sized.waypoints[0].size = { width: 300, height: 160 };
    await writeMap(project, 'sized.tour.json', sized);
    const text = readFileSync(path.join(project, '.ctour', 'sized.tour.json'), 'utf8');
    expect(text).toContain('"size"');
    const { document } = await readMap(project, 'sized.tour.json');
    expect(document.waypoints.find(waypoint => waypoint.id === 'w-b')?.size).toEqual({ width: 300, height: 160 });
    expect(document.waypoints.find(waypoint => waypoint.id === 'w-a')?.size).toBeUndefined();
    expect(text.match(/"size"/g)).toHaveLength(1);
  });

  it('drops an unusable size without dropping the waypoint', () => {
    const raw = {
      version: 1,
      project: { name: 'demo', createdAt: '2026-11-16T09:12:00.000Z' },
      waypoints: [
        { id: 'w-a', label: 'A', type: 'Goal', position: { x: 0, y: 0 }, size: { width: -1, height: 10 } },
        { id: 'w-b', label: 'B', type: 'Goal', position: { x: 0, y: 0 }, size: { width: 'wide', height: 10 } },
      ],
      edges: [],
      tours: [],
    };
    const { document, report } = normalizeDocument(raw);
    expect(report.droppedWaypoints).toBe(0);
    expect(document.waypoints.map(waypoint => waypoint.size)).toEqual([undefined, undefined]);
  });

  it('refuses a negative size on a document handed to the writer', () => {
    const broken = sample();
    broken.waypoints[0].size = { width: 0, height: 100 };
    expect(() => validateDocument(broken)).toThrow(MapFileError);
  });

  it('refuses an unsupported version', () => {
    expect(() => normalizeDocument({ version: 9, project: { name: 'x' } })).toThrow(MapFileError);
  });

  it('refuses a file name that escapes the project', async () => {
    await expect(readMap(project, '../escape.tour.json')).rejects.toMatchObject({ code: 'path-escape' });
    await expect(writeMap(project, '../escape.tour.json', sample())).rejects.toMatchObject({
      code: 'path-escape',
    });
  });

  it('reports a missing map', async () => {
    await expect(readMap(project, 'nope.tour.json')).rejects.toMatchObject({ code: 'map-missing' });
  });

  it('creates an empty document with the three collections', () => {
    const document = emptyDocument('demo');
    expect(document.version).toBe(1);
    expect(document.waypoints).toEqual([]);
    expect(document.edges).toEqual([]);
    expect(document.tours).toEqual([]);
  });

  it('refuses to write an invalid document', async () => {
    const invalid = sample();
    invalid.waypoints[0].id = 'nope';
    await expect(writeMap(project, 'invalid.tour.json', invalid)).rejects.toMatchObject({
      code: 'invalid-document',
    });
  });

  it('replaces the file atomically, leaving no temporary behind', async () => {
    await writeMap(project, 'main.tour.json', sample());
    const updated = sample();
    updated.waypoints.push({
      id: 'w-c',
      label: 'Third',
      type: 'Test',
      position: { x: 1, y: 1 },
    });
    await writeMap(project, 'main.tour.json', updated);
    const { document } = await readMap(project, 'main.tour.json');
    expect(document.waypoints.map(waypoint => waypoint.id)).toEqual(['w-a', 'w-b', 'w-c']);
    const entries = readFileSync(path.join(project, '.ctour', 'main.tour.json'), 'utf8');
    expect(entries).toContain('"w-c"');
  });

  it('canonicalises a document the way a re-read will see it', () => {
    const draft: MapDocument = {
      ...sample(),
      waypoints: [{ id: 'w-a', label: 'First', type: 'Goal', description: '', notes: '', position: { x: 0, y: 0 } }],
      edges: [],
      tours: [],
    };
    const { document } = normalizeDocument(JSON.parse(serializeDocument(draft)));
    expect(canonicalText(draft)).toBe(serializeDocument(document));
    expect(canonicalText(draft)).not.toContain('"description"');
  });

  it('refuses a file that would lose a waypoint', async () => {
    await writeMap(project, 'strict.tour.json', sample());
    const path_ = path.join(project, '.ctour', 'strict.tour.json');
    const parsed = JSON.parse(readFileSync(path_, 'utf8')) as MapDocument;
    parsed.waypoints = [...parsed.waypoints, { id: 'w-c', label: '', type: 'Goal', position: { x: 0, y: 0 } }];
    writeFileSync(path_, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

    await expect(readMapStrict(project, 'strict.tour.json')).rejects.toMatchObject({
      code: 'map-unreadable',
    });
    const { report } = await readMap(project, 'strict.tour.json');
    expect(report.droppedWaypoints).toBe(1);
  });

  it('accepts a file that loses nothing', async () => {
    await writeMap(project, 'clean.tour.json', sample());
    const { document } = await readMapStrict(project, 'clean.tour.json');
    expect(document.waypoints).toHaveLength(2);
  });
});
