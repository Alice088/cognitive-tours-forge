import net from 'node:net';

export class NoPortError extends Error {}

const HOST = '127.0.0.1';

function isFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, HOST);
  });
}

export async function findFreePort(preferred = 4317, span = 30): Promise<number> {
  for (let port = preferred; port < preferred + span; port += 1) {
    if (await isFree(port)) {
      return port;
    }
  }
  throw new NoPortError(`no free address between ${preferred} and ${preferred + span - 1}`);
}
