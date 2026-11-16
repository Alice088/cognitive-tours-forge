import { execSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { PROJECT_ID, ensureProject } from './fixtures';

const root = process.cwd();
const cli = path.join(root, 'dist', 'cli.mjs');
const home = path.join(root, '.tmp', 'e2e-home');
const mapFile = 'main.tour.json';

class Agent {
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<number, (value: Record<string, unknown>) => void>();

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      let index = this.buffer.indexOf('\n');
      while (index >= 0) {
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        index = this.buffer.indexOf('\n');
        if (line.trim() === '') continue;
        const frame = JSON.parse(line) as Record<string, unknown>;
        const id = frame.id as number;
        const resolve = this.pending.get(id);
        if (resolve) {
          this.pending.delete(id);
          resolve(frame);
        }
      }
    });
  }

  call(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise(resolve => {
      this.pending.set(id, resolve);
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  tool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call('tools/call', { name, arguments: args }).then(frame => {
      const result = (frame.result ?? {}) as Record<string, unknown>;
      return (result.structuredContent ?? {}) as Record<string, unknown>;
    });
  }

  close(): void {
    this.child.stdin.end();
    this.child.kill('SIGTERM');
  }
}

async function startAgent(): Promise<Agent> {
  const child = spawn(process.execPath, [cli, 'mcp'], {
    cwd: root,
    env: { ...process.env, CTOUR_HOME: home },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const agent = new Agent(child);
  await agent.call('initialize', { protocolVersion: '2025-06-18', capabilities: {} });
  return agent;
}

test.beforeAll(() => {
  execSync('npm run build:pack && npm run build:cli', { cwd: root, stdio: 'ignore' });
});

test.beforeEach(async ({ request }) => {
  await ensureProject(request);
});

test('shows a waypoint the agent adds within a second, twenty times', async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await startAgent();
  try {
    const before = await agent.tool('read_map', { project: PROJECT_ID, map: mapFile });
    const baseline = ((before.document as { waypoints: unknown[] }).waypoints ?? []).length;
    await page.goto(`/p/${PROJECT_ID}/${mapFile}`);
    await expect(page.getByText(`${baseline} of ${baseline} waypoints`)).toBeVisible();

    for (let index = 0; index < 20; index += 1) {
      const state = String((await agent.tool('read_map', { project: PROJECT_ID, map: mapFile })).state);
      const label = `Agent note ${index}`;
      const started = Date.now();
      await agent.tool('create_waypoint', { project: PROJECT_ID, map: mapFile, state, label, type: 'AI Instruction' });
      const total = baseline + index + 1;
      await expect(page.getByText(`${total} of ${total} waypoints`)).toBeVisible({ timeout: 1000 });
      expect(Date.now() - started).toBeLessThan(1000);
    }
  } finally {
    agent.close();
  }
});

test('removes a waypoint the agent deletes', async ({ page }) => {
  const agent = await startAgent();
  try {
    await page.goto(`/p/${PROJECT_ID}/${mapFile}`);
    await expect(page.getByText('Waypoints carry meaning')).toBeVisible();

    const state = String((await agent.tool('read_map', { project: PROJECT_ID, map: mapFile })).state);
    await agent.tool('delete_waypoint', { project: PROJECT_ID, map: mapFile, state, waypoint: 'w-2' });

    await expect(page.getByText('Waypoints carry meaning')).toHaveCount(0, { timeout: 1000 });
  } finally {
    agent.close();
  }
});

test('lets a person keep their own edit when the agent writes meanwhile', async ({ page }) => {
  const agent = await startAgent();
  try {
    await page.goto(`/p/${PROJECT_ID}/${mapFile}`);
    await page.getByText('Config is read from disk').click();
    const notes = page.getByLabel('Notes');
    await notes.fill('Half-written thought');

    const state = String((await agent.tool('read_map', { project: PROJECT_ID, map: mapFile })).state);
    await agent.tool('create_waypoint', {
      project: PROJECT_ID,
      map: mapFile,
      state,
      label: 'From the agent',
      type: 'Feature',
    });

    await expect(page.getByRole('button', { name: 'Keep mine' })).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Keep mine' }).click();
    await expect(page.getByLabel('Notes')).toHaveValue('Half-written thought');
  } finally {
    agent.close();
  }
});
