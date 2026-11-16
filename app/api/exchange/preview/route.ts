import { ExchangeError, previewFolder, previewPath } from '@/app/lib/workspace/exchange';
import { handleError, ok } from '@/app/lib/workspace/http';
import { projectById } from '@/app/lib/workspace/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId') ?? '';
    const path = url.searchParams.get('path');
    const folder = url.searchParams.get('folder');

    if (!projectId || (!path && !folder)) {
      throw new ExchangeError('invalid-request', 'Name a project and a map file or a folder.', 400);
    }

    const project = await projectById(projectId);
    const projectRoot = project.availability === 'unavailable' ? null : project.path;

    return ok(folder ? await previewFolder(folder, projectRoot) : await previewPath(path as string, projectRoot));
  } catch (error) {
    return handleError(error);
  }
}
