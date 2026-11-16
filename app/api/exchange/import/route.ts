import { ExchangeError, importFolder, importOne } from '@/app/lib/workspace/exchange';
import { handleError, ok } from '@/app/lib/workspace/http';
import { workspaceHome } from '@/app/lib/workspace/registry';
import { projectById } from '@/app/lib/workspace/service';

export const dynamic = 'force-dynamic';

type Body = { projectId?: unknown; path?: unknown; folder?: unknown; acceptLosses?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    const path = typeof body?.path === 'string' && body.path ? body.path : undefined;
    const folder = typeof body?.folder === 'string' && body.folder ? body.folder : undefined;
    const acceptLosses = body?.acceptLosses === true;

    if (!projectId || (!path && !folder)) {
      throw new ExchangeError('invalid-request', 'Name a project and a map file or a folder.', 400);
    }

    const home = workspaceHome();
    const project = await projectById(projectId);
    const result = folder
      ? await importFolder({ project, home, folder, acceptLosses })
      : await importOne({ project, home, sourcePath: path as string, acceptLosses });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
