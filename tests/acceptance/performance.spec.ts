import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { buildMap } from '../unit/fixtures/build-map';

const PROJECT_DIR = path.join(process.cwd(), '.tmp', 'perf-fixture');
const MAP_FILE = 'big.tour.json';
const HUGE_FILE = 'huge.tour.json';

test.beforeAll(async ({ request }) => {
  mkdirSync(path.join(PROJECT_DIR, '.tours'), { recursive: true });
  writeFileSync(path.join(PROJECT_DIR, '.tours', MAP_FILE), `${JSON.stringify(buildMap(250, 40), null, 2)}\n`, 'utf8');
  writeFileSync(path.join(PROJECT_DIR, '.tours', HUGE_FILE), `${JSON.stringify(buildMap(260, 45), null, 2)}\n`, 'utf8');
  const response = await request.post('/api/workspace', { data: { path: PROJECT_DIR } });
  if (![201, 409].includes(response.status())) {
    throw new Error(`could not register the performance fixture: ${response.status()}`);
  }
});

async function measureFilter(page: import('@playwright/test').Page, value: string) {
  return page.evaluate(
    input =>
      new Promise<number>(resolve => {
        const field = document.querySelector('input#map-search') as HTMLInputElement;
        const canvas = document.querySelector('[data-region="canvas"]') as HTMLElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        const start = performance.now();
        const observer = new MutationObserver(() => {
          observer.disconnect();
          resolve(performance.now() - start);
        });
        observer.observe(canvas, { subtree: true, childList: true, characterData: true });
        setter?.call(field, input);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }),
    value
  );
}

test('stays inside the interaction budget on a 250 waypoint map', async ({ page }) => {
  await page.goto(`/p/perf-fixture/${MAP_FILE}`);
  await expect(page.getByText('250 of 250 waypoints')).toBeVisible({ timeout: 20000 });

  const typing = await measureFilter(page, 'Waypoint 10');
  expect(typing, `search typing took ${typing.toFixed(1)}ms`).toBeLessThan(100);
  await expect(page.getByText(/of 250 waypoints/)).not.toHaveText(/^250 of 250/);

  const clearing = await measureFilter(page, '');
  expect(clearing, `clearing search took ${clearing.toFixed(1)}ms`).toBeLessThan(100);
});

test('reports a map larger than the supported size', async ({ page }) => {
  await page.goto(`/p/perf-fixture/${HUGE_FILE}`);
  await expect(page.getByRole('status')).toContainText('larger than the supported size');
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
});

async function arm(page: import('@playwright/test').Page, selector: string) {
  await page.evaluate(sel => {
    const state = window as unknown as { __t0: number | null; __dt: number | null };
    state.__t0 = null;
    state.__dt = null;
    const target = document.querySelector(sel);
    if (!target) {
      throw new Error(`no element for ${sel}`);
    }
    const mark = () => {
      if (state.__dt === null) {
        state.__t0 = performance.now();
      }
    };
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('pointermove', mark, true);
    window.addEventListener('click', mark, true);
    const observer = new MutationObserver(() => {
      if (state.__dt === null && state.__t0 !== null) {
        state.__dt = performance.now() - state.__t0;
      }
    });
    observer.observe(target, { attributes: true, subtree: true, childList: true, characterData: true });
  }, selector);
}

async function latency(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __dt: number | null }).__dt ?? -1);
}

test('pans, zooms, selects and drags inside the interaction budget', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/p/perf-fixture/${MAP_FILE}`);
  await expect(page.getByText('250 of 250 waypoints')).toBeVisible({ timeout: 20000 });

  const gap = await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane');
    if (!pane) {
      return null;
    }
    const area = pane.getBoundingClientRect();
    const rects = Array.from(document.querySelectorAll('.react-flow__node')).map(node => node.getBoundingClientRect());
    for (let x = area.left + 20; x < area.right - 80; x += 4) {
      for (let y = area.top + 20; y < area.bottom - 60; y += 4) {
        if (!rects.some(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) {
          return { x, y };
        }
      }
    }
    return null;
  });
  expect(gap, 'no empty spot on the canvas to pan from').not.toBeNull();

  const viewportBefore = await page.locator('.react-flow__viewport').evaluate(node => node.getAttribute('style'));
  await arm(page, '.react-flow__viewport');
  if (gap) {
    await page.mouse.move(gap.x, gap.y);
    await page.mouse.down();
    await page.mouse.move(gap.x + 60, gap.y + 40, { steps: 6 });
    await page.mouse.up();
  }
  const panning = await latency(page);
  expect(panning, `panning took ${panning.toFixed(1)}ms`).toBeGreaterThanOrEqual(0);
  expect(panning, `panning took ${panning.toFixed(1)}ms`).toBeLessThan(100);
  await expect
    .poll(() => page.locator('.react-flow__viewport').evaluate(node => node.getAttribute('style')))
    .not.toBe(viewportBefore);

  const zoomBefore = await page.locator('.react-flow__viewport').evaluate(node => node.getAttribute('style'));
  await arm(page, '.react-flow__viewport');
  await page.locator('.react-flow__controls-zoomin').click();
  const zooming = await latency(page);
  expect(zooming, `zooming took ${zooming.toFixed(1)}ms`).toBeGreaterThanOrEqual(0);
  expect(zooming, `zooming took ${zooming.toFixed(1)}ms`).toBeLessThan(100);
  expect(await page.locator('.react-flow__viewport').evaluate(node => node.getAttribute('style'))).not.toBe(zoomBefore);

  await page.locator('.react-flow__controls-fitview').click();
  const firstId = await page.locator('.react-flow__node').first().getAttribute('data-id');
  const selector = `.react-flow__node[data-id="${firstId}"]`;
  const node = page.locator(selector);
  await arm(page, selector);
  await node.click();
  const selecting = await latency(page);
  expect(selecting, `selecting took ${selecting.toFixed(1)}ms`).toBeGreaterThanOrEqual(0);
  expect(selecting, `selecting took ${selecting.toFixed(1)}ms`).toBeLessThan(100);
  await expect(node).toHaveClass(/selected/);

  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  await arm(page, selector);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
  }
  const dragging = await latency(page);
  expect(dragging, `dragging took ${dragging.toFixed(1)}ms`).toBeGreaterThanOrEqual(0);
  expect(dragging, `dragging took ${dragging.toFixed(1)}ms`).toBeLessThan(100);
});
