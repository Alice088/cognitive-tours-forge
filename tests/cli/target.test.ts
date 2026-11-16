import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TargetError, resolveTarget } from '@/cli/lib/target';

const created: string[] = [];

function sandbox(): string {
  const dir = mkdtempSync(path.join(homedir(), '.ctour-target-'));
  created.push(dir);
  return dir;
}

function repository(base: string, git: 'directory' | 'file' = 'directory'): string {
  const root = path.join(base, 'repo');
  mkdirSync(root, { recursive: true });
  if (git === 'directory') {
    mkdirSync(path.join(root, '.git'));
  } else {
    writeFileSync(path.join(root, '.git'), 'gitdir: /elsewhere\n', 'utf8');
  }
  return root;
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('target resolution', () => {
  it('walks up to the repository root', async () => {
    const base = sandbox();
    const root = repository(base);
    const nested = path.join(root, 'app', 'components');
    mkdirSync(nested, { recursive: true });

    const target = await resolveTarget(nested, 'write');

    expect(target.root).toBe(root);
    expect(target.source).toBe('repository');
    expect(target.mapDir).toBe(path.join(root, '.ctour'));
  });

  it('takes the folder itself when there is no repository', async () => {
    const base = sandbox();
    const folder = path.join(base, 'plain');
    mkdirSync(folder);

    const target = await resolveTarget(folder, 'write');

    expect(target.root).toBe(folder);
    expect(target.source).toBe('folder');
  });

  it('recognises a worktree, where .git is a file', async () => {
    const base = sandbox();
    const root = repository(base, 'file');
    const nested = path.join(root, 'src');
    mkdirSync(nested);

    const target = await resolveTarget(nested, 'write');

    expect(target.root).toBe(root);
    expect(target.source).toBe('repository');
  });

  it('refuses the home folder', async () => {
    await expect(resolveTarget(homedir(), 'write')).rejects.toMatchObject({ code: 'home-directory' });
  });

  it('refuses a folder outside home', async () => {
    await expect(resolveTarget('/etc', 'write')).rejects.toMatchObject({ code: 'outside-home' });
  });

  it('refuses a path that is a file', async () => {
    const base = sandbox();
    const file = path.join(base, 'note.txt');
    writeFileSync(file, 'x', 'utf8');

    await expect(resolveTarget(file, 'write')).rejects.toBeInstanceOf(TargetError);
    await expect(resolveTarget(file, 'write')).rejects.toMatchObject({ code: 'not-a-directory' });
  });

  it('refuses a path that does not exist', async () => {
    const base = sandbox();

    await expect(resolveTarget(path.join(base, 'ghost'), 'write')).rejects.toMatchObject({
      code: 'not-a-directory',
    });
  });

  it('refuses a map folder that is a file', async () => {
    const base = sandbox();
    const root = repository(base);
    writeFileSync(path.join(root, '.ctour'), 'x', 'utf8');

    await expect(resolveTarget(root, 'write')).rejects.toMatchObject({ code: 'map-dir-blocked' });
  });

  it('refuses a map folder without write permission', async () => {
    const base = sandbox();
    const root = repository(base);
    const mapDir = path.join(root, '.ctour');
    mkdirSync(mapDir);
    chmodSync(mapDir, 0o500);

    await expect(resolveTarget(root, 'write')).rejects.toMatchObject({ code: 'not-writable' });
    await expect(resolveTarget(root, 'read')).resolves.toMatchObject({ root });
    chmodSync(mapDir, 0o700);
  });
});
