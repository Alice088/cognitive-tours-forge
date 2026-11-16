import { expect, test } from '@playwright/test';
import { ensureProject, openSample } from './fixtures';

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

async function chooseTheme(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /^Theme:/ }).click();
  await page.getByRole('menuitemradio', { name }).click();
}

function readPalette(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { background: body.backgroundColor, foreground: body.color };
  });
}

test('follows the system theme while it is set to system', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('theme', 'system'));
  await page.emulateMedia({ colorScheme: 'light' });
  await openSample(page);
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 2000 });

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 2000 });
});

test('resolves every surface of the dark theme from tokens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await chooseTheme(page, 'Light');
  const light = await readPalette(page);

  await chooseTheme(page, 'Dark');
  await expect(page.locator('html')).toHaveClass(/dark/);

  const strays = await page.evaluate(palette => {
    const nodes = Array.from(
      document.querySelectorAll('[data-region], [data-region] *, [role="dialog"], [role="dialog"] *')
    );
    const found: string[] = [];
    for (const node of nodes) {
      const style = getComputedStyle(node);
      const paints = [style.backgroundColor, style.color, style.borderTopColor];
      if (paints[0] === palette.background || paints[1] === palette.foreground) {
        found.push(`${node.tagName.toLowerCase()} keeps a light-theme colour: ${paints.join(' | ')}`);
      }
    }
    return found;
  }, light);
  expect(strays).toEqual([]);
});

test('keeps a dialog and a tooltip on the dark surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await chooseTheme(page, 'Light');
  const light = await readPalette(page);
  await chooseTheme(page, 'Dark');

  await page.getByRole('button', { name: 'Add a project' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogBackground = await dialog.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(dialogBackground).not.toBe(light.background);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByText('Understanding is the deliverable').click();
  await page.getByLabel('Notes').fill('A note so undo becomes available.');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();

  await page.getByRole('button', { name: 'Undo' }).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const tooltipBackground = await tooltip.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(tooltipBackground).not.toBe(light.background);
});
