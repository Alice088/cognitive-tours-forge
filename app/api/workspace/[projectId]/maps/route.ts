import { createMap } from '@/app/lib/workspace/service';
import { fail, handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const body = (await request.json()) as { name?: unknown };
    if (typeof body.name !== 'string') {
      return fail('invalid-name', 'Give the map a name.', 400);
    }
    const map = await createMap(projectId, body.name);
    return ok({ map }, 201);
  } catch (error) {
    return handleError(error);
  }
}
