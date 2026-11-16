import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const folder = path.join(root, 'cli', 'mcp');

function sources(): string[] {
  return readdirSync(folder)
    .filter(entry => entry.endsWith('.ts'))
    .map(entry => path.join(folder, entry));
}

function text(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('nothing leaves the machine', () => {
  it('imports no network client', () => {
    const forbidden = ['node:http', 'node:https', 'node:net', 'node:dns', 'node:tls', 'WebSocket', 'fetch('];

    for (const file of sources()) {
      for (const needle of forbidden) {
        expect(text(file), `${file} contains ${needle}`).not.toContain(needle);
      }
    }
  });

  it('mentions no remote address', () => {
    for (const file of sources()) {
      expect(text(file), `${file} names a remote address`).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/);
    }
  });
});

describe('standard output belongs to the protocol', () => {
  it('writes frames from one place only', () => {
    const writers = sources().filter(file => text(file).includes('output.write'));
    expect(writers.map(file => path.basename(file))).toEqual(['server.ts']);
  });

  it('does not log to the console', () => {
    for (const file of sources()) {
      expect(text(file), file).not.toContain('console.log');
      expect(text(file), file).not.toContain('process.stdout');
    }
  });

  it('keeps the command layer out of the protocol output', () => {
    const command = readFileSync(path.join(root, 'cli', 'commands', 'mcp.ts'), 'utf8');

    expect(command).not.toContain('console.log');
  });
});
