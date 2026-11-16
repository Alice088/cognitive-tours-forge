import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { MapDocument } from '@/app/lib/workspace/types';

export const PROJECT_DIR = path.join(process.cwd(), '.tmp', 'e2e-fixture');
export const MAP_PATH = path.join(PROJECT_DIR, '.tours', 'main.tour.json');
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
  const toursDir = path.join(PROJECT_DIR, '.tours');
  mkdirSync(toursDir, { recursive: true });
  for (const entry of readdirSync(toursDir)) {
    if (entry.endsWith('.tour.json') && entry !== 'main.tour.json') {
      rmSync(path.join(toursDir, entry), { force: true });
    }
  }
  writeFileSync(MAP_PATH, `${JSON.stringify(sampleDocument, null, 2)}\n`, 'utf8');
}

export function mapPathFor(file: string): string {
  return path.join(PROJECT_DIR, '.tours', file);
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
