import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MAP_PATH, ensureProject, openSample, waitForSaved } from './fixtures';

function readLabel(id: string): string | null {
  const document = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as {
    waypoints: Array<{ id: string; label: string }>;
  };
  return document.waypoints.find(waypoint => waypoint.id === id)?.label ?? null;
}

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('shows nothing when the person saves', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  const requests: string[] = [];
  page.on('request', request => {
    if (request.method() === 'PUT') {
      requests.push(request.url());
    }
  });

  await page.locator('.react-flow__node[data-id="w-1"]').click();
  const field = page.getByLabel('Label');
  await field.fill('Saved by the person');
  await waitForSaved(page);

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  await expect(field).toHaveValue('Saved by the person');
  await expect(field).toBeFocused();
  expect(requests.length).toBeGreaterThan(0);
});

test('keeps twenty undos after twenty saves', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-2"]').click();
  const field = page.getByLabel('Label');

  for (let step = 0; step < 20; step += 1) {
    await field.fill(`Edit ${step}`);
    await field.blur();
  }
  await waitForSaved(page);

  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Control+z');
  }
  await waitForSaved(page);

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect.poll(() => readLabel('w-2')).toBe('Waypoints carry meaning');
});
