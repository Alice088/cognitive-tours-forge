import { isMapFile } from '@/app/lib/workspace/map-file';
import { handleError, fail } from '@/app/lib/workspace/http';
import { projectById } from '@/app/lib/workspace/service';
import { watchMap } from '@/app/lib/workspace/sync';
import type { SyncEvent } from '@/app/lib/workspace/sync-events';

export const dynamic = 'force-dynamic';

const PING_MS = 25_000;

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; mapFile: string }> }) {
  const { projectId, mapFile } = await params;
  const file = decodeURIComponent(mapFile);
  if (!isMapFile(file)) {
    return fail('invalid-name', 'That is not a map file name.', 400);
  }
  let project;
  try {
    project = await projectById(projectId);
  } catch (error) {
    return handleError(error);
  }
  if (project.availability === 'unavailable') {
    return fail('project-unavailable', 'That map is not on this machine right now.', 409);
  }

  const encoder = new TextEncoder();
  let stop: () => void = () => undefined;
  let stopped = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        if (stopped) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stopped = true;
        }
      };
      const subscription = watchMap({
        projectId,
        root: project.path,
        file,
        emit: (event: SyncEvent) => {
          send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        },
      });
      const ping = setInterval(() => send(': ping\n\n'), PING_MS);
      const abort = () => {
        if (stopped) {
          return;
        }
        stopped = true;
        clearInterval(ping);
        subscription.close();
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener('abort', abort);
      stop = () => {
        request.signal.removeEventListener('abort', abort);
        abort();
      };
      send('retry: 1000\n\n');
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
