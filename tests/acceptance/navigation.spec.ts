import { expect, test } from '@playwright/test';
import { PROJECT_ID, ensureProject, openSample } from './fixtures';

const MAP_URL = `/p/${PROJECT_ID}/main.tour.json`;

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test('returns to the same project, map, tour and stop three times', async ({ page }) => {
  await openSample(page);
  await page.getByRole('button', { name: 'Next stop' }).click();
  await expect(page.getByText('Step 2 of 2')).toBeVisible();

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await page.goto('/');
    await page.waitForURL(new RegExp(`/p/${PROJECT_ID}/main\\.tour\\.json\\?tour=t-1&step=1`));
    await expect(page.getByText('Step 2 of 2'), `cycle ${cycle}`).toBeVisible();
    await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  }
});

test('drops a stored tour that no longer exists', async ({ page, request }) => {
  await page.goto(`${MAP_URL}?tour=t-gone&step=4`);
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  await expect(page.getByText('No tour selected')).toBeVisible();

  await expect
    .poll(async () => {
      const response = await request.get('/api/workspace');
      const body = (await response.json()) as { lastView?: { tourId: string | null } };
      return body.lastView?.tourId ?? null;
    })
    .toBeNull();

  await page.goto('/');
  await page.waitForURL(new RegExp(`/p/${PROJECT_ID}/main\\.tour\\.json`));
  await expect(page.getByText('No tour selected')).toBeVisible();
});

test('clamps a stored step that no longer exists', async ({ page }) => {
  await page.goto(`${MAP_URL}?tour=t-1&step=9`);
  await expect(page.getByText('Step 2 of 2')).toBeVisible();
  expect(await page.evaluate(() => window.location.search)).toContain('tour=t-1');
});
