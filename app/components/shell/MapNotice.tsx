'use client';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { describeChange, type ChangeSummary } from '@/app/lib/workspace/diff';

export type MapNoticeState =
  | { kind: 'read-only'; onRelink: () => void }
  | { kind: 'unreadable'; file: string; reason: string; onDismiss: () => void }
  | { kind: 'outside-change'; summary: ChangeSummary | null; onReload: () => void; onKeepMine: () => void }
  | { kind: 'gone'; file: string; onWriteBack: () => void; onDismiss: () => void }
  | { kind: 'save-failed'; detail: string; onRetry: () => void }
  | { kind: 'oversized'; waypointLimit: number; tourLimit: number; onDismiss: () => void };

export function MapNotice({ notice }: { notice: MapNoticeState | null }) {
  if (!notice) {
    return null;
  }
  const urgent = notice.kind !== 'read-only' && notice.kind !== 'oversized';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      data-notice={notice.kind}
      className={cn(
        'flex flex-wrap items-center gap-2 border-b bg-muted px-3 py-2 text-sm',
        urgent ? 'border-destructive' : 'border-border'
      )}
    >
      <span className="min-w-0 flex-1">{text(notice)}</span>
      {actions(notice)}
    </div>
  );
}

function text(notice: MapNoticeState): string {
  switch (notice.kind) {
    case 'read-only':
      return 'This project folder cannot be reached, so the map below is the last copy that was saved here, read only.';
    case 'unreadable':
      return `${notice.file} cannot be read: ${notice.reason}. The map below is the last version that could be read.`;
    case 'outside-change': {
      const summary = notice.summary ? describeChange(notice.summary) : '';
      const detail = summary ? `${summary}. ` : '';
      return `The map file changed on disk. ${detail}Reloading takes the file's version and starts the history again.`;
    }
    case 'gone':
      return `${notice.file} is no longer in the folder. The map below is still here.`;
    case 'save-failed':
      return notice.detail;
    case 'oversized':
      return `This map is larger than the supported size of ${notice.waypointLimit} waypoints and ${notice.tourLimit} tours. It still works, but panning may not stay smooth.`;
  }
}

function actions(notice: MapNoticeState) {
  switch (notice.kind) {
    case 'read-only':
      return (
        <Button variant="outline" size="sm" onClick={notice.onRelink}>
          Choose a new location
        </Button>
      );
    case 'unreadable':
      return (
        <Button variant="outline" size="sm" onClick={notice.onDismiss}>
          Dismiss
        </Button>
      );
    case 'outside-change':
      return (
        <>
          <Button variant="outline" size="sm" onClick={notice.onReload}>
            Reload
          </Button>
          <Button size="sm" onClick={notice.onKeepMine}>
            Keep mine
          </Button>
        </>
      );
    case 'gone':
      return (
        <>
          <Button size="sm" onClick={notice.onWriteBack}>
            Write it back
          </Button>
          <Button variant="outline" size="sm" onClick={notice.onDismiss}>
            Dismiss
          </Button>
        </>
      );
    case 'save-failed':
      return (
        <Button variant="outline" size="sm" onClick={notice.onRetry}>
          Retry
        </Button>
      );
    case 'oversized':
      return (
        <Button variant="outline" size="sm" onClick={notice.onDismiss}>
          Dismiss
        </Button>
      );
  }
}
