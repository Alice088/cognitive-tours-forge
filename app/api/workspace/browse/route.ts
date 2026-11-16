import { homedir } from 'node:os';
import { browse } from '@/app/lib/workspace/service';
import { handleError, ok } from '@/app/lib/workspace/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('path') ?? homedir();
    const result = await browse(target);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
