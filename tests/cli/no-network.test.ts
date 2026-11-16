import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sources = [
  'cli/index.ts',
  'cli/lib/run.ts',
  'cli/lib/server.ts',
  'cli/lib/port.ts',
  'cli/lib/target.ts',
  'cli/commands/init.ts',
  'cli/commands/serve.ts',
  'cli/commands/status.ts',
  'cli/commands/doctor.ts',
];

function text(file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('nothing leaves the machine', () => {
  it('imports no network client', () => {
    const forbidden = [
      'node:http"',
      "node:http'",
      'node:https',
      'node:dns',
      'node:tls',
      'WebSocket',
      'net.connect',
      "require('http')",
    ];

    for (const file of sources) {
      for (const needle of forbidden) {
        expect(text(file), `${file} contains ${needle}`).not.toContain(needle);
      }
    }
  });

  it('mentions no remote address', () => {
    for (const file of sources) {
      expect(text(file), `${file} names a remote address`).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/);
    }
  });

  it('only ever talks to loopback', () => {
    for (const file of sources) {
      const matches = text(file).match(/http:\/\/[^\s`'"$]+/g) ?? [];
      for (const match of matches) {
        expect(match.startsWith('http://127.0.0.1'), `${file} talks to ${match}`).toBe(true);
      }
    }
  });
});
