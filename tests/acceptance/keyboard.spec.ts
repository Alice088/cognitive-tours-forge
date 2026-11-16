import { expect, test } from '@playwright/test';
import { ensureProject, openSample } from './fixtures';

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test('reaches every region with the keyboard in the contract order', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const order: string[] = [];
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press('Tab');
    const region = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.closest('[data-region]')?.getAttribute('data-region') ?? null;
    });
    if (region && order[order.length - 1] !== region) {
      order.push(region);
    }
  }
  for (const region of ['rail', 'canvas', 'dock', 'inspector']) {
    expect(order, `tab never reached ${region}`).toContain(region);
  }
  expect(order[0]).toBe('rail');
  expect(order.indexOf('dock')).toBeLessThan(order.indexOf('canvas'));
  expect(order.indexOf('inspector')).toBeGreaterThan(order.indexOf('canvas'));
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
  await page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' }).click();
  await expect(page.getByLabel('Description')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Description')).toBeHidden();
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
});

test('undo inside a text field stays text undo', async ({ page }) => {
  await openSample(page);
  await page.locator('.react-flow__node', { hasText: 'Waypoints carry meaning' }).click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeDisabled();
  await page.getByLabel('Description').fill('typing that is not committed');
  await page.getByLabel('Description').press('Control+z');
  await page.waitForTimeout(300);
  await expect(undo).toBeDisabled();
});

test('focuses the map search with a slash', async ({ page }) => {
  await openSample(page);
  await page.locator('[data-region="canvas"]').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('/');
  await expect(page.getByLabel('Search waypoints')).toBeFocused();
});

test('moves between waypoints with the arrow keys when no tour is read', async ({ page }) => {
  await openSample(page);
  await page.getByRole('combobox', { name: 'Current tour' }).click();
  await page.getByRole('option', { name: 'No tour' }).click();
  await page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' }).click();
  await expect(page.getByLabel('Description')).toHaveValue('People need to see how the code fits together.');

  await page.locator('[role="group"][aria-label="Map"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Description')).toHaveValue('');

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#waypoint-label')).toHaveValue('Config is read from disk');
});

test('dismisses the tour before the selection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.locator('.react-flow__node', { hasText: 'Understanding is the deliverable' }).click();
  await page.getByRole('button', { name: 'Edit tour' }).click();
  await expect(page.getByLabel('Tour name')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Tour name')).toBeHidden();
  await expect(page.getByLabel('Description')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Description')).toBeHidden();
  await expect(page.getByText('Select a waypoint on the map to edit it here')).toBeVisible();
});
