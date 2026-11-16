import { expect, test } from '@playwright/test';
import { ensureProject, openSample } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('opens a change stream for the open map', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stream = page.waitForResponse(response => response.url().includes('/events') && response.status() === 200, {
    timeout: 5000,
  });
  await openSample(page);

  const response = await stream;
  expect(response.headers()['content-type']).toContain('text/event-stream');
  await expect(page.locator('[data-notice]')).toHaveCount(0);
});
