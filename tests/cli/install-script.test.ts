import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  it('builds from source when the packed release is older than the branch', () => {
    const fakeBin = path.join(sandbox, 'fake-bin');
    execFileSync('mkdir', ['-p', fakeBin]);
    const tarball = path.join(sandbox, 'ctour-9.9.9.tgz');
    execFileSync('sh', [
      '-c',
      `mkdir -p "${path.join(sandbox, 'pack', 'package', 'dist')}" && printf '{"commit":"aaaa","dirty":false}' > "${path.join(sandbox, 'pack', 'package', 'dist', 'build.json')}" && tar -czf "${tarball}" -C "${path.join(sandbox, 'pack')}" package`,
    ]);
    const curl = path.join(fakeBin, 'curl');
    writeFileSync(
      curl,
      `#!/bin/sh
out=""
head=0
for arg in "$@"; do
  case "$arg" in
    --head) head=1 ;;
    -o) want_out=1 ;;
    *) if [ "\${want_out:-}" = 1 ]; then out="$arg"; want_out=0; fi ;;
  esac
  case "$arg" in
    *package.json) body='{"version":"9.9.9"}' ;;
    *api.github.com*) body='{"sha":"bbbb"}' ;;
    *archive/refs*) exit 22 ;;
  esac
done
if [ -n "$out" ]; then cp "${tarball}" "$out"; exit 0; fi
if [ "$head" = 1 ]; then exit 0; fi
[ -n "\${body:-}" ] && printf '%s' "$body"
exit 0
`,
      'utf8'
    );
    chmodSync(curl, 0o755);

    const result = run(['--prefix', path.join(sandbox, 'prefix')], {
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
      CTOUR_REPO: 'test/repo',
    });

    expect(result.stdout).toContain('building from source');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot download the sources');
  });

  it('refuses a packed release built from uncommitted changes', () => {
    const fakeBin = path.join(sandbox, 'fake-bin-dirty');
    execFileSync('mkdir', ['-p', fakeBin]);
    const pack = path.join(sandbox, 'pack-dirty');
    execFileSync('sh', [
      '-c',
      `mkdir -p "${path.join(pack, 'package', 'dist')}" && printf '{"commit":"bbbb","dirty":true}' > "${path.join(pack, 'package', 'dist', 'build.json')}" && tar -czf "${path.join(sandbox, 'dirty.tgz')}" -C "${pack}" package`,
    ]);
    const curl = path.join(fakeBin, 'curl');
    writeFileSync(
      curl,
      `#!/bin/sh
out=""
head=0
for arg in "$@"; do
  case "$arg" in
    --head) head=1 ;;
    -o) want_out=1 ;;
    *) if [ "\${want_out:-}" = 1 ]; then out="$arg"; want_out=0; fi ;;
  esac
  case "$arg" in
    *package.json) body='{"version":"9.9.9"}' ;;
    *api.github.com*) body='{"sha":"bbbb"}' ;;
    *archive/refs*) exit 22 ;;
  esac
done
if [ -n "$out" ]; then cp "${path.join(sandbox, 'dirty.tgz')}" "$out"; exit 0; fi
if [ "$head" = 1 ]; then exit 0; fi
[ -n "\${body:-}" ] && printf '%s' "$body"
exit 0
`,
      'utf8'
    );
    chmodSync(curl, 0o755);

    const result = run(['--prefix', path.join(sandbox, 'prefix-dirty')], {
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
      CTOUR_REPO: 'test/repo',
    });

    expect(result.stdout).toContain('uncommitted changes');
    expect(result.status).toBe(1);
  });

  it('documents the repository and branch it reads from', () => {
    const text = readFileSync(script, 'utf8');
    expect(text).toContain('CTOUR_REPO:-Alice088/cognitive-tours-forge');
    expect(text).toContain('CTOUR_BRANCH:-main');
    expect(text).toContain('releases/download');
  });
});
