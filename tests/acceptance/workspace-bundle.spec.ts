import { execFile, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { emptyDocument, writeMap } from '@/app/lib/workspace/map-file';
import { registerProject, writeLastView } from '@/app/lib/workspace/registry';
import { writeCachedMap } from '@/app/lib/workspace/cache';
import type { MapDocument } from '@/app/lib/workspace/types';

const run = promisify(execFile);
const root = process.cwd();
const cli = path.join(root, 'dist', 'cli.mjs');
const scratch = path.join(root, '.tmp', 'workspace-accept');

function documentFor(name: string, waypoints: number): MapDocument {
  const document = emptyDocument(name);
  document.waypoints = Array.from({ length: waypoints }, (_, index) => ({
    id: `w-${index + 1}`,
    label: `${name} ${index + 1}`,
    type: 'Goal' as const,
    position: { x: index * 240, y: 80 },
  }));
  return document;
}

function sandbox(name: string): { base: string; moved: string; first: string; second: string } {
  const base = mkdtempSync(path.join(scratch, `${name}-`));
  const moved = path.join(base, 'moved');
  const first = path.join(base, 'first-home');
  const second = path.join(base, 'second-home');
  mkdirSync(moved);
  mkdirSync(first);
  mkdirSync(second);
  return { base, moved, first, second };
}

async function seed(home: string, moved: string): Promise<void> {
  for (const name of ['atlas', 'beacon']) {
    const folder = path.join(projectsIn(home), name);
    mkdirSync(folder, { recursive: true });
    const project = await registerProject(folder, home);
    await writeMap(folder, 'main.tour.json', documentFor(name, 2));
    await writeCachedMap(home, project.id, 'main.tour.json', documentFor(name, 2));
    await writeMap(path.join(moved, name), 'main.tour.json', documentFor(name, 2));
    if (name === 'atlas') {
      await writeLastView({ projectId: project.id, mapFile: 'main.tour.json', tourId: null, step: 0 }, home);
    }
  }
}

function projectsIn(home: string): string {
  return path.join(home, 'projects');
}

async function cliRun(args: string[], home: string, cwd: string): Promise<{ code: number; out: string }> {
  try {
    const { stdout } = await run(process.execPath, [cli, ...args], {
      cwd,
      env: { ...process.env, CTOUR_HOME: home },
    });
    return { code: 0, out: stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

test.beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  execSync('npm run build:pack && npm run build:cli', { cwd: root, stdio: 'ignore' });
});

test('carries a workspace to a machine whose folders are elsewhere', async () => {
  const { base: folder, moved, first, second } = sandbox('move');
  await seed(first, moved);
  const file = path.join(folder, 'workspace.json');

  const exported = await cliRun(['workspace', 'export', file], first, folder);
  expect(exported.code).toBe(0);
  expect(exported.out).toContain('2 projects, 2 maps, last view atlas/main.tour.json');

  const imported = await cliRun(
    [
      'workspace',
      'import',
      file,
      '--project',
      `atlas=${path.join(moved, 'atlas')}`,
      '--project',
      `beacon=${path.join(moved, 'beacon')}`,
    ],
    second,
    folder
  );

  expect(imported.code).toBe(0);
  expect(imported.out).toContain('2 projects added');
  const registry = JSON.parse(readFileSync(path.join(second, 'workspace.json'), 'utf8')) as {
    projects: Array<{ name: string; path: string }>;
    lastView?: { mapFile: string };
  };
  expect(registry.projects.map(project => project.name).sort()).toEqual(['atlas', 'beacon']);
  expect(registry.projects.find(project => project.name === 'atlas')?.path).toBe(path.join(moved, 'atlas'));
  expect(registry.lastView?.mapFile).toBe('main.tour.json');
});

test('reports a project left out and changes nothing else', async () => {
  const { base: folder, moved, first, second } = sandbox('leftout');
  await seed(first, moved);
  const file = path.join(folder, 'workspace.json');
  await cliRun(['workspace', 'export', file], first, folder);
  execSync(`rm -rf ${JSON.stringify(path.join(projectsIn(first), 'beacon'))}`);

  const imported = await cliRun(['workspace', 'import', file], second, folder);

  expect(imported.code).toBe(1);
  expect(imported.out).toContain('no folder at');
  expect(imported.out).toContain('rerun with --project beacon=');
  const registry = JSON.parse(readFileSync(path.join(second, 'workspace.json'), 'utf8')) as {
    projects: Array<{ name: string }>;
  };
  expect(registry.projects.map(project => project.name)).toEqual(['atlas']);
});

test('adds nothing the second time and says so', async () => {
  const { base: folder, moved, first, second } = sandbox('twice');
  await seed(first, moved);
  const file = path.join(folder, 'workspace.json');
  await cliRun(['workspace', 'export', file], first, folder);
  const flags = [
    '--project',
    `atlas=${path.join(moved, 'atlas')}`,
    '--project',
    `beacon=${path.join(moved, 'beacon')}`,
  ];

  await cliRun(['workspace', 'import', file, ...flags], second, folder);
  const again = await cliRun(['workspace', 'import', file, ...flags], second, folder);

  expect(again.code).toBe(0);
  expect(again.out).toContain('0 projects added, 0 maps copied, 0 left out');
  expect(again.out).toContain('already in your workspace');
});

test('refuses a file that is not a workspace file', async () => {
  const { base: folder, second } = sandbox('refuse');
  const file = path.join(folder, 'notes.json');
  execSync(`printf 'not json' > ${JSON.stringify(file)}`);

  const imported = await cliRun(['workspace', 'import', file], second, folder);

  expect(imported.code).toBe(3);
  expect(imported.out).toContain('not a workspace file');
});

test('shows the imported projects in the interface', async ({ page }) => {
  const { base: folder, moved, first, second } = sandbox('interface');
  await seed(first, moved);
  const file = path.join(folder, 'workspace.json');
  await cliRun(['workspace', 'export', file], first, folder);
  await cliRun(
    [
      'workspace',
      'import',
      file,
      '--project',
      `atlas=${path.join(moved, 'atlas')}`,
      '--project',
      `beacon=${path.join(moved, 'beacon')}`,
    ],
    second,
    folder
  );

  execSync('npm run build:pack', { cwd: root, stdio: 'ignore' });
  execSync('npm run build:pack', { cwd: root, stdio: 'ignore' });
  const child = execFile(process.execPath, [cli, 'serve'], {
    cwd: folder,
    env: { ...process.env, CTOUR_HOME: second },
  });
  let output = '';
  try {
    const address = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no address printed: ${output}`)), 30_000);
      const read = (chunk: Buffer) => {
        output += chunk.toString();
        const match = output.match(/open\s+(http:\/\/127\.0\.0\.1:\d+\S*)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      };
      child.stdout?.on('data', read);
      child.stderr?.on('data', chunk => {
        output += chunk.toString();
      });
    });

    expect(existsSync(path.join(second, 'cache', 'atlas', 'main.tour.json'))).toBe(false);
    await page.goto(address);
    await expect(page.getByRole('link', { name: 'main', exact: true })).toHaveCount(2, { timeout: 10_000 });
    await expect(page.getByText('atlas', { exact: true })).toBeVisible();
    await expect(page.getByText('beacon', { exact: true })).toBeVisible();
  } finally {
    child.kill('SIGINT');
  }
});
