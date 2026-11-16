import { expect, test } from '@playwright/test';
import { renameSync } from 'node:fs';
import { PROJECT_DIR, ensureProject, openSample } from './fixtures';

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test('an empty workspace adds a project itself', async ({ page, request }) => {
  const workspace = await request.get('/api/workspace');
  const { projects } = (await workspace.json()) as { projects: Array<{ id: string }> };
  for (const project of projects) {
    await request.delete(`/api/workspace/${project.id}`);
  }

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add project' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Add project' }).first().click();
  const pathField = page.getByLabel('Folder path');
  await pathField.fill(PROJECT_DIR);
  await pathField.press('Enter');
  await page.getByRole('button', { name: 'Add this folder' }).click();

  await page.waitForURL(/\/p\/e2e-fixture\/main\.tour\.json/);
  await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeVisible();
  await expect(page.getByText('Understanding is the deliverable')).toBeVisible();
});

test('a failed load says what failed and offers one retry', async ({ page }) => {
  await page.goto('/p/e2e-fixture/missing.tour.json');
  await expect(page.getByRole('heading', { name: 'That did not load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
});

test('an unavailable project stays listed and can be repointed', async ({ page, request }) => {
  await openSample(page);

  const workspace = await request.get('/api/workspace');
  const { projects } = (await workspace.json()) as {
    projects: Array<{ id: string; path: string }>;
  };
  const project = projects.find(entry => entry.id === 'e2e-fixture');
  expect(project).toBeDefined();

  const moved = `${PROJECT_DIR}-moved`;
  renameSync(PROJECT_DIR, moved);
  try {
    await page.reload();
    await expect(page.getByLabel('Not found on disk')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Choose a new location for e2e-fixture' })).toBeVisible();

    await page.getByRole('button', { name: 'Choose a new location for e2e-fixture' }).click();
    const pathField = page.getByLabel('Folder path');
    await pathField.fill(moved);
    await pathField.press('Enter');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Use this folder' }).click();
    await expect(page.getByLabel('Not found on disk')).toBeHidden({ timeout: 10000 });
  } finally {
    renameSync(moved, PROJECT_DIR);
  }
});
