import { chmodSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { MAP_PATH, PROJECT_DIR, ensureProject, openSample, waitForSaved } from './fixtures';

const MAP_DIR = path.join(PROJECT_DIR, '.ctour');

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

function readMap() {
  return JSON.parse(readFileSync(MAP_PATH, 'utf8'));
}

function blurEverything(page: import('@playwright/test').Page) {
  return page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test('moves a waypoint by dragging it on the map', async ({ page }) => {
  await openSample(page);
  const node = page.locator('.react-flow__node[data-id="w-1"]');
  await expect(node).toBeVisible();
  await expect.poll(async () => JSON.stringify(await node.boundingBox())).not.toBeNull();
  await page.waitForTimeout(400);
  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 40, { steps: 10 });
  await page.mouse.up();
  await waitForSaved(page);

  const moved = readMap().waypoints.find((waypoint: { id: string }) => waypoint.id === 'w-1');
  expect(moved.position.x).toBeGreaterThan(0);
  expect(moved.position.y).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await waitForSaved(page);
  const restored = readMap().waypoints.find((waypoint: { id: string }) => waypoint.id === 'w-1');
  expect(restored.position).toEqual({ x: 0, y: 0 });
});

test('adds and removes a link between two waypoints', async ({ page }) => {
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();

  await page.getByLabel('Connect to a waypoint').click();
  await page.getByRole('option', { name: 'Config is read from disk' }).click();
  await waitForSaved(page);
  const added = readMap().edges.find(
    (edge: { source: string; target: string }) => edge.source === 'w-1' && edge.target === 'w-3'
  );
  expect(added).toBeDefined();

  await page
    .getByRole('button', {
      name: 'Remove the link from Understanding is the deliverable to Config is read from disk',
    })
    .click();
  await waitForSaved(page);
  const removed = readMap().edges.find(
    (edge: { source: string; target: string }) => edge.source === 'w-1' && edge.target === 'w-3'
  );
  expect(removed).toBeUndefined();
});

test('creates a tour and deletes it again', async ({ page }) => {
  await openSample(page);
  await page.getByRole('button', { name: 'New tour' }).click();
  await expect(page.getByLabel('Tour name')).toHaveValue('Untitled tour');
  await page.getByLabel('Tour name').fill('Second tour');
  await waitForSaved(page);
  expect(readMap().tours.map((tour: { name: string }) => tour.name)).toContain('Second tour');

  await page.getByRole('button', { name: 'Delete tour' }).click();
  await waitForSaved(page);
  expect(readMap().tours.map((tour: { name: string }) => tour.name)).not.toContain('Second tour');
  await expect(page.getByText('No tour selected')).toBeVisible();
});

test('says why a save failed and offers one retry', async ({ page }) => {
  await openSample(page);
  chmodSync(MAP_DIR, 0o555);
  try {
    await page.getByText('Understanding is the deliverable').click();
    await page.getByLabel('Description').fill('A change that cannot be written.');
    await blurEverything(page);

    const alert = page.getByRole('alert').filter({ hasText: 'EACCES' });
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
    await expect(page.getByLabel('Description')).toHaveValue('A change that cannot be written.');
  } finally {
    chmodSync(MAP_DIR, 0o755);
  }

  await page.getByRole('button', { name: 'Retry' }).click();
  await waitForSaved(page);
  expect(readMap().waypoints[0].description).toBe('A change that cannot be written.');
});

test('refuses an empty label and an absolute path in the editor', async ({ page }) => {
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();

  await page.getByLabel('Label').fill('');
  await expect(page.getByText('A waypoint needs a label.')).toBeVisible();

  await page.getByLabel('File').fill('/etc/passwd');
  await expect(page.getByText('Give a path relative to the project root, not an absolute one.')).toBeVisible();
  await blurEverything(page);
  await page.waitForTimeout(1500);

  const stored = readMap().waypoints.find((waypoint: { id: string }) => waypoint.id === 'w-1');
  expect(stored.file).toBeUndefined();
  expect(stored.label).toBe('Understanding is the deliverable');
});

test('replays twenty changes back to the beginning and forward to the end', async ({ page }) => {
  test.setTimeout(240_000);
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();

  const recorded: string[] = [readFileSync(MAP_PATH, 'utf8')];
  for (let index = 0; index < 20; index += 1) {
    await page.getByLabel('Notes').fill(`note ${index}`);
    await blurEverything(page);
    await waitForSaved(page);
    recorded.push(readFileSync(MAP_PATH, 'utf8'));
  }
  expect(new Set(recorded).size).toBe(21);

  for (let index = 19; index >= 0; index -= 1) {
    await page.keyboard.press('Control+z');
    await waitForSaved(page);
    expect(readFileSync(MAP_PATH, 'utf8'), `undo to step ${index}`).toBe(recorded[index]);
  }

  for (let index = 1; index <= 20; index += 1) {
    await page.keyboard.press('Control+Shift+z');
    await waitForSaved(page);
    expect(readFileSync(MAP_PATH, 'utf8'), `redo to step ${index}`).toBe(recorded[index]);
  }
});
