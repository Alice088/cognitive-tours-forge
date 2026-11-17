import { homedir } from 'node:os';
import { ADAPTERS, connectionFor, detect, entryFor, installInto, snippetFor } from '@/cli/mcp/agents';
import { workspaceHome } from '@/app/lib/workspace/registry';
import { serve } from '../mcp/server';
import { line } from '../lib/output';
import { VERSION } from '../lib/version';

export async function serveProtocol(overrides: { home?: string } = {}): Promise<number> {
  await serve({
    home: overrides.home ?? workspaceHome(),
    input: process.stdin,
    output: process.stdout,
  });
  return 0;
}

export async function installAgent(overrides: { home?: string; userHome?: string } = {}): Promise<number> {
  const userHome = overrides.userHome ?? homedir();
  const entry = connectionFor();
  const found = await detect(userHome);

  line(`ctour ${VERSION}`);
  if (found.length === 0) {
    line('no agent found');
    for (const adapter of ADAPTERS) {
      for (const text of snippetFor(adapter, entry)) {
        line(text);
      }
    }
    return 5;
  }

  let code = 0;
  for (const adapter of found) {
    const result = await installInto(adapter, userHome, entryFor(adapter, entry));
    if (result.change === 'unreadable') {
      line(`cannot read ${result.path}: ${result.reason}`);
      for (const text of snippetFor(adapter, entry)) {
        line(text);
      }
      code = 3;
      continue;
    }
    const label =
      result.change === 'unchanged' ? 'already connected' : result.change === 'updated' ? 'updated' : 'connected';
    line(`${adapter.label}  ${label}  ${result.path}`);
  }

  if (code === 0) {
    line('restart the agent; it will find the map through ctour mcp');
  }
  return code;
}
