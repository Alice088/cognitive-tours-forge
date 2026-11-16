import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const script = path.join(root, 'install.sh');
const sandbox = mkdtempSync(path.join(tmpdir(), 'ctour-installer-'));
const isolated = path.join(sandbox, 'install.sh');
copyFileSync(script, isolated);
chmodSync(isolated, 0o755);

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function run(
  args: string[],
  env: Record<string, string> = {},
  shell = 'sh'
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(shell, [isolated, ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, ...env },
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failure.status ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

describe('install.sh', () => {
  it('passes a shell syntax check', () => {
    expect(() => execFileSync('sh', ['-n', script], { stdio: 'pipe' })).not.toThrow();
  });

  it('prints the one-line install command in its help', () => {
    const result = run(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'curl -fsSL https://raw.githubusercontent.com/Alice088/cognitive-tours-forge/main/install.sh | sh'
    );
    expect(result.stdout).toContain('--prefix');
  });

  it('prints its own version', () => {
    const result = run(['--version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('install.sh 0.1.0');
  });

  it('refuses an option it does not know', () => {
    const result = run(['--unpack']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown option --unpack');
  });

  it('refuses a machine without node before touching anything', () => {
    const empty = path.join(sandbox, 'empty-bin');
    execFileSync('mkdir', ['-p', empty]);
    const result = run([], { PATH: empty }, '/bin/sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Node.js is not installed');
  });

  it('documents the repository and branch it reads from', () => {
    const text = readFileSync(script, 'utf8');
    expect(text).toContain('CTOUR_REPO:-Alice088/cognitive-tours-forge');
    expect(text).toContain('CTOUR_BRANCH:-main');
    expect(text).toContain('releases/download');
  });
});
