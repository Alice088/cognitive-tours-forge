import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { runDoctor } from '@/cli/commands/doctor';
import { main } from '@/cli/lib/run';
import { snapshot } from './mcp-fixtures';

const roots: string[] = [];

function home(): string {
  const root = mkdtempSync(path.join(homedir(), '.ctour-doctor-agent-'));
  roots.push(root);
  return root;
}

function write(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

async function captured(run: () => Promise<number>): Promise<{ code: number; out: string }> {
  let out = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
    out += String(chunk);
    return true;
  });
  try {
    return { code: await run(), out };
  } finally {
    spy.mockRestore();
  }
}

describe('agent checks', () => {
  it('passes when the agent is connected and the command exists', async () => {
    const root = home();
    const binary = path.join(root, 'bin', 'ctour');
    write(binary, '');
    write(
      path.join(root, '.claude.json'),
      JSON.stringify({ mcpServers: { ctour: { command: binary, args: ['mcp'] } } })
    );

    const report = await runDoctor(root, root);
    const check = report.checks.find(entry => entry.id === 'agent:claude-code');

    expect(check?.ok).toBe(true);
    expect(check?.target).toContain('.claude.json');
    expect(report.ok).toBe(true);
  });

  it('fails and names the fix when the command is gone', async () => {
    const root = home();
    write(
      path.join(root, '.claude.json'),
      JSON.stringify({ mcpServers: { ctour: { command: '/old/ctour', args: ['mcp'] } } })
    );

    const report = await runDoctor(root, root);
    const check = report.checks.find(entry => entry.id === 'agent:claude-code');

    expect(check?.ok).toBe(false);
    expect(check?.reason).toContain('/old/ctour');
    expect(check?.fix).toBe('ctour mcp install');
    expect(report.ok).toBe(false);
  });

  it('passes with a hint when the agent is not connected', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{"mcpServers":{}}');

    const report = await runDoctor(root, root);
    const check = report.checks.find(entry => entry.id === 'agent:claude-code');

    expect(check?.ok).toBe(true);
    expect(check?.target).toContain('not connected');
  });

  it('reports a configuration it cannot read', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{"mcpServers":');

    const report = await runDoctor(root, root);
    const check = report.checks.find(entry => entry.id === 'agent:claude-code');

    expect(check?.ok).toBe(false);
    expect(check?.fix).toBe('ctour mcp install');
  });

  it('says nothing about agents that are not on the machine', async () => {
    const root = home();

    const report = await runDoctor(root, root);

    expect(report.checks.filter(entry => entry.id.startsWith('agent:'))).toEqual([]);
  });

  it('changes nothing on any run', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{"mcpServers":{}}');
    write(path.join(root, '.codex', 'config.toml'), '[mcp_servers.ctour]\ncommand = "ctour"\nargs = ["mcp"]\n');
    const before = snapshot(root);

    await runDoctor(root, root);
    await runDoctor(root, root);

    expect(snapshot(root)).toEqual(before);
  });

  it('carries the same checks through --json', async () => {
    const root = home();
    write(path.join(root, '.claude.json'), '{"mcpServers":{}}');

    const { out } = await captured(() => main(['doctor', '--json'], { home: root, userHome: root }));
    const parsed = JSON.parse(out) as { checks: Array<{ id: string }> };

    expect(parsed.checks.map(check => check.id)).toContain('agent:claude-code');
  });
});
