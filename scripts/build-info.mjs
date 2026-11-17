import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;

function commit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function dirty() {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
    return status.length > 0;
  } catch {
    return null;
  }
}

mkdirSync(path.join(root, 'dist'), { recursive: true });
writeFileSync(
  path.join(root, 'dist', 'build.json'),
  `${JSON.stringify({ version, commit: commit(), dirty: dirty(), builtAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8'
);
process.stdout.write(`dist/build.json ${version}\n`);
