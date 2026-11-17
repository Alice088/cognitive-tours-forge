import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function fromPackage(): string | null {
  for (const candidate of ['../package.json', '../../package.json']) {
    try {
      const file = fileURLToPath(new URL(candidate, import.meta.url));
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      continue;
    }
  }
  return null;
}

export const VERSION = fromPackage() ?? '0.0.0';
