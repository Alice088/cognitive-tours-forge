import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

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

export async function ensureProject(request: APIRequestContext): Promise<void> {
  writeSampleMap();
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
