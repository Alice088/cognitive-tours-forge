import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MAP_PATH, deleteMapFile, ensureProject, openSample, writeRawMap } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('follows a map added and removed in the folder', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await expect(page.getByRole('link', { name: 'main', exact: true })).toBeVisible();

  writeRawMap(readFileSync(MAP_PATH, 'utf8'), 'second.tour.json');
  await expect(page.getByRole('link', { name: 'second', exact: true })).toBeVisible({ timeout: 1000 });

  deleteMapFile('second.tour.json');
  await expect(page.getByRole('link', { name: 'second', exact: true })).toHaveCount(0, { timeout: 1000 });
});

test('keeps the open map open when another map appears', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  writeRawMap(readFileSync(MAP_PATH, 'utf8'), 'third.tour.json');
  await expect(page.getByRole('link', { name: 'third', exact: true })).toBeVisible({ timeout: 1000 });

  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  await expect(page.getByRole('link', { name: 'main', exact: true })).toHaveAttribute('aria-current', 'page');
});
