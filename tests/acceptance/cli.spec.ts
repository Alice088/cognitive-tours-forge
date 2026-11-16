import { execSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const root = process.cwd();
const cli = path.join(root, 'dist', 'cli.mjs');
const scratch = path.join(root, '.tmp', 'cli-accept');

type Running = { address: string; output: string; stop: () => Promise<number>; elapsed: number };

function digest(folder: string): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(folder, { recursive: true }).map(String).sort()) {
    if (file.includes('.git/') || file.startsWith('.git')) {
      continue;
    }
    hash.update(file);
    try {
      hash.update(readFileSync(path.join(folder, file)));
    } catch {
      hash.update('dir');
    }
  }
  return hash.digest('hex');
}

function project(name: string): { folder: string; home: string } {
  const base = mkdtempSync(path.join(scratch, `${name}-`));
  const folder = path.join(base, 'repo');
  const home = path.join(base, 'home');
  mkdirSync(folder);
  mkdirSync(home);
  execSync('git init -q', { cwd: folder });
  return { folder, home };
}

async function launch(args: string[], home: string, cwd = root): Promise<Running> {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env, CTOUR_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  const stop = (): Promise<number> =>
    new Promise(resolve => {
      if (child.exitCode !== null) {
        resolve(child.exitCode);
        return;
      }
      child.once('exit', code => resolve(code ?? 0));
      child.kill('SIGINT');
    });

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
    child.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`exited with ${code}: ${output}`));
    });
  });

  return {
    address,
    get output() {
      return output;
    },
    stop,
    elapsed: 0,
  };
}

test.beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  execSync('npm run build:pack && npm run build:cli', { cwd: root, stdio: 'ignore' });
});

test('opens the map for a repository in one command', async ({ page }) => {
  const { folder, home } = project('one-command');
  const running = await launch(['init', folder], home);

  try {
    expect(running.address).toContain(`/p/${path.basename(folder)}/`);

    await page.goto(running.address);

    await expect(page.getByText('This map has no waypoints yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'repo' })).toBeVisible();
  } finally {
    await running.stop();
  }
});

test('changes no file when it runs a second time', async ({ page }) => {
  const { folder, home } = project('idempotent');

  const first = await launch(['init'], home, folder);
  const before = digest(folder);
  await first.stop();

  const second = await launch(['init'], home, folder);
  await page.goto(second.address);
  await expect(page.getByText('This map has no waypoints yet.')).toBeVisible();
  await second.stop();

  expect(digest(folder)).toBe(before);
});

test('takes another address when the first is busy', async ({ page }) => {
  const { folder, home } = project('busy');
  const first = await launch(['init'], home, folder);

  try {
    const second = await launch(['serve'], home, folder);
    try {
      expect(second.address).not.toBe(first.address);
      await page.goto(second.address);
      await expect(page.getByText('This map has no waypoints yet.')).toBeVisible();
    } finally {
      await second.stop();
    }
  } finally {
    await first.stop();
  }
});

test('returns the terminal within a second of the interrupt', async () => {
  const { folder, home } = project('interrupt');
  const running = await launch(['init', folder], home);
  const before = digest(folder);

  const started = Date.now();
  const code = await running.stop();
  const elapsed = Date.now() - started;

  expect(code).toBe(0);
  expect(elapsed).toBeLessThan(1000);
  expect(digest(folder)).toBe(before);
});

test('opens the workspace screen where there is no project', async ({ page }) => {
  const { home } = project('workspace-screen');
  const empty = mkdtempSync(path.join(scratch, 'empty-'));
  const running = await launch(['serve', empty], home);

  try {
    expect(running.output).toContain('not a project yet');
    await page.goto(running.address);
    await expect(page.getByText('No projects yet', { exact: false })).toBeVisible();
  } finally {
    await running.stop();
  }
});
