import { readWorkspace, saveViewState } from '@/app/lib/workspace/service';
import { fail, handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const registry = await readWorkspace();
    return ok({ lastView: registry.lastView ?? null });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.projectId !== 'string' || typeof body.mapFile !== 'string') {
      return fail('invalid-view', 'A view needs a project and a map.', 400);
    }
    const step = typeof body.step === 'number' && body.step >= 0 ? Math.floor(body.step) : 0;
    await saveViewState({
      projectId: body.projectId,
      mapFile: body.mapFile,
      tourId: typeof body.tourId === 'string' ? body.tourId : null,
      step,
    });
    return ok({ saved: true });
  } catch (error) {
    return handleError(error);
  }
}
