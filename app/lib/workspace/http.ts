import { NextResponse } from 'next/server';
import { MapFileError } from '@/app/lib/workspace/map-file';
import { WorkspaceError } from '@/app/lib/workspace/service';

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(code: string, message: string, status = 400, detail?: string) {
  return NextResponse.json(detail ? { error: code, message, detail } : { error: code, message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof WorkspaceError) {
    return fail(error.code, error.message, error.status);
  }
  if (error instanceof MapFileError) {
    const status = error.code === 'map-missing' ? 404 : error.code === 'map-unreadable' ? 422 : 400;
    return fail(error.code, error.message, status);
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return fail('unexpected', message, 500);
}
