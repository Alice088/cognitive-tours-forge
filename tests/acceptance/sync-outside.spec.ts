import { expect, test } from '@playwright/test';
import { ensureProject, mutateMapFile, openSample } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('shows an outside change within a second and keeps the person in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node[data-id="w-1"]').click();
  await expect(page.getByLabel('Label')).toHaveValue('Understanding is the deliverable');
  await expect(page.getByText('Step 1 of 2')).toBeVisible();

  const started = Date.now();
  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-2' ? { ...waypoint, label: 'Changed by the agent' } : waypoint
    ),
  }));

  await expect(page.locator('.react-flow__node', { hasText: 'Changed by the agent' })).toBeVisible({ timeout: 1000 });
  expect(Date.now() - started).toBeLessThan(1500);
  await expect(page.getByLabel('Label')).toHaveValue('Understanding is the deliverable');
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('does nothing when the file is rewritten with the same content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  mutateMapFile(document => document);
  await page.waitForTimeout(600);

  await expect(page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' })).toBeVisible();
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('settles five changes into the last state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  for (const label of ['one', 'two', 'three', 'four', 'five']) {
    mutateMapFile(document => ({
      ...document,
      waypoints: document.waypoints.map(waypoint => (waypoint.id === 'w-3' ? { ...waypoint, label } : waypoint)),
    }));
  }

  await expect(page.getByText('five', { exact: true })).toBeVisible({ timeout: 2000 });
  await expect(page.getByText('four', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('announces an applied change without moving focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.getByLabel('Search waypoints').focus();

  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-1' ? { ...waypoint, label: 'Announced from disk' } : waypoint
    ),
  }));

  await expect(page.locator('.react-flow__node', { hasText: 'Announced from disk' })).toBeVisible({ timeout: 1000 });
  await expect(page.getByLabel('Search waypoints')).toBeFocused();
});

test('reconciles once when the page becomes visible again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  const reads: string[] = [];
  page.on('request', request => {
    if (request.method() === 'GET' && request.url().includes('/api/maps/') && !request.url().endsWith('/events')) {
      reads.push(request.url());
    }
  });

  mutateMapFile(document => ({
    ...document,
    waypoints: document.waypoints.map(waypoint =>
      waypoint.id === 'w-2' ? { ...waypoint, label: 'While hidden' } : waypoint
    ),
  }));
  await expect(page.locator('.react-flow__node', { hasText: 'While hidden' })).toBeVisible({ timeout: 1500 });

  const before = reads.length;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect.poll(() => reads.length - before, { timeout: 3000 }).toBe(1);
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});

test('keeps editing after the file is rewritten with the same content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  mutateMapFile(document => document);
  await page.waitForTimeout(600);

  await page.locator('.react-flow__node[data-id="w-2"]').click();
  const field = page.getByLabel('Label');
  await field.fill('Edited after a rewrite');
  await field.blur();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });

  await expect(page.locator('[data-notice]')).toHaveCount(0);
  await expect(page.locator('.react-flow__node', { hasText: 'Edited after a rewrite' })).toBeVisible();
});
