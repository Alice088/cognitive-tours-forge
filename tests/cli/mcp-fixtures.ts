import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { serializeDocument } from '@/app/lib/workspace/map-file';
import type { MapDocument } from '@/app/lib/workspace/types';
import { serve } from '@/cli/mcp/server';

export type Sandbox = { root: string; home: string; folder: string; mapFile: string };

export function mapDocument(overrides: Partial<MapDocument> = {}): MapDocument {
  return {
    version: 1,
    project: { name: 'Fixture', createdAt: '2026-01-01T00:00:00.000Z' },
    waypoints: [
      { id: 'w-goal', label: 'Ship the map', type: 'Goal', position: { x: 80, y: 80 } },
      { id: 'w-risk', label: 'Drift', type: 'Risk', description: 'The map rots', position: { x: 320, y: 80 } },
    ],
    edges: [{ id: 'e-w-goal-w-risk', source: 'w-goal', target: 'w-risk', label: 'threatens' }],
    tours: [
      {
        id: 't-main',
        name: 'Main walk',
        stops: [{ waypointId: 'w-goal', narrative: 'Start here' }, { waypointId: 'w-risk' }],
      },
    ],
    ...overrides,
  };
}

export function sandbox(document: MapDocument = mapDocument()): Sandbox {
  const root = mkdtempSync(path.join(homedir(), '.ctour-mcp-'));
  const home = path.join(root, 'home');
  const folder = path.join(root, 'repo');
  const mapFile = 'main.tour.json';
  mkdirSync(path.join(folder, '.ctour'), { recursive: true });
  mkdirSync(home, { recursive: true });
  writeFileSync(path.join(folder, '.ctour', mapFile), serializeDocument(document), 'utf8');
  writeRegistry(home, [{ id: 'repo', name: 'Repo', path: folder }]);
  return { root, home, folder, mapFile };
}

export function writeRegistry(home: string, projects: Array<{ id: string; name: string; path: string }>): void {
  const body = {
    version: 1,
    projects: projects.map(project => ({ ...project, addedAt: '2026-01-01T00:00:00.000Z' })),
  };
  mkdirSync(home, { recursive: true });
  writeFileSync(path.join(home, 'workspace.json'), `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

export function mapOnDisk(sandbox: Sandbox, file = sandbox.mapFile): string {
  return readFileSync(path.join(sandbox.folder, '.ctour', file), 'utf8');
}

export function parsedOnDisk(sandbox: Sandbox, file = sandbox.mapFile): MapDocument {
  return JSON.parse(mapOnDisk(sandbox, file)) as MapDocument;
}

export function snapshot(folder: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const entry of readdirSync(folder)) {
    if (entry === 'node_modules') continue;
    const target = path.join(folder, entry);
    if (statSync(target).isDirectory()) {
      found[entry] = JSON.stringify(snapshot(target));
    } else {
      found[entry] = createHash('sha256').update(readFileSync(target)).digest('hex');
    }
  }
  return found;
}

export type ProtocolSession = {
  call: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  notify: (method: string, params?: Record<string, unknown>) => void;
  raw: (text: string) => void;
  frames: string[];
  close: () => Promise<void>;
};

export function session(home: string): ProtocolSession {
  const input = new PassThrough();
  const output = new PassThrough();
  const done = serve({ home, input, output, version: '0.1.0' });

  const pending = new Map<number, (value: Record<string, unknown>) => void>();
  const frames: string[] = [];
  let buffer = '';
  let nextId = 1;

  output.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let index = buffer.indexOf('\n');
    while (index >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.trim() !== '') {
        frames.push(line);
        const frame = JSON.parse(line) as Record<string, unknown>;
        const id = frame.id as number | undefined;
        if (typeof id === 'number' && pending.has(id)) {
          pending.get(id)!(frame);
          pending.delete(id);
        }
      }
      index = buffer.indexOf('\n');
    }
  });

  return {
    call(method, params) {
      const id = nextId;
      nextId += 1;
      return new Promise(resolve => {
        pending.set(id, resolve);
        input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    notify(method, params) {
      input.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
    raw(text) {
      input.write(`${text}\n`);
    },
    frames,
    async close() {
      input.end();
      await done;
    },
  };
}

export async function open(home: string): Promise<{ session: ProtocolSession; call: ProtocolSession['call'] }> {
  const current = session(home);
  await current.call('initialize', { protocolVersion: '2025-06-18', capabilities: {} });
  current.notify('notifications/initialized');
  return { session: current, call: current.call };
}

export function resultOf(response: Record<string, unknown>): Record<string, unknown> {
  return (response.result ?? {}) as Record<string, unknown>;
}

export function structuredOf(response: Record<string, unknown>): Record<string, unknown> {
  return (resultOf(response).structuredContent ?? {}) as Record<string, unknown>;
}

export function textOf(response: Record<string, unknown>): string {
  const result = resultOf(response);
  const content = (result.content ?? []) as Array<{ text: string }>;
  return content.map(part => part.text).join('\n');
}

export function errorOf(response: Record<string, unknown>): { code: number; message: string } {
  return (response.error ?? {}) as { code: number; message: string };
}
