import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const fixture = path.join(process.cwd(), '.tmp', 'e2e-fixture');
const mapPath = path.join(fixture, '.tours', 'main.tour.json');

const fixtureDocument = {
  version: 1,
  project: { name: 'e2e', createdAt: '2026-11-16T09:12:00.000Z' },
  waypoints: [
    {
      id: 'w-1',
      label: 'Understanding is the deliverable',
      type: 'User Need',
      description: 'People need to see how the code fits together.',
      position: { x: 0, y: 0 },
    },
    { id: 'w-2', label: 'Waypoints carry meaning', type: 'Goal', position: { x: 280, y: 40 } },
    {
      id: 'w-3',
      label: 'Config is read from disk',
      type: 'Code Component',
      file: 'app/lib/workspace/registry.ts',
      position: { x: 140, y: 240 },
    },
  ],
  edges: [
    { id: 'e-1', source: 'w-1', target: 'w-2', label: 'requires' },
    { id: 'e-2', source: 'w-2', target: 'w-3' },
  ],
  tours: [
    {
      id: 't-1',
      name: 'Why this exists',
      description: 'The short version.',
      stops: [{ waypointId: 'w-1', narrative: 'Start here.' }, { waypointId: 'w-2' }],
    },
  ],
};

async function openMap(page: Page) {
  await page.goto('/p/e2e-fixture/main.tour.json?tour=t-1&step=0');
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
}

async function waitForSaved(page: Page) {
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });
}

test.beforeAll(async ({ request }) => {
  rmSync(fixture, { recursive: true, force: true });
  mkdirSync(path.join(fixture, '.tours'), { recursive: true });
  writeFileSync(mapPath, `${JSON.stringify(fixtureDocument, null, 2)}\n`, 'utf8');
  await request.post('/api/workspace', { data: { path: fixture } });
});

test.beforeEach(async ({ page }) => {
  writeFileSync(mapPath, `${JSON.stringify(fixtureDocument, null, 2)}\n`, 'utf8');
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('theme')) {
      window.localStorage.setItem('theme', 'light');
    }
  });
});

test.describe('US1 one coherent workspace', () => {
  test('shows the four regions without overlap', async ({ page }) => {
    await openMap(page);
    const regions = page.locator('[data-region]');
    await expect(regions).toHaveCount(4);
    const boxes = await regions.evaluateAll(nodes =>
      nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { region: node.getAttribute('data-region'), x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      })
    );
    for (const box of boxes) {
      expect(box.w, `${box.region} has no width`).toBeGreaterThan(0);
    }
    const rail = boxes.find(box => box.region === 'rail')!;
    const canvas = boxes.find(box => box.region === 'canvas')!;
    const inspector = boxes.find(box => box.region === 'inspector')!;
    expect(rail.x + rail.w).toBeLessThanOrEqual(canvas.x + 1);
    expect(canvas.x + canvas.w).toBeLessThanOrEqual(inspector.x + 1);
  });

  test('keeps every tour fact in the dock', async ({ page }) => {
    await openMap(page);
    const dock = page.locator('[data-region="dock"]');
    await expect(dock.getByText('Step 1 of 2')).toBeVisible();
    await expect(dock.getByRole('button', { name: 'Next stop' })).toBeVisible();
    const canvas = page.locator('[data-region="canvas"]');
    await expect(canvas.getByText('Step 1 of 2')).toHaveCount(0);
    await expect(page.locator('[data-region="rail"]').getByText('Step 1 of 2')).toHaveCount(0);
  });

  test('every visible control has an accessible name', async ({ page }) => {
    await openMap(page);
    const unnamed = await page.locator('[data-region] button').evaluateAll(buttons =>
      buttons
        .filter(button => {
          const label = button.getAttribute('aria-label');
          const text = button.textContent?.trim();
          return !label && !text;
        })
        .map(button => button.outerHTML.slice(0, 80))
    );
    expect(unnamed).toEqual([]);
  });
});

test.describe('US2 theme', () => {
  test('switches theme and keeps the choice after a reload', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: /^Theme:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('resolves surfaces from tokens in the dark theme', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: /^Theme:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    const background = await page
      .locator('[data-region="dock"]')
      .evaluate(node => getComputedStyle(node).backgroundColor);
    expect(background).not.toBe('rgb(255, 255, 255)');
    const railColor = await page
      .locator('[data-region="rail"]')
      .evaluate(node => getComputedStyle(node).backgroundColor);
    expect(railColor).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('US3 navigation and restore', () => {
  test('restores the tour and step after leaving the map', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: 'Next stop' }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await page.goto('/');
    await page.waitForURL(/step=1/);
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
  });

  test('opens a map from the rail', async ({ page }) => {
    await openMap(page);
    await page.getByRole('link', { name: /main/ }).click();
    await expect(page.getByText('Why this exists')).toBeVisible();
  });
});

test.describe('US5 next actions', () => {
  test('creates a map and opens it empty', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: /^Create a map in e2e/ }).click();
    await page.getByLabel('Map name').fill('backend');
    await page.getByRole('button', { name: 'Create map' }).click();
    await page.waitForURL(/backend\.tour\.json/);
    await expect(page.getByText('This map has no waypoints yet.')).toBeVisible();
  });
});

test.describe('US6 editing', () => {
  test('autosaves a description to the map file', async ({ page }) => {
    await openMap(page);
    await page.getByText('Understanding is the deliverable').click();
    const field = page.getByLabel('Description');
    await field.fill('Rewritten by the shell.');
    await page.locator('[data-region="canvas"]').click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(2500);
    const text = readFileSync(mapPath, 'utf8');
    expect(text).toContain('Rewritten by the shell.');
    await expect(page.getByText('Saved')).toBeVisible();
  });

  test('undoes and redoes a change', async ({ page }) => {
    await openMap(page);
    await page.getByText('Understanding is the deliverable').click();
    await page.getByLabel('Description').fill('First rewrite.');
    await page.locator('[data-region="canvas"]').click({ position: { x: 10, y: 10 } });
    await waitForSaved(page);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await page.getByRole('button', { name: 'Undo' }).click();
    await waitForSaved(page);
    const undone = JSON.parse(readFileSync(mapPath, 'utf8'));
    expect(undone.waypoints[0].description).toBe(fixtureDocument.waypoints[0].description);
    await page.getByRole('button', { name: 'Redo' }).click();
  });

  test('keeps the map visible while editing', async ({ page }) => {
    await openMap(page);
    await page.getByText('Understanding is the deliverable').click();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  });
});

test.describe('US4 any width', () => {
  test('rearranges at 360 without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openMap(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation', { name: 'Projects and maps' })).toBeVisible();
  });

  test('keeps the dock usable at 768', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await openMap(page);
    await expect(page.getByRole('button', { name: 'Next stop' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('SC-002 one place per action', () => {
  test('never exposes the same action in two regions', async ({ page }) => {
    await openMap(page);
    const perRegion = await page.locator('[data-region]').evaluateAll(regions =>
      regions
        .filter(region => region.getBoundingClientRect().width > 0)
        .map(region => ({
          region: region.getAttribute('data-region') ?? '',
          names: Array.from(region.querySelectorAll('button, a'))
            .map(node => node.getAttribute('aria-label') ?? (node.textContent ?? '').trim())
            .filter(name => name !== ''),
        }))
    );

    const home = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { region, names } of perRegion) {
      for (const name of names) {
        const owner = home.get(name);
        if (owner && owner !== region) {
          duplicates.push(`${name}: ${owner} and ${region}`);
        }
        home.set(name, region);
      }
    }
    expect(duplicates).toEqual([]);
  });

  test('a control that claims to change the map changes it', async ({ page }) => {
    await openMap(page);
    const before = await page.locator('.react-flow__node').count();
    await page.getByRole('button', { name: 'Add a waypoint' }).click();
    await expect.poll(() => page.locator('.react-flow__node').count()).toBe(before + 1);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });
});
