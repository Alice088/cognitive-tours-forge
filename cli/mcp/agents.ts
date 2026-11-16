import { promises as fs, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  appendTomlEntry,
  findEntry,
  inlineTomlEntries,
  insertEntry,
  readTomlEntry,
  replaceEntry,
  replaceTomlEntry,
  verifyJson,
} from './config-text';

export type AgentName = 'claude-code' | 'cursor' | 'gemini-cli' | 'codex';

export type AgentAdapter = {
  name: AgentName;
  label: string;
  format: 'json' | 'toml';
  entryPath: string[];
  configPath: (home: string) => string;
  folderPath: (home: string) => string;
};

export type ConnectionEntry = { command: string; args: string[] };

export type ConnectionResult = {
  agent: AgentAdapter;
  path: string;
  change: 'added' | 'updated' | 'unchanged' | 'unreadable';
  reason?: string;
};

const ENTRY: ConnectionEntry = { command: 'ctour', args: ['mcp'] };

export const ADAPTERS: AgentAdapter[] = [
  {
    name: 'claude-code',
    label: 'claude-code',
    format: 'json',
    entryPath: ['mcpServers', 'ctour'],
    configPath: home => path.join(home, '.claude.json'),
    folderPath: home => path.join(home, '.claude'),
  },
  {
    name: 'cursor',
    label: 'cursor',
    format: 'json',
    entryPath: ['mcpServers', 'ctour'],
    configPath: home => path.join(home, '.cursor', 'mcp.json'),
    folderPath: home => path.join(home, '.cursor'),
  },
  {
    name: 'gemini-cli',
    label: 'gemini-cli',
    format: 'json',
    entryPath: ['mcpServers', 'ctour'],
    configPath: home => path.join(home, '.gemini', 'settings.json'),
    folderPath: home => path.join(home, '.gemini'),
  },
  {
    name: 'codex',
    label: 'codex',
    format: 'toml',
    entryPath: ['mcp_servers', 'ctour'],
    configPath: home => path.join(home, '.codex', 'config.toml'),
    folderPath: home => path.join(home, '.codex'),
  },
];

async function exists(target: string): Promise<boolean> {
  return fs
    .stat(target)
    .then(() => true)
    .catch(() => false);
}

export async function detect(userHome: string = homedir()): Promise<AgentAdapter[]> {
  const found: AgentAdapter[] = [];
  for (const adapter of ADAPTERS) {
    if ((await exists(adapter.configPath(userHome))) || (await exists(adapter.folderPath(userHome)))) {
      found.push(adapter);
    }
  }
  return found;
}

export function connectionFor(): ConnectionEntry {
  const candidate = process.argv[1];
  if (candidate) {
    const resolved = path.resolve(candidate);
    try {
      const stat = statSync(resolved);
      if (stat.isFile() && (stat.mode & 0o111) !== 0 && resolved.endsWith('.mjs')) {
        return { command: resolved, args: ['mcp'] };
      }
    } catch {
      return { command: ENTRY.command, args: [...ENTRY.args] };
    }
  }
  return { command: ENTRY.command, args: [...ENTRY.args] };
}

function sameEntry(left: ConnectionEntry, right: ConnectionEntry | null): boolean {
  return (
    right !== null &&
    left.command === right.command &&
    left.args.length === right.args.length &&
    left.args.every((arg, index) => arg === right.args[index])
  );
}

export async function readConnection(
  adapter: AgentAdapter,
  userHome: string = homedir()
): Promise<ConnectionEntry | null> {
  const file = adapter.configPath(userHome);
  const text = await fs.readFile(file, 'utf8').catch(() => null);
  if (text === null) return null;
  if (adapter.format === 'toml') {
    return readTomlEntry(text, adapter.entryPath);
  }
  const parsed = JSON.parse(text) as Record<string, Record<string, ConnectionEntry>>;
  const group = parsed[adapter.entryPath[0]];
  return group ? (group[adapter.entryPath[1]] ?? null) : null;
}

export async function installInto(
  adapter: AgentAdapter,
  userHome: string = homedir(),
  entry: ConnectionEntry = connectionFor()
): Promise<ConnectionResult> {
  const file = adapter.configPath(userHome);
  const original = await fs.readFile(file, 'utf8').catch(() => null);
  const text = original ?? (adapter.format === 'json' ? '{}' : '');
  const readable = (): string | null => {
    try {
      if (adapter.format === 'json') JSON.parse(text);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'it is not valid JSON';
    }
  };
  const broken = readable();
  if (broken !== null) {
    return { agent: adapter, path: file, change: 'unreadable', reason: broken };
  }

  if (adapter.format === 'toml') {
    const existing = readTomlEntry(text, adapter.entryPath);
    if (sameEntry(entry, existing)) {
      return { agent: adapter, path: file, change: 'unchanged' };
    }
    if (existing !== null) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, replaceTomlEntry(text, adapter.entryPath, entry), 'utf8');
      return { agent: adapter, path: file, change: 'updated' };
    }
    if (inlineTomlEntries(text)) {
      return { agent: adapter, path: file, change: 'unreadable', reason: 'mcp_servers is written inline' };
    }
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, appendTomlEntry(text, adapter.entryPath, entry), 'utf8');
    return { agent: adapter, path: file, change: 'added' };
  }

  const current = findEntry(text, adapter.entryPath);
  const next = current ? replaceEntry(text, adapter.entryPath, entry) : insertEntry(text, adapter.entryPath, entry);
  if (!verifyJson(text, next, adapter.entryPath, entry)) {
    return { agent: adapter, path: file, change: 'unreadable', reason: 'the edit would change another entry' };
  }
  if (
    JSON.stringify(JSON.parse(text)[adapter.entryPath[0]]?.[adapter.entryPath[1]] ?? null) === JSON.stringify(entry)
  ) {
    return { agent: adapter, path: file, change: 'unchanged' };
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next, 'utf8');
  return { agent: adapter, path: file, change: current ? 'updated' : 'added' };
}

export function snippetFor(adapter: AgentAdapter, entry: ConnectionEntry = ENTRY): string[] {
  if (adapter.format === 'toml') {
    return [
      `add this to ${adapter.configPath('~')}:`,
      `  [${adapter.entryPath.join('.')}]`,
      `  command = ${JSON.stringify(entry.command)}`,
      `  args = [${entry.args.map(arg => JSON.stringify(arg)).join(', ')}]`,
    ];
  }
  const body = JSON.stringify({ [adapter.entryPath[0]]: { [adapter.entryPath[1]]: entry } });
  return [`add this to ${adapter.configPath('~')}:`, `  ${body}`];
}

export async function reportAgents(
  userHome: string = homedir()
): Promise<Array<{ id: string; ok: boolean; detail: string; fix: string }>> {
  const checks: Array<{ id: string; ok: boolean; detail: string; fix: string }> = [];
  for (const adapter of await detect(userHome)) {
    const file = adapter.configPath(userHome);
    let entry: ConnectionEntry | null = null;
    try {
      entry = await readConnection(adapter, userHome);
    } catch {
      checks.push({
        id: `agent:${adapter.name}`,
        ok: false,
        detail: `${file} cannot be read`,
        fix: 'ctour mcp install',
      });
      continue;
    }
    if (entry === null) {
      checks.push({
        id: `agent:${adapter.name}`,
        ok: true,
        detail: `not connected; run \`ctour mcp install\``,
        fix: 'ctour mcp install',
      });
      continue;
    }
    const command = entry.command.startsWith('/') ? entry.command : null;
    const present = command === null ? await onPath(entry.command) : await exists(command);
    checks.push(
      present
        ? { id: `agent:${adapter.name}`, ok: true, detail: `connected in ${file}`, fix: 'ctour mcp install' }
        : {
            id: `agent:${adapter.name}`,
            ok: false,
            detail: `${file} points at ${entry.command}, which is gone; run \`ctour mcp install\``,
            fix: 'ctour mcp install',
          }
    );
  }
  return checks;
}

async function onPath(command: string): Promise<boolean> {
  const folders = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const folder of folders) {
    if (await exists(path.join(folder, command))) return true;
  }
  return false;
}
