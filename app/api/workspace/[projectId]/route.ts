import { forgetProject } from '@/app/lib/workspace/service';
import { handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    await forgetProject(projectId);
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
