import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { MapDocument } from '@/app/lib/workspace/types';

export const PROJECT_DIR = path.join(process.cwd(), '.tmp', 'e2e-fixture');
export const MAP_PATH = path.join(PROJECT_DIR, '.ctour', 'main.tour.json');
export const PROJECT_ID = 'e2e-fixture';

export const sampleDocument = {
  version: 1,
  project: { name: 'e2e', createdAt: '2026-11-16T09:12:00.000Z' },
  waypoints: [
    {
      id: 'w-1',
      label: 'Understanding is the deliverable',
      type: 'User Need',
      description: 'People need to see how the code fits together.',
      position: { x: 0, y: 0 },
    },
    { id: 'w-2', label: 'Waypoints carry meaning', type: 'Goal', position: { x: 280, y: 40 } },
    {
      id: 'w-3',
      label: 'Config is read from disk',
      type: 'Code Component',
      file: 'app/lib/workspace/registry.ts',
      position: { x: 140, y: 240 },
    },
  ],
  edges: [
    { id: 'e-1', source: 'w-1', target: 'w-2', label: 'requires' },
    { id: 'e-2', source: 'w-2', target: 'w-3' },
  ],
  tours: [
    {
      id: 't-1',
      name: 'Why this exists',
      description: 'The short version.',
      stops: [{ waypointId: 'w-1', narrative: 'Start here.' }, { waypointId: 'w-2' }],
    },
  ],
};

export function writeSampleMap(): void {
  const mapDir = path.join(PROJECT_DIR, '.ctour');
  mkdirSync(mapDir, { recursive: true });
  for (const entry of readdirSync(mapDir)) {
    if (entry.endsWith('.tour.json') && entry !== 'main.tour.json') {
      rmSync(path.join(mapDir, entry), { force: true });
    }
  }
  writeFileSync(MAP_PATH, `${JSON.stringify(sampleDocument, null, 2)}\n`, 'utf8');
}

export function mapPathFor(file: string): string {
  return path.join(PROJECT_DIR, '.ctour', file);
}

export function writeRawMap(text: string, file = 'main.tour.json'): void {
  mkdirSync(path.dirname(mapPathFor(file)), { recursive: true });
  writeFileSync(mapPathFor(file), text, 'utf8');
}

export function mutateMapFile(change: (document: MapDocument) => MapDocument, file = 'main.tour.json'): MapDocument {
  const target = mapPathFor(file);
  const current = existsSync(target)
    ? (JSON.parse(readFileSync(target, 'utf8')) as MapDocument)
    : (structuredClone(sampleDocument) as MapDocument);
  const next = change(current);
  writeRawMap(`${JSON.stringify(next, null, 2)}\n`, file);
  return next;
}

export function deleteMapFile(file = 'main.tour.json'): void {
  rmSync(mapPathFor(file), { force: true });
}

export async function ensureProject(request: APIRequestContext): Promise<void> {
  writeSampleMap();
  const current = await request.get('/api/workspace');
  const { projects } = (await current.json()) as { projects: Array<{ id: string }> };
  for (const project of projects) {
    await request.delete(`/api/workspace/${project.id}`);
  }
  const response = await request.post('/api/workspace', { data: { path: PROJECT_DIR } });
  if (![201, 409].includes(response.status())) {
    throw new Error(`could not register the fixture: ${response.status()}`);
  }
}

export async function openSample(page: Page): Promise<void> {
  await page.goto(`/p/${PROJECT_ID}/main.tour.json?tour=t-1&step=0`);
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
}

export async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });
}

export const readingDocument = {
  version: 1,
  project: { name: 'e2e reading', createdAt: '2026-11-16T09:12:00.000Z' },
  waypoints: [
    {
      id: 'w-1',
      label: 'A ticket arrives',
      type: 'User Need',
      description: 'A person writes in and expects an answer.',
      position: { x: 0, y: 0 },
    },
    { id: 'w-2', label: 'The queue holds it', type: 'Code Component', position: { x: 600, y: 0 } },
    { id: 'w-3', label: 'Triage decides', type: 'Goal', position: { x: 0, y: 400 } },
    {
      id: 'w-4',
      label: 'An answer leaves',
      type: 'Feature',
      description: 'The reply is sent back to the person.',
      position: { x: 600, y: 400 },
    },
  ],
  edges: [
    { id: 'e-1', source: 'w-1', target: 'w-2' },
    { id: 'e-2', source: 'w-2', target: 'w-3' },
    { id: 'e-3', source: 'w-3', target: 'w-4' },
  ],
  tours: [
    {
      id: 't-read',
      name: "A ticket's life",
      stops: [
        { waypointId: 'w-1', narrative: 'Every ticket starts in one queue.' },
        { waypointId: 'w-2' },
        { waypointId: 'w-3', narrative: 'Triage is where the queue turns into work.' },
        { waypointId: 'w-4', narrative: 'The answer is the point of the whole trip.' },
      ],
    },
    {
      id: 't-dry',
      name: 'No words',
      stops: [{ waypointId: 'w-1' }, { waypointId: 'w-2' }],
    },
    { id: 't-empty', name: 'Not written yet', stops: [] },
  ],
};

export function writeReadingMap(): void {
  writeRawMap(`${JSON.stringify(readingDocument, null, 2)}\n`);
}

export function writeLongTourMap(): void {
  const waypoints = Array.from({ length: 40 }, (_, index) => ({
    id: `w-${index + 1}`,
    label: `Stop ${index + 1}`,
    type: 'Goal',
    position: { x: (index % 8) * 280, y: Math.floor(index / 8) * 160 },
  }));
  const tour = {
    id: 't-long',
    name: 'Forty stops',
    stops: waypoints.map((waypoint, index) => ({
      waypointId: waypoint.id,
      narrative: `Narration for stop ${index + 1}.`,
    })),
  };
  writeRawMap(`${JSON.stringify({ ...readingDocument, waypoints, tours: [tour] }, null, 2)}\n`);
}
