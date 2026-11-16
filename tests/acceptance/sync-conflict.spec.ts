import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MAP_PATH, ensureProject, mutateMapFile, openSample, waitForSaved } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

function labelOf(id: string): string | null {
  const document = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as {
    waypoints: Array<{ id: string; label: string }>;
  };
  return document.waypoints.find(waypoint => waypoint.id === id)?.label ?? null;
}

async function startConflict(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-1"]').click();
  const field = page.getByLabel('Label');
  await field.fill('Mine');
  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-2' ? { ...waypoint, label: 'Theirs on disk' } : waypoint
    ),
  }));
  await expect(page.locator('[data-notice="outside-change"]')).toBeVisible({ timeout: 3000 });
  return field;
}

test('asks once when both sides changed and keeps the typing', async ({ page }) => {
  const field = await startConflict(page);

  const notice = page.locator('[data-notice="outside-change"]');
  await expect(page.locator('[data-notice]')).toHaveCount(1);
  await expect(notice).toContainText('Theirs on disk');
  await expect(notice.getByRole('button')).toHaveCount(2);
  await expect(field).toHaveValue('Mine');
});

test('takes the file version and restarts the history', async ({ page }) => {
  const field = await startConflict(page);

  await page.locator('[data-notice="outside-change"]').getByRole('button', { name: 'Reload' }).click();

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  await expect(page.locator('.react-flow__node', { hasText: 'Theirs on disk' })).toBeVisible();
  await expect(field).toHaveValue('Understanding is the deliverable', { timeout: 2000 });
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
});

test('writes the person version and raises no further notice', async ({ page }) => {
  const field = await startConflict(page);
  await expect(field).toHaveValue('Mine');

  await page.locator('[data-notice="outside-change"]').getByRole('button', { name: 'Keep mine' }).click();
  await waitForSaved(page);

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  await expect.poll(() => labelOf('w-1')).toBe('Mine');
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('shows one notice when a change lands while saving', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-1"]').click();
  await page.getByLabel('Label').fill('Typed quickly');

  await page.waitForTimeout(700);
  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-3' ? { ...waypoint, label: 'Landed during the save' } : waypoint
    ),
  }));

  await expect(page.locator('[data-notice]')).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('[data-notice="outside-change"]')).toBeVisible();
  await expect(page.locator('[data-notice="outside-change"]').getByRole('button')).toHaveCount(2);
});
