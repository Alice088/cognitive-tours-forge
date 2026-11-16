import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MAP_PATH, deleteMapFile, ensureProject, openSample, waitForSaved, writeRawMap } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('never applies content it cannot read', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  const writes: string[] = [];
  page.on('request', request => {
    if (request.method() === 'PUT') {
      writes.push(request.url());
    }
  });

  for (const broken of ['<<<<<<< HEAD\n', '', '{"version":1']) {
    writeRawMap(broken);
    await expect(page.locator('[data-notice="unreadable"]')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-notice="unreadable"]')).toContainText('main.tour.json');
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
    await expect(page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' })).toBeVisible();
  }

  await page.waitForTimeout(1200);
  expect(writes).toHaveLength(0);
});

test('applies the file again once it is valid and clears the message', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  writeRawMap('{"version":1');
  await expect(page.locator('[data-notice="unreadable"]')).toBeVisible({ timeout: 2000 });

  writeRawMap(
    `${JSON.stringify(
      {
        version: 1,
        project: { name: 'e2e', createdAt: '2026-11-16T09:12:00.000Z' },
        waypoints: [{ id: 'w-1', label: 'Fixed by hand', type: 'Goal', position: { x: 0, y: 0 } }],
        edges: [],
        tours: [],
      },
      null,
      2
    )}\n`
  );

  await expect(page.locator('[data-notice]')).toHaveCount(0, { timeout: 2000 });
  await expect(page.locator('.react-flow__node', { hasText: 'Fixed by hand' })).toBeVisible();
});

test('offers to write a deleted map back and never writes nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  deleteMapFile();
  await expect(page.locator('[data-notice="gone"]')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(3);

  await page.getByRole('button', { name: 'Write it back' }).click();
  await waitForSaved(page);

  await expect.poll(() => existsSync(MAP_PATH)).toBe(true);
  const restored = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as { waypoints: unknown[] };
  expect(restored.waypoints).toHaveLength(3);
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('refuses a file that would lose a waypoint', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  const document = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as {
    waypoints: Array<Record<string, unknown>>;
  };
  document.waypoints.push({ id: 'w-4', label: '', type: 'Goal', position: { x: 0, y: 0 } });
  writeRawMap(`${JSON.stringify(document, null, 2)}\n`);

  await expect(page.locator('[data-notice="unreadable"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('[data-notice="unreadable"]')).toContainText('waypoint');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' })).toBeVisible();
});

test('writes over a file that cannot be read', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  writeRawMap('<<<<<<< HEAD\n');
  const notice = page.locator('[data-notice="unreadable"]');
  await expect(notice).toBeVisible({ timeout: 2000 });

  await notice.getByRole('button', { name: 'Keep mine' }).click();
  await waitForSaved(page);

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  const restored = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as { waypoints: unknown[] };
  expect(restored.waypoints).toHaveLength(3);
});

test('does not write the map back while the person keeps typing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-1"]').click();

  deleteMapFile();
  await expect(page.locator('[data-notice="gone"]')).toBeVisible({ timeout: 4000 });

  const field = page.getByLabel('Label');
  await field.fill('Typed while the file is gone');
  await field.blur();
  await page.waitForTimeout(1600);

  expect(existsSync(MAP_PATH)).toBe(false);
  await expect(page.locator('[data-notice="gone"]')).toBeVisible();
});
