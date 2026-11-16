import { relink } from '@/app/lib/workspace/service';
import { fail, handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== 'string' || body.path.trim() === '') {
      return fail('not-a-directory', 'Choose a folder first.', 400);
    }
    const project = await relink(projectId, body.path);
    return ok({ project });
  } catch (error) {
    return handleError(error);
  }
}
