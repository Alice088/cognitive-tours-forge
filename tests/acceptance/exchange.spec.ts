import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Locator } from '@playwright/test';
import { MAP_PATH, PROJECT_DIR, PROJECT_ID, ensureProject, openSample } from './fixtures';
import type { MapDocument } from '@/app/lib/workspace/types';

const root = process.cwd();
const MAP_DIR = path.join(PROJECT_DIR, '.ctour');
const sourceDir = path.join(root, '.tmp', 'exchange-source');
const copyDir = path.join(root, '.tmp', 'exchange-copy');
const beaconDir = path.join(root, '.tmp', 'exchange-beacon');

function freshFolder(folder: string): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
}

function sampleMap(waypoints: number, tours = 0): MapDocument {
  return {
    version: 1,
    project: { name: 'travelling', createdAt: '2026-11-16T09:00:00.000Z' },
    waypoints: Array.from({ length: waypoints }, (_, index) => ({
      id: `w-${index + 1}`,
      label: `Travelling waypoint ${index + 1}`,
      type: 'Goal' as const,
      position: { x: index * 240, y: 80 },
    })),
    edges: [],
    tours: Array.from({ length: tours }, (_, index) => ({
      id: `t-${index + 1}`,
      name: `Tour ${index + 1}`,
      stops: [{ waypointId: 'w-1' }],
    })),
  };
}

function writeSource(name: string, document: unknown): string {
  mkdirSync(sourceDir, { recursive: true });
  const target = path.join(sourceDir, name);
  writeFileSync(target, typeof document === 'string' ? document : JSON.stringify(document, null, 2), 'utf8');
  return target;
}

async function chooseFolder(dialog: Locator, folder: string): Promise<void> {
  const input = dialog.getByLabel('Folder path');
  await input.fill(folder);
  await input.press('Enter');
  await expect(input).toHaveValue(folder);
}

test.beforeEach(async ({ request }) => {
  rmSync(sourceDir, { recursive: true, force: true });
  freshFolder(copyDir);
  await ensureProject(request);
});

test('saves a copy of the open map that holds exactly what the map holds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);

  await page.getByRole('button', { name: 'Save a copy' }).click();
  const dialog = page.getByRole('dialog');
  await chooseFolder(dialog, copyDir);
  await dialog.getByRole('button', { name: 'Save copy' }).click();

  await expect(dialog.getByText(/Saved main\.tour\.json/)).toBeVisible({ timeout: 10_000 });
  const copy = JSON.parse(readFileSync(path.join(copyDir, 'main.tour.json'), 'utf8')) as MapDocument;
  expect(copy.waypoints).toHaveLength(3);
  expect(copy.edges).toHaveLength(2);
  expect(copy.tours).toHaveLength(1);
  expect(copy.waypoints[0].label).toBe('Understanding is the deliverable');
});

test('carries a note that has not reached the project yet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.getByText('Understanding is the deliverable').click();
  await page.getByLabel('Label').fill('Typed a moment ago');

  await page.getByRole('button', { name: 'Save a copy' }).click();
  const dialog = page.getByRole('dialog');
  await chooseFolder(dialog, copyDir);
  await dialog.getByRole('button', { name: 'Save copy' }).click();
  await expect(dialog.getByText(/Saved main\.tour\.json/)).toBeVisible({ timeout: 10_000 });

  const copy = JSON.parse(readFileSync(path.join(copyDir, 'main.tour.json'), 'utf8')) as MapDocument;
  expect(copy.waypoints[0].label).toBe('Typed a moment ago');
});

test('delivers a copy from the last known version and says so', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  rmSync(PROJECT_DIR, { recursive: true, force: true });

  await page.getByRole('button', { name: 'Save a copy' }).click();
  const dialog = page.getByRole('dialog');
  await chooseFolder(dialog, copyDir);
  await dialog.getByRole('button', { name: 'Save copy' }).click();

  await expect(dialog.getByText(/last known version/)).toBeVisible({ timeout: 10_000 });
  expect(existsSync(path.join(copyDir, 'main.tour.json'))).toBe(true);
});

test('delivers no copy when the map cannot be written back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  chmodSync(MAP_DIR, 0o555);
  try {
    await page.getByText('Understanding is the deliverable').click();
    await page.getByLabel('Description').fill('A change that cannot be written.');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.getByRole('button', { name: 'Save a copy' }).click();
    const dialog = page.getByRole('dialog');
    await chooseFolder(dialog, copyDir);
    await dialog.getByRole('button', { name: 'Save copy' }).click();

    await expect(dialog.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    expect(readdirSync(copyDir)).toEqual([]);
  } finally {
    chmodSync(MAP_DIR, 0o755);
  }
});

test('brings a file in, previews it and opens it without reloading', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  writeSource('Q3 Roadmap.tour.json', sampleMap(8, 2));

  await page.getByRole('button', { name: `Bring in maps to ${PROJECT_ID}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'One file' }).click();
  await chooseFolder(dialog, sourceDir);
  await dialog.getByRole('button', { name: 'Q3 Roadmap.tour.json' }).click();

  await expect(dialog.getByText('Map name:')).toContainText('q3-roadmap');
  await expect(dialog.getByText('8 waypoints, 0 links, 2 tours')).toBeVisible();
  await dialog.getByRole('button', { name: 'Import' }).click();

  await expect(dialog.getByText('Imported q3-roadmap: 8 waypoints, 0 links, 2 tours.')).toBeVisible({
    timeout: 10_000,
  });

  await dialog.getByRole('button', { name: 'Open q3-roadmap' }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${PROJECT_ID}/q3-roadmap\\.tour\\.json`));
  await expect(page.getByRole('link', { name: 'q3-roadmap', exact: true })).toBeVisible();
  await expect(page.getByText(/Map open with 8 waypoints/)).toBeAttached();
});

test('steps aside when the name is taken and leaves the first map byte for byte', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  const before = readFileSync(MAP_PATH, 'utf8');
  writeSource('main.tour.json', sampleMap(2));

  await page.getByRole('button', { name: `Bring in maps to ${PROJECT_ID}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'One file' }).click();
  await chooseFolder(dialog, sourceDir);
  await dialog.getByRole('button', { name: 'main.tour.json' }).click();

  await expect(dialog.getByText('main-2.tour.json', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(dialog.getByText(/Imported main-2/)).toBeVisible({ timeout: 10_000 });

  expect(readFileSync(MAP_PATH, 'utf8')).toBe(before);
  expect(existsSync(path.join(MAP_DIR, 'main-2.tour.json'))).toBe(true);
});

test('asks for the entries that cannot be represented and writes nothing on cancel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  const document = sampleMap(8);
  document.waypoints[0] = { ...document.waypoints[0], type: 'Mystery' as never };
  document.waypoints[1] = { ...document.waypoints[1], type: 'Ritual' as never };
  writeSource('odd.tour.json', document);

  await page.getByRole('button', { name: `Bring in maps to ${PROJECT_ID}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'One file' }).click();
  await chooseFolder(dialog, sourceDir);
  await dialog.getByRole('button', { name: 'odd.tour.json' }).click();

  await expect(dialog.getByText('odd would lose 2 waypoints.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Import' })).toBeDisabled();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(existsSync(path.join(MAP_DIR, 'odd.tour.json'))).toBe(false);

  await page.getByRole('button', { name: `Bring in maps to ${PROJECT_ID}` }).click();
  const again = page.getByRole('dialog');
  await again.getByRole('button', { name: 'One file' }).click();
  await chooseFolder(again, sourceDir);
  await again.getByRole('button', { name: 'odd.tour.json' }).click();
  await again.getByLabel('Confirm the entries that cannot be represented').check();
  await again.getByRole('button', { name: 'Import' }).click();
  await expect(again.getByText(/Imported odd/)).toBeVisible({ timeout: 10_000 });

  const written = JSON.parse(readFileSync(path.join(MAP_DIR, 'odd.tour.json'), 'utf8')) as MapDocument;
  expect(written.waypoints).toHaveLength(6);
});

test('refuses a file that is not a map and writes nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  writeSource('notes.json', 'not json');

  await page.getByRole('button', { name: `Bring in maps to ${PROJECT_ID}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'One file' }).click();
  await chooseFolder(dialog, sourceDir);
  await dialog.getByRole('button', { name: 'notes.json' }).click();

  await expect(dialog.getByRole('alert')).toContainText('notes.json');
  await expect(dialog.getByRole('button', { name: 'Import' })).toBeDisabled();
  expect(existsSync(path.join(MAP_DIR, 'notes.tour.json'))).toBe(false);
});

test('refuses a project folder that cannot be reached', async ({ request }: { request: APIRequestContext }) => {
  const gone = path.join(root, '.tmp', 'exchange-gone');
  freshFolder(gone);
  const created = await request.post('/api/workspace', { data: { path: gone } });
  expect(created.status()).toBe(201);
  const project = (await created.json()) as { project: { id: string } };
  rmSync(gone, { recursive: true, force: true });
  writeSource('main.tour.json', sampleMap(1));

  const response = await request.post('/api/exchange/import', {
    data: { projectId: project.project.id, path: path.join(sourceDir, 'main.tour.json') },
  });

  expect(response.status()).toBe(409);
  const body = (await response.json()) as { error: string };
  expect(body.error).toBe('project-unavailable');
});

test('exports every map of a project into one folder', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  writeFileSync(path.join(MAP_DIR, 'backend.tour.json'), `${JSON.stringify(sampleMap(4, 1), null, 2)}\n`, 'utf8');
  writeFileSync(path.join(MAP_DIR, 'frontend.tour.json'), `${JSON.stringify(sampleMap(3), null, 2)}\n`, 'utf8');
  await openSample(page);

  await page.getByRole('button', { name: 'Export all maps' }).click();
  const dialog = page.getByRole('dialog');
  await chooseFolder(dialog, copyDir);
  await dialog.getByRole('button', { name: /Export \d+ maps?/ }).click();

  await expect(dialog.getByText(/Saved 3 of 3 maps/)).toBeVisible({ timeout: 10_000 });
  expect(readdirSync(copyDir).sort()).toEqual(['backend.tour.json', 'frontend.tour.json', 'main.tour.json']);
  for (const file of ['main.tour.json', 'backend.tour.json', 'frontend.tour.json']) {
    expect(readFileSync(path.join(copyDir, file), 'utf8')).toBe(readFileSync(path.join(MAP_DIR, file), 'utf8'));
  }
});

test('brings a folder of maps in, skipping a name that is already there', async ({ request }) => {
  freshFolder(path.join(beaconDir, '.ctour'));
  writeFileSync(path.join(beaconDir, '.ctour', 'main.tour.json'), JSON.stringify(sampleMap(1)), 'utf8');
  const registered = await request.post('/api/workspace', { data: { path: beaconDir } });
  expect(registered.status()).toBe(201);
  const beacon = (await registered.json()) as { project: { id: string } };

  for (const file of ['main.tour.json', 'backend.tour.json', 'frontend.tour.json']) {
    writeFileSync(path.join(copyDir, file), `${JSON.stringify(sampleMap(2), null, 2)}\n`, 'utf8');
  }

  const response = await request.post('/api/exchange/import', {
    data: { projectId: beacon.project.id, folder: copyDir },
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    added: Array<{ file: string }>;
    skipped: Array<{ file: string; text: string }>;
  };
  expect(body.added.map(entry => entry.file).sort()).toEqual(['backend.tour.json', 'frontend.tour.json']);
  expect(body.skipped).toHaveLength(1);
  expect(body.skipped[0].text).toContain('already in this project');
  expect(readdirSync(path.join(beaconDir, '.ctour')).sort()).toEqual([
    'backend.tour.json',
    'frontend.tour.json',
    'main.tour.json',
  ]);
  expect(JSON.parse(readFileSync(path.join(beaconDir, '.ctour', 'main.tour.json'), 'utf8')).waypoints).toHaveLength(1);
});

test('reports a folder entry that is not a map and still brings the rest', async ({ request }) => {
  freshFolder(path.join(beaconDir, '.ctour'));
  writeFileSync(path.join(beaconDir, '.ctour', 'main.tour.json'), JSON.stringify(sampleMap(1)), 'utf8');
  const registered = await request.post('/api/workspace', { data: { path: beaconDir } });
  const beacon = (await registered.json()) as { project: { id: string } };
  writeFileSync(path.join(copyDir, 'alpha.tour.json'), JSON.stringify(sampleMap(2)), 'utf8');
  writeFileSync(path.join(copyDir, 'notes.json'), 'not json', 'utf8');

  const response = await request.post('/api/exchange/import', {
    data: { projectId: beacon.project.id, folder: copyDir },
  });

  const body = (await response.json()) as {
    added: Array<{ file: string }>;
    skipped: Array<{ file: string; text: string }>;
  };
  expect(body.added.map(entry => entry.file)).toEqual(['alpha.tour.json']);
  expect(body.skipped.find(entry => entry.file === 'notes.json')?.text).toContain('notes.json');
  expect(existsSync(path.join(beaconDir, '.ctour', 'alpha.tour.json'))).toBe(true);
});
