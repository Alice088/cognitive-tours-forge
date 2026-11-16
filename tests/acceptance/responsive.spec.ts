import { expect, test } from '@playwright/test';
import { ensureProject, openSample, waitForSaved } from './fixtures';

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('theme')) {
      window.localStorage.setItem('theme', 'light');
    }
  });
});

test('keeps every region inside the window at each width', async ({ page }) => {
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await openSample(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);

    const visibleRegions = await page.locator('[data-region]').evaluateAll(nodes =>
      nodes
        .filter(node => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map(node => node.getAttribute('data-region'))
    );
    expect(visibleRegions).toContain('canvas');
    expect(visibleRegions).toContain('dock');
    if (width >= 1280) {
      expect(visibleRegions).toEqual(expect.arrayContaining(['rail', 'canvas', 'inspector', 'dock']));
    }
    if (width < 768) {
      expect(visibleRegions).not.toContain('rail');
      expect(visibleRegions).not.toContain('inspector');
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    }
  }
});

test('opens one drawer at a time and returns focus to its opener', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openSample(page);

  const opener = page.getByRole('button', { name: 'Open navigation' });
  await opener.click();
  await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeHidden();
  await expect(opener).toBeFocused();

  await page.getByText('Understanding is the deliverable').click();
  await expect(page.getByLabel('Description')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeHidden();
});

test('keeps the canvas at least 320 wide', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openSample(page);
  const width = await page.locator('[data-region="canvas"]').evaluate(node => node.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(320);
});

test('edits are saved once at the end of a pause', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();
  await page.getByLabel('Description').fill('Typed in one pause.');
  await page.locator('[data-region="canvas"]').click({ position: { x: 500, y: 400 } });
  await waitForSaved(page);

  await page.getByRole('button', { name: 'Undo' }).click();
  await waitForSaved(page);
  await page.getByRole('button', { name: 'Redo' }).click();
  await waitForSaved(page);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
});
