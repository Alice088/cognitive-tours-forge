import { expect, test } from '@playwright/test';
import { ensureProject, openSample } from './fixtures';

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test('reaches every region with the keyboard and shows focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const seen = new Set<string>();
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab');
    const region = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.closest('[data-region]')?.getAttribute('data-region') ?? null;
    });
    if (region) {
      seen.add(region);
    }
  }
  for (const region of ['rail', 'canvas', 'dock', 'inspector']) {
    expect(seen.has(region), `tab never reached ${region}`).toBe(true);
  }
});

test('shows a visible focus ring on a keyboard-focused control', async ({ page }) => {
  await openSample(page);
  await page.getByRole('button', { name: 'Add a project' }).focus();
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    const style = getComputedStyle(active);
    return {
      outlineWidth: parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      shadow: style.boxShadow,
    };
  });
  const outlined = focus.outlineStyle !== 'none' && focus.outlineWidth > 0;
  const ringed = focus.shadow !== 'none' && focus.shadow !== '';
  expect(outlined || ringed, JSON.stringify(focus)).toBe(true);
});

test('Escape closes the inspector drawer before anything else', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();
  await expect(page.getByLabel('Description')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Description')).toBeHidden();
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
});

test('undo inside a text field stays text undo', async ({ page }) => {
  await openSample(page);
  await page.getByText('Waypoints carry meaning').click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeDisabled();
  await page.getByLabel('Description').fill('typing that is not committed');
  await page.getByLabel('Description').press('Control+z');
  await page.waitForTimeout(300);
  await expect(undo).toBeDisabled();
});
