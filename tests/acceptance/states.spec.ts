import { expect, test } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { PROJECT_DIR, PROJECT_ID, ensureProject, openSample } from './fixtures';

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
  await expect(page.getByText('Reading folders')).toBeHidden();
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

  const moved = `${PROJECT_DIR}-moved`;
  renameSync(PROJECT_DIR, moved);
  try {
    await page.reload();
    await expect(page.getByLabel('Not found on disk')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('status')).toContainText('read only');

    await page.getByRole('button', { name: 'Choose a new location' }).click();
    const pathField = page.getByLabel('Folder path');
    await expect(page.getByText('Reading folders')).toBeHidden();
    await pathField.fill(moved);
    await pathField.press('Enter');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Use this folder' }).click();
    await expect(page.getByLabel('Not found on disk')).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('status')).toHaveCount(0);
  } finally {
    renameSync(moved, PROJECT_DIR);
    await request.post(`/api/workspace/${PROJECT_ID}/relink`, { data: { path: PROJECT_DIR } });
  }
});

test('a project without a map shows one create action', async ({ page, request }) => {
  const empty = path.join(process.cwd(), '.tmp', 'no-maps-fixture');
  mkdirSync(empty, { recursive: true });
  const added = await request.post('/api/workspace', { data: { path: empty } });
  expect([201, 409]).toContain(added.status());
  const { project } = (await added.json()) as { project: { id: string; availability: string } };
  expect(project.availability).toBe('uninitialised');

  await page.goto(`/p/${project.id}`);
  await expect(page.getByRole('heading', { name: /has no maps yet/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create map' })).toHaveCount(1);
});

test('opens an unreachable project read-only from the last saved copy', async ({ page, request }) => {
  await openSample(page);
  await page.reload();
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();

  const moved = `${PROJECT_DIR}-offline`;
  renameSync(PROJECT_DIR, moved);
  try {
    await page.reload();
    await expect(page.getByRole('status')).toContainText('read only');
    await expect(page.getByRole('button', { name: 'Choose a new location' })).toHaveCount(1);
    await expect(page.getByText('Understanding is the deliverable')).toBeVisible();

    await page.getByText('Understanding is the deliverable').click();
    await expect(page.getByLabel('Description')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Delete waypoint' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'New tour' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  } finally {
    renameSync(moved, PROJECT_DIR);
    await request.post(`/api/workspace/${PROJECT_ID}/relink`, { data: { path: PROJECT_DIR } });
  }
});

test('disables the data actions while a map is loading', async ({ page }) => {
  await page.route('**/api/maps/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto(`/p/${PROJECT_ID}/main.tour.json?tour=t-1&step=0`);
  await expect(page.getByText('Loading this map')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New tour' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Edit tour' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  await expect(page.getByText('Step 1 of 2')).toBeVisible({ timeout: 15000 });
});
