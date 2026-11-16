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

const BANDS = [
  { width: 1440, band: 'wide' },
  { width: 1280, band: 'wide' },
  { width: 1279, band: 'medium' },
  { width: 1024, band: 'medium' },
  { width: 768, band: 'medium' },
  { width: 767, band: 'narrow' },
  { width: 360, band: 'narrow' },
] as const;

test('rearranges itself at the wide, medium and narrow bands', async ({ page }) => {
  for (const { width, band } of BANDS) {
    await page.setViewportSize({ width, height: 900 });
    await openSample(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);

    const measured = await page.evaluate(() => {
      const widthOf = (region: string) => {
        const node = document.querySelector(`[data-region="${region}"]`);
        if (!node) {
          return 0;
        }
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 ? Math.round(rect.width) : 0;
      };
      return {
        rail: widthOf('rail'),
        canvas: widthOf('canvas'),
        inspector: widthOf('inspector'),
        dock: widthOf('dock'),
      };
    });

    expect(measured.dock, `dock at ${width}px`).toBeGreaterThan(0);
    expect(measured.canvas, `canvas at ${width}px`).toBeGreaterThanOrEqual(320);

    if (band === 'wide') {
      expect(measured.rail, `rail at ${width}px`).toBe(240);
      expect(measured.inspector, `inspector at ${width}px`).toBe(320);
    }
    if (band === 'medium') {
      expect(measured.rail, `rail at ${width}px`).toBe(56);
      expect(measured.inspector, `inspector at ${width}px`).toBe(300);
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
    }
    if (band === 'narrow') {
      expect(measured.rail, `rail at ${width}px`).toBe(0);
      expect(measured.inspector, `inspector at ${width}px`).toBe(0);
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    }
  }
});

test('keeps the rail labels reachable at the medium band', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openSample(page);

  const labelSizes = () =>
    page
      .locator('[data-region="rail"] [data-rail-label]')
      .evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));

  expect((await labelSizes()).every(size => size === 0)).toBe(true);

  await page.locator('[data-region="rail"]').hover();
  await expect.poll(async () => (await labelSizes()).some(size => size > 0)).toBe(true);

  const railWidth = await page
    .locator('[data-region="rail"]')
    .evaluate(node => Math.round(node.getBoundingClientRect().width));
  expect(railWidth).toBe(240);
});

test('gives the space of a collapsed rail back to the canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  const canvasWidth = () =>
    page.locator('[data-region="canvas"]').evaluate(node => Math.round(node.getBoundingClientRect().width));
  const before = await canvasWidth();
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await expect.poll(canvasWidth).toBeGreaterThan(before + 100);
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

  await page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' }).click();
  await expect(page.getByLabel('Description')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeHidden();
});

test('edits are saved once at the end of a pause', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' }).click();
  await page.getByLabel('Description').fill('Typed in one pause.');
  await page.locator('[data-region="canvas"]').click({ position: { x: 500, y: 400 } });
  await waitForSaved(page);

  await page.getByRole('button', { name: 'Undo' }).click();
  await waitForSaved(page);
  await page.getByRole('button', { name: 'Redo' }).click();
  await waitForSaved(page);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
});
