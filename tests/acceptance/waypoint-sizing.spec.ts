import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  MAP_PATH,
  PROJECT_ID,
  ensureProject,
  mutateMapFile,
  openSample,
  waitForSaved,
  writeSampleMap,
} from './fixtures';

const LONG_LABEL =
  'Understanding is the deliverable, and a tour is how a reader gets it back without reading every file in the project';

function readMap() {
  return JSON.parse(readFileSync(MAP_PATH, 'utf8'));
}

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test.beforeEach(async ({ page }) => {
  writeSampleMap();
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('a long label is written out in full instead of being clipped', async ({ page }) => {
  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-1' ? { ...waypoint, label: LONG_LABEL } : waypoint
    ),
  }));
  await openSample(page);

  const node = page.locator('.react-flow__node[data-id="w-1"]');
  const label = node.locator('p').nth(1);
  await expect(label).toHaveText(LONG_LABEL);
  expect(await label.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);

  const box = await node.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(100);
});

test('dragging the right handle stores a size that survives a reload and undo', async ({ page }) => {
  await openSample(page);
  const node = page.locator('.react-flow__node[data-id="w-1"]');
  await node.click();

  const before = await node.boundingBox();
  const handle = node.locator('.react-flow__resize-control.handle.right:not(.top):not(.bottom)');
  await expect(handle).toBeVisible();
  const grip = await handle.boundingBox();
  expect(before).not.toBeNull();
  expect(grip).not.toBeNull();
  if (!before || !grip) {
    return;
  }
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 80, grip.y + grip.height / 2, { steps: 12 });
  await page.mouse.up();
  await waitForSaved(page);

  const stored = readMap().waypoints.find((waypoint: { id: string }) => waypoint.id === 'w-1').size;
  expect(stored.width).toBeGreaterThan(200);
  expect(stored.height).toBeGreaterThanOrEqual(64);

  await page.getByRole('button', { name: 'Undo' }).click();
  await waitForSaved(page);
  expect(readMap().waypoints.find((waypoint: { id: string }) => waypoint.id === 'w-1').size).toBeUndefined();

  await page.getByRole('button', { name: 'Redo' }).click();
  await waitForSaved(page);

  await page.reload();
  await expect(page.locator('.react-flow__node[data-id="w-1"]')).toBeVisible();
  const width = await page
    .locator('.react-flow__node[data-id="w-1"] > div')
    .first()
    .evaluate(element => (element as HTMLElement).style.width);
  expect(width).toBe(`${stored.width}px`);
});

test('shift-click selects several waypoints and one action deletes them', async ({ page }) => {
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-1"]').click();
  await page.locator('.react-flow__node[data-id="w-2"]').click({ modifiers: ['Shift'] });
  await page.locator('.react-flow__node[data-id="w-3"]').click({ modifiers: ['Shift'] });

  await page.getByRole('button', { name: 'Delete 3 waypoints' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('3 waypoints');
  await dialog.getByRole('button', { name: 'Delete 3 waypoints' }).click();
  await waitForSaved(page);

  const map = readMap();
  expect(map.waypoints).toEqual([]);
  expect(map.edges).toEqual([]);
  expect(map.tours[0].stops).toEqual([]);

  await page.getByRole('button', { name: 'Undo' }).click();
  await waitForSaved(page);
  expect(readMap().waypoints).toHaveLength(3);
});

test('a tour is created and filled from the interface alone', async ({ page }) => {
  mutateMapFile(document => ({ ...document, tours: [] }));
  await page.goto(`/p/${PROJECT_ID}/main.tour.json`);
  await expect(page.getByText('No tours yet: a tour is an order through the waypoints.')).toBeVisible();

  await page.getByRole('button', { name: 'New tour' }).click();
  await expect(page.getByLabel('Tour name')).toHaveValue('Untitled tour');
  await page.getByLabel('Tour name').fill('Getting started');
  await page.getByLabel('Tour name').blur();

  await page.getByLabel('Add a waypoint to this tour').click();
  await page.getByRole('option', { name: 'Config is read from disk' }).click();
  await waitForSaved(page);

  const narrative = page.getByLabel('Narrative for stop 1');
  await narrative.fill('The file on disk decides what the app shows.');
  await narrative.blur();
  await waitForSaved(page);

  const tour = readMap().tours.find((item: { name: string }) => item.name === 'Getting started');
  expect(tour.stops).toEqual([{ waypointId: 'w-3', narrative: 'The file on disk decides what the app shows.' }]);
});
