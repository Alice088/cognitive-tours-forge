import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { errorOf, open, resultOf, session } from './mcp-fixtures';

const root = process.cwd();

describe('handshake', () => {
  it('echoes a protocol version it knows', async () => {
    const { session: client, call } = await open(sandboxed());

    const result = resultOf(await call('initialize', { protocolVersion: '2024-11-05', capabilities: {} }));

    expect(result.protocolVersion).toBe('2024-11-05');
    expect((result.serverInfo as { name: string }).name).toBe('ctour');
    expect(result.instructions).toBeTruthy();
    await client.close();
  });

  it('answers an unknown protocol version with the newest it knows', async () => {
    const { session: client, call } = await open(sandboxed());

    const result = resultOf(await call('initialize', { protocolVersion: '1999-01-01', capabilities: {} }));

    expect(result.protocolVersion).toBe('2025-06-18');
    await client.close();
  });

  it('declares tools without list changes', async () => {
    const { session: client, call } = await open(sandboxed());

    const result = resultOf(await call('initialize', { protocolVersion: '2025-06-18', capabilities: {} }));

    expect(result.capabilities).toEqual({ tools: { listChanged: false } });
    await client.close();
  });

  it('answers a notification with nothing', async () => {
    const { session: client } = await open(sandboxed());

    client.notify('notifications/initialized');
    await client.call('ping');

    expect(client.frames.filter(line => line.includes('initialized'))).toHaveLength(0);
    await client.close();
  });

  it('answers ping before initializing', async () => {
    const client = session(sandboxed());

    const response = await client.call('ping');

    expect(resultOf(response)).toEqual({});
    await client.close();
  });

  it('refuses a request before initializing', async () => {
    const client = session(sandboxed());

    const response = await client.call('tools/list');

    expect(errorOf(response).code).toBe(-32002);
    await client.close();
  });

  it('refuses a line that is not JSON', async () => {
    const client = session(sandboxed());

    client.raw('not json');
    await client.call('ping');

    expect(client.frames[0]).toContain('-32700');
    expect(client.frames[0]).toContain('"id":null');
    await client.close();
  });

  it('refuses an unknown method by name', async () => {
    const { session: client, call } = await open(sandboxed());

    const response = await call('resources/list');

    expect(errorOf(response).code).toBe(-32601);
    expect(errorOf(response).message).toContain('resources/list');
    await client.close();
  });

  it('refuses an unknown tool by name', async () => {
    const { session: client, call } = await open(sandboxed());

    const response = await call('tools/call', { name: 'rewrite_everything', arguments: {} });

    expect(errorOf(response).code).toBe(-32602);
    expect(errorOf(response).message).toContain('rewrite_everything');
    await client.close();
  });

  it('lists nine tools in the contract order', async () => {
    const { session: client, call } = await open(sandboxed());

    const tools = (resultOf(await call('tools/list')).tools as Array<{ name: string; inputSchema: unknown }>).map(
      tool => tool.name
    );

    expect(tools).toEqual([
      'list_projects',
      'read_map',
      'create_waypoint',
      'update_waypoint',
      'delete_waypoint',
      'connect_waypoints',
      'disconnect_waypoints',
      'create_tour',
      'set_tour_stops',
    ]);
    await client.close();
  });

  it('describes when to use each tool', async () => {
    const { session: client, call } = await open(sandboxed());

    const tools = resultOf(await call('tools/list')).tools as Array<{ name: string; description: string }>;

    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
    await client.close();
  });

  it('writes frames and nothing else to the output', async () => {
    const { session: client, call } = await open(sandboxed());

    await call('ping');
    await call('tools/list');

    for (const line of client.frames) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    await client.close();
  });

  it('names the loop, the types and the refusals in the instructions', async () => {
    const { session: client, call } = await open(sandboxed());

    const instructions = String(resultOf(await call('initialize', { protocolVersion: '2025-06-18' })).instructions);

    expect(instructions.toLowerCase()).toContain('read_map');
    expect(instructions.toLowerCase()).toContain('state token');
    expect(instructions).toContain('Goal');
    expect(instructions).toContain('Deprecated');
    expect(instructions.toLowerCase()).toContain('refusal');
    await client.close();
  });

  it('takes the instruction text from the module, not from inline prose', () => {
    const source = readFileSync(path.join(root, 'cli/mcp/server.ts'), 'utf8');

    expect(source).toContain("from './instructions'");
  });
});

function sandboxed(): string {
  const fixture = path.join(root, '.tmp', 'mcp-protocol');
  return fixture;
}
