import { ExchangeError, exportMaps } from '@/app/lib/workspace/exchange';
import { handleError, ok } from '@/app/lib/workspace/http';
import { workspaceHome } from '@/app/lib/workspace/registry';
import { projectById } from '@/app/lib/workspace/service';

export const dynamic = 'force-dynamic';

type Body = { projectId?: unknown; mapFile?: unknown; all?: unknown; folder?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    const folder = typeof body?.folder === 'string' ? body.folder : '';
    const mapFile = typeof body?.mapFile === 'string' && body.mapFile ? body.mapFile : undefined;
    const all = body?.all === true;

    if (!projectId || !folder || (!mapFile && !all)) {
      throw new ExchangeError('invalid-request', 'Name a project, a map and a destination folder.', 400);
    }

    const project = await projectById(projectId);
    const result = await exportMaps({ project, home: workspaceHome(), folder, mapFile, all });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
