import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HELP, main, parseArgs } from '@/cli/lib/run';
import { VERSION } from '@/cli/lib/version';
import pkg from '../../package.json';

const created: string[] = [];

function home(): string {
  const dir = mkdtempSync(path.join(homedir(), '.ctour-dispatch-'));
  created.push(dir);
  return dir;
}

async function capture(
  argv: string[],
  overrides: Parameters<typeof main>[1] = {}
): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
    out += String(chunk);
    return true;
  });
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
    err += String(chunk);
    return true;
  });
  try {
    const code = await main(argv, { home: home(), ...overrides });
    return { code, out, err };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('dispatch', () => {
  it('lists every command in help', async () => {
    const { code, out } = await capture(['--help']);

    expect(code).toBe(0);
    for (const command of ['init', 'serve', 'status', 'doctor']) {
      expect(out).toContain(command);
    }
    expect(out.split('\n').length).toBeLessThan(20);
  });

  it('prints one version line', async () => {
    const { code, out } = await capture(['--version']);

    expect(code).toBe(0);
    expect(out.trim()).toBe(`ctour ${VERSION}`);
    expect(out.trim().split('\n')).toHaveLength(1);
  });

  it('keeps the version in step with the package', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('refuses an unknown command with the list', async () => {
    const { code, err } = await capture(['nope']);

    expect(code).toBe(2);
    expect(err).toContain('unknown command nope');
    expect(err).toContain('init');
  });

  it('refuses an unknown option', async () => {
    const { code, err } = await capture(['status', '--colour']);

    expect(code).toBe(2);
    expect(err).toContain('unknown option');
  });

  it('refuses a port that is not a number', () => {
    expect(() => parseArgs(['serve', '--port', 'abc'])).toThrow(/port/);
  });

  it('refuses --json outside the reporting commands', async () => {
    const { code, err } = await capture(['init', '--json']);

    expect(code).toBe(2);
    expect(err).toContain('--json');
  });

  it('refuses an extra argument', async () => {
    const { code } = await capture(['status', 'one', 'two']);

    expect(code).toBe(2);
  });

  it('reports an empty workspace without failing', async () => {
    const { code, out } = await capture(['status']);

    expect(code).toBe(0);
    expect(out).toContain('no projects yet');
  });

  it('reports a healthy workspace from doctor', async () => {
    const { code, out } = await capture(['doctor']);

    expect(code).toBe(0);
    expect(out).toContain('ok');
  });

  it('answers as JSON when asked', async () => {
    const { code, out } = await capture(['status', '--json']);

    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual({ version: 1, projects: [] });
  });

  it('names a command when none was given', async () => {
    const { code, err } = await capture([]);

    expect(code).toBe(2);
    expect(err).toContain('name a command');
    expect(HELP).toContain('doctor');
  });
});
