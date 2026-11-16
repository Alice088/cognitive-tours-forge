import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { NoPortError, findFreePort } from '@/cli/lib/port';

const open: net.Server[] = [];

function occupy(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      open.push(server);
      resolve();
    });
  });
}

function randomBase(): number {
  return 21_000 + Math.floor(Math.random() * 800) * 10;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

describe('address selection', () => {
  it('takes the first free address', async () => {
    const base = randomBase();
    expect(await findFreePort(base, 30)).toBe(base);
  });

  it('skips an address that is taken', async () => {
    const base = randomBase();
    await occupy(base);
    expect(await findFreePort(base, 30)).toBe(base + 1);
  });

  it('skips several taken addresses', async () => {
    const base = randomBase();
    await occupy(base);
    await occupy(base + 1);
    await occupy(base + 2);
    expect(await findFreePort(base, 30)).toBe(base + 3);
  });

  it('fails when the whole range is taken', async () => {
    const base = randomBase();
    await occupy(base);
    await expect(findFreePort(base, 1)).rejects.toBeInstanceOf(NoPortError);
  });
});
