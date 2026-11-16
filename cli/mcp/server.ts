import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { INSTRUCTIONS } from './instructions';
import { callTool, listTools } from './tools';
import { VERSION } from '../lib/version';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const FALLBACK_VERSION = '2025-06-18';

type Frame = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

export type ServeOptions = {
  home: string;
  input: Readable;
  output: Writable;
  version?: string;
};

class Protocol {
  private initialized = false;

  constructor(
    private readonly home: string,
    private readonly write: (frame: unknown) => void,
    private readonly version: string
  ) {}

  async handle(raw: string): Promise<void> {
    let frame: Frame;
    try {
      frame = JSON.parse(raw) as Frame;
    } catch {
      this.write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
      return;
    }
    if (typeof frame !== 'object' || frame === null || typeof frame.method !== 'string') {
      this.write({ jsonrpc: '2.0', id: frame?.id ?? null, error: { code: -32600, message: 'invalid request' } });
      return;
    }
    const isNotification = frame.id === undefined;
    if (isNotification) {
      return;
    }
    if (frame.method === 'ping') {
      this.write({ jsonrpc: '2.0', id: frame.id, result: {} });
      return;
    }
    if (frame.method === 'initialize') {
      const requested =
        typeof frame.params?.protocolVersion === 'string' ? frame.params.protocolVersion : FALLBACK_VERSION;
      this.initialized = true;
      this.write({
        jsonrpc: '2.0',
        id: frame.id,
        result: {
          protocolVersion: VERSIONS.includes(requested) ? requested : FALLBACK_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'ctour', version: this.version },
          instructions: INSTRUCTIONS,
        },
      });
      return;
    }
    if (!this.initialized) {
      this.write({ jsonrpc: '2.0', id: frame.id, error: { code: -32002, message: 'not initialized' } });
      return;
    }
    if (frame.method === 'tools/list') {
      this.write({ jsonrpc: '2.0', id: frame.id, result: { tools: listTools() } });
      return;
    }
    if (frame.method === 'tools/call') {
      const name = typeof frame.params?.name === 'string' ? frame.params.name : '';
      const args = frame.params?.arguments ?? {};
      try {
        const result = await callTool(name, args, { home: this.home });
        this.write({ jsonrpc: '2.0', id: frame.id, result });
      } catch (error) {
        this.write({
          jsonrpc: '2.0',
          id: frame.id,
          error: { code: -32602, message: error instanceof Error ? error.message : 'invalid call' },
        });
      }
      return;
    }
    this.write({
      jsonrpc: '2.0',
      id: frame.id,
      error: { code: -32601, message: `unknown method ${frame.method}` },
    });
  }
}

export async function serve(options: ServeOptions): Promise<void> {
  const version = options.version ?? VERSION;
  let chain: Promise<void> = Promise.resolve();
  const protocol = new Protocol(
    options.home,
    frame => {
      options.output.write(`${JSON.stringify(frame)}\n`);
    },
    version
  );
  const reader = createInterface({ input: options.input, crlfDelay: Infinity });
  for await (const raw of reader) {
    if (raw.trim() === '') continue;
    chain = chain.then(() => protocol.handle(raw));
  }
  await chain;
}
