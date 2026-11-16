import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.join(process.cwd(), 'app', 'lib', 'workspace', 'sync.ts'), 'utf8');
const events = readFileSync(path.join(process.cwd(), 'app', 'lib', 'workspace', 'sync-events.ts'), 'utf8');

describe('sync stays on this machine', () => {
  it('imports nothing that can reach another host', () => {
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1]);
    expect(imports).toEqual(
      expect.arrayContaining(['node:fs', 'node:path', '@/app/lib/workspace/map-file', '@/app/lib/workspace/types'])
    );
    expect(imports.some(name => name.startsWith('http') || name.startsWith('node:http'))).toBe(false);
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('WebSocket');
  });

  it('describes events with no field beyond the contract', () => {
    const kinds = [...events.matchAll(/type: '([a-z-]+)'/g)].map(match => match[1]);
    expect(new Set(kinds)).toEqual(new Set(['map-changed', 'map-unreadable', 'map-gone', 'maps-changed']));
    expect(events).not.toContain('http://');
    expect(events).not.toContain('https://');
  });
});
