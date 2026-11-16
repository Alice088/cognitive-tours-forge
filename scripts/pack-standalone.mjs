import { cp, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');
const server = await stat(path.join(standalone, 'server.js')).catch(() => null);

if (!server) {
  process.stderr.write('no .next/standalone/server.js: run next build with output: standalone first\n');
  process.exit(1);
}

await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
process.stdout.write(`packed public and .next/static into ${path.relative(root, standalone)}\n`);
