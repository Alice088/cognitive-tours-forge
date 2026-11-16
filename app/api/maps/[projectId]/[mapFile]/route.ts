import { canonicalText, mapMtime, writeMap } from '@/app/lib/workspace/map-file';
import { loadMap, projectById, rememberMap } from '@/app/lib/workspace/service';
import { fail, handleError, ok } from '@/app/lib/workspace/http';
import { recordOwnWrite } from '@/app/lib/workspace/sync';
import type { MapDocument } from '@/app/lib/workspace/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string; mapFile: string }> }) {
  try {
    const { projectId, mapFile } = await params;
    const payload = await loadMap(projectId, decodeURIComponent(mapFile));
    return ok(payload);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string; mapFile: string }> }) {
  try {
    const { projectId, mapFile } = await params;
    const file = decodeURIComponent(mapFile);
    const project = await projectById(projectId);
    if (project.availability === 'unavailable') {
      return fail('project-unavailable', 'That project folder cannot be reached.', 409);
    }
    const body = (await request.json()) as { document?: MapDocument; expectedMtimeMs?: number };
    if (!body.document) {
      return fail('invalid-document', 'There is nothing to save.', 422);
    }
    if (typeof body.expectedMtimeMs === 'number') {
      const current = await mapMtime(project.path, file);
      if (current === null) {
        return fail('stale-document', 'This map is no longer in the folder.', 409);
      }
      if (Math.abs(current - body.expectedMtimeMs) > 1) {
        return fail('stale-document', 'This map changed on disk.', 409);
      }
    }
    recordOwnWrite(projectId, file, canonicalText(body.document));
    const result = await writeMap(project.path, file, body.document);
    await rememberMap(projectId, file, body.document).catch(() => undefined);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
