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
