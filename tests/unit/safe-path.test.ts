import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isWithinHome, resolveInside } from '@/app/lib/fs/safe-path';

const root = mkdtempSync(path.join(tmpdir(), 'ctour-paths-'));

describe('resolveInside', () => {
  it('accepts a plain child', () => {
    expect(resolveInside(root, 'a/b.json')).toBe(path.join(root, 'a/b.json'));
  });

  it('accepts the root itself', () => {
    expect(resolveInside(root, '.')).toBe(path.resolve(root));
  });

  it('rejects parent traversal', () => {
    expect(resolveInside(root, '../escape.json')).toBeNull();
  });

  it('rejects traversal hidden in the middle', () => {
    expect(resolveInside(root, 'a/../../escape.json')).toBeNull();
  });

  it('rejects an absolute path outside the root', () => {
    expect(resolveInside(root, '/etc/passwd')).toBeNull();
  });

  it('accepts an absolute path inside the root', () => {
    expect(resolveInside(root, path.join(root, 'inside.json'))).toBe(path.join(root, 'inside.json'));
  });

  it('does not confuse a sibling with a shared prefix', () => {
    const sibling = `${root}bc`;
    mkdirSync(sibling, { recursive: true });
    expect(resolveInside(root, `${sibling}/file.json`)).toBeNull();
  });

  it('follows a symlink that leaves the root', () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'ctour-outside-'));
    writeFileSync(path.join(outside, 'secret.txt'), 'x');
    const link = path.join(root, 'link');
    symlinkSync(outside, link);
    expect(resolveInside(root, 'link/secret.txt')).toBeNull();
  });
});

describe('isWithinHome', () => {
  it('accepts the home directory and its children', () => {
    expect(isWithinHome(process.env.HOME ?? '')).toBe(true);
    expect(isWithinHome(path.join(process.env.HOME ?? '/', 'code'))).toBe(true);
  });

  it('accepts an ancestor of home so browsing can reach the root', () => {
    expect(isWithinHome(path.dirname(process.env.HOME ?? '/'))).toBe(true);
  });

  it('rejects an unrelated branch', () => {
    expect(isWithinHome('/definitely/not/home')).toBe(process.env.HOME === '/definitely/not/home');
  });
});
