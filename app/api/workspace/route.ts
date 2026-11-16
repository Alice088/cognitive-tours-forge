import { readWorkspace, addProject, listProjects } from '@/app/lib/workspace/service';
import { fail, handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [projects, registry] = await Promise.all([listProjects(), readWorkspace()]);
    return ok({ projects, lastView: registry.lastView ?? null });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== 'string' || body.path.trim() === '') {
      return fail('not-a-directory', 'Choose a folder first.', 400);
    }
    const project = await addProject(body.path);
    return ok({ project }, 201);
  } catch (error) {
    return handleError(error);
  }
}
