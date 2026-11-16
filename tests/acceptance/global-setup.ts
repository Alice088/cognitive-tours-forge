import { rmSync } from 'node:fs';
import path from 'node:path';

export default function globalSetup() {
  rmSync(path.join(process.cwd(), '.tmp', 'e2e-home'), { recursive: true, force: true });
}
