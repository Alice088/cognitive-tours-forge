import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { PROJECT_DIR, PROJECT_ID, ensureProject, openSample } from './fixtures';

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('does not follow a map it cannot write and follows it again after relinking', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  const streams: string[] = [];

  const moved = `${PROJECT_DIR}-read-only`;
  rmSync(moved, { recursive: true, force: true });
  renameSync(PROJECT_DIR, moved);
  try {
    await page.reload();
    await expect(page.getByRole('status')).toContainText('read only');
    page.on('response', response => {
      if (response.url().includes('/api/maps/') && response.url().endsWith('/events') && response.status() === 200) {
        streams.push(response.url());
      }
    });
    await page.waitForTimeout(1000);
    expect(streams).toHaveLength(0);

    await page.getByRole('button', { name: 'Choose a new location' }).click();
    const pathField = page.getByLabel('Folder path');
    await expect(page.getByText('Reading folders')).toBeHidden();
    await pathField.fill(moved);
    await pathField.press('Enter');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Use this folder' }).click();

    await expect(page.locator('[data-notice]')).toHaveCount(0, { timeout: 10000 });
    await expect.poll(() => streams.length, { timeout: 10000 }).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    await page.waitForTimeout(700);

    const target = path.join(moved, '.ctour', 'main.tour.json');
    const document = JSON.parse(readFileSync(target, 'utf8')) as {
      waypoints: Array<{ id: string; label: string }>;
    };
    document.waypoints = document.waypoints.map(waypoint =>
      waypoint.id === 'w-2' ? { ...waypoint, label: 'Following again' } : waypoint
    );
    writeFileSync(
      target,
      `${JSON.stringify(document, null, 2)}
`,
      'utf8'
    );
    await expect(page.locator('.react-flow__node', { hasText: 'Following again' })).toBeVisible({ timeout: 2000 });
  } finally {
    rmSync(PROJECT_DIR, { recursive: true, force: true });
    renameSync(moved, PROJECT_DIR);
    await request.post(`/api/workspace/${PROJECT_ID}/relink`, { data: { path: PROJECT_DIR } });
  }
});
