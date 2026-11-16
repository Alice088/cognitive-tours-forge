import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADAPTERS,
  connectionFor,
  detect,
  installInto,
  readConnection,
  type AgentAdapter,
  type ConnectionEntry,
} from '@/cli/mcp/agents';
import { installAgent } from '@/cli/commands/mcp';

const roots: string[] = [];
const entry: ConnectionEntry = { command: '/opt/bin/ctour', args: ['mcp'] };

function home(): string {
  const root = mkdtempSync(path.join(homedir(), '.ctour-install-'));
  roots.push(root);
  return root;
}

function adapter(name: string): AgentAdapter {
  return ADAPTERS.find(one => one.name === name)!;
}

function write(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
}

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

async function quiet<T>(run: () => Promise<T>): Promise<{ value: T; out: string }> {
  let out = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
    out += String(chunk);
    return true;
  });
  try {
    return { value: await run(), out };
  } finally {
    spy.mockRestore();
  }
}

describe('detection', () => {
  it('finds an agent by its configuration file', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{}');

    expect((await detect(root)).map(one => one.name)).toEqual(['claude-code']);
  });

  it('finds an agent by its configuration folder', async () => {
    const root = home();
    mkdirSync(path.join(root, '.cursor'), { recursive: true });

    expect((await detect(root)).map(one => one.name)).toEqual(['cursor']);
  });

  it('finds nothing on a machine without agents', async () => {
    expect(await detect(home())).toEqual([]);
  });
});

describe('JSON configuration', () => {
  it('adds the entry and keeps every other byte', async () => {
    const root = home();
    const file = path.join(root, '.claude.json');
    const original = '{"mcpServers":{"other":{"command":"other","args":[]}},"theme":"dark"}';
    write(file, original);

    const result = await installInto(adapter('claude-code'), root, entry);

    expect(result.change).toBe('added');
    const updated = readFileSync(file, 'utf8');
    expect(updated).toContain('"theme":"dark"');
    expect(updated).toContain('{"command":"other","args":[]}');
    expect(JSON.parse(updated).mcpServers.ctour).toEqual(entry);
    expect(updated).toContain('"other":{"command":"other","args":[]}');
    expect(updated.endsWith(',"theme":"dark"}')).toBe(true);
  });

  it('adds the group when the file has none', async () => {
    const root = home();
    const file = path.join(root, '.claude.json');
    write(file, '{\n  "theme": "dark"\n}\n');

    await installInto(adapter('claude-code'), root, entry);

    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    expect(parsed).toEqual({ theme: 'dark', mcpServers: { ctour: entry } });
  });

  it('creates the file when only the folder exists', async () => {
    const root = home();
    mkdirSync(path.join(root, '.cursor'), { recursive: true });

    const result = await installInto(adapter('cursor'), root, entry);

    expect(result.change).toBe('added');
    expect(JSON.parse(readFileSync(path.join(root, '.cursor', 'mcp.json'), 'utf8'))).toEqual({
      mcpServers: { ctour: entry },
    });
  });

  it('replaces a stale entry in place', async () => {
    const root = home();
    const file = path.join(root, '.claude.json');
    write(file, '{"mcpServers":{"ctour":{"command":"/old/ctour","args":["mcp"]},"other":{"command":"other"}}}');

    const result = await installInto(adapter('claude-code'), root, entry);

    expect(result.change).toBe('updated');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    expect(parsed.mcpServers.ctour).toEqual(entry);
    expect(parsed.mcpServers.other).toEqual({ command: 'other' });
  });

  it('touches nothing on a second run', async () => {
    const root = home();
    const file = path.join(root, '.claude.json');
    write(file, '{"mcpServers":{"other":{"command":"other"}}}');
    await installInto(adapter('claude-code'), root, entry);
    const after = readFileSync(file, 'utf8');

    const result = await installInto(adapter('claude-code'), root, entry);

    expect(result.change).toBe('unchanged');
    expect(readFileSync(file, 'utf8')).toBe(after);
  });

  it('reports a file it cannot read and leaves it alone', async () => {
    const root = home();
    const file = path.join(root, '.claude.json');
    write(file, '{"mcpServers":');

    const result = await installInto(adapter('claude-code'), root, entry);

    expect(result.change).toBe('unreadable');
    expect(readFileSync(file, 'utf8')).toBe('{"mcpServers":');
  });

  it('reads back what it wrote', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{}');
    await installInto(adapter('claude-code'), root, entry);

    expect(await readConnection(adapter('claude-code'), root)).toEqual(entry);
  });
});

describe('TOML configuration', () => {
  it('appends the block at the end', async () => {
    const root = home();
    const file = path.join(root, '.codex', 'config.toml');
    write(file, 'model = "gpt"\n');

    const result = await installInto(adapter('codex'), root, entry);

    expect(result.change).toBe('added');
    const text = readFileSync(file, 'utf8');
    expect(text.startsWith('model = "gpt"\n')).toBe(true);
    expect(text).toContain('[mcp_servers.ctour]');
    expect(text).toContain('command = "/opt/bin/ctour"');
    expect(text).toContain('args = ["mcp"]');
  });

  it('does not append twice', async () => {
    const root = home();
    const file = path.join(root, '.codex', 'config.toml');
    write(file, 'model = "gpt"\n');
    await installInto(adapter('codex'), root, entry);
    const once = readFileSync(file, 'utf8');

    const result = await installInto(adapter('codex'), root, entry);

    expect(result.change).toBe('unchanged');
    expect(readFileSync(file, 'utf8')).toBe(once);
  });

  it('refuses a file that writes mcp_servers inline', async () => {
    const root = home();
    const file = path.join(root, '.codex', 'config.toml');
    write(file, 'mcp_servers = { other = { command = "other" } }\n');

    const result = await installInto(adapter('codex'), root, entry);

    expect(result.change).toBe('unreadable');
    expect(readFileSync(file, 'utf8')).toContain('mcp_servers = {');
  });

  it('reads the block back', async () => {
    const root = home();
    write(path.join(root, '.codex', 'config.toml'), '');
    await installInto(adapter('codex'), root, entry);

    expect(await readConnection(adapter('codex'), root)).toEqual(entry);
  });
});

describe('the install command', () => {
  it('connects every detected agent and tells the person to restart', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{}');
    write(path.join(root, '.codex', 'config.toml'), '');

    const { value: code, out } = await quiet(() => installAgent({ home: root, userHome: root }));

    expect(code).toBe(0);
    expect(out).toContain('claude-code');
    expect(out).toContain('codex');
    expect(out).toContain('restart the agent');
  });

  it('says already connected on a second run', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{}');
    await quiet(() => installAgent({ home: root, userHome: root }));

    const { value: code, out } = await quiet(() => installAgent({ home: root, userHome: root }));

    expect(code).toBe(0);
    expect(out).toContain('already connected');
  });

  it('prints the entries and writes nothing when no agent is present', async () => {
    const root = home();

    const { value: code, out } = await quiet(() => installAgent({ home: root, userHome: root }));

    expect(code).toBe(5);
    expect(out).toContain('no agent found');
    expect(out).toContain('mcpServers');
    expect(out).toContain('[mcp_servers.ctour]');
    expect(readdirSync(root)).toEqual([]);
  });

  it('exits 3 and still names the entry when a file cannot be read', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{"mcpServers":');

    const { value: code, out } = await quiet(() => installAgent({ home: root, userHome: root }));

    expect(code).toBe(3);
    expect(out).toContain('cannot read');
    expect(out).toContain('mcpServers');
  });
});

describe('the configured command', () => {
  it('is an absolute path when the running file is one, otherwise the name', () => {
    const resolved = connectionFor();

    expect(resolved.args).toEqual(['mcp']);
    expect(resolved.command === 'ctour' || path.isAbsolute(resolved.command)).toBe(true);
  });
});
