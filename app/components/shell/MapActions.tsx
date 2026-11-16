'use client';

import { CopyIcon, FilesIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function MapActions({
  onSaveCopy,
  onExportAll,
  disabled = false,
  allDisabled = false,
}: {
  onSaveCopy: () => void;
  onExportAll: () => void;
  disabled?: boolean;
  allDisabled?: boolean;
}) {
  return (
    <div
      data-region="map-actions"
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background p-1 shadow-sm"
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        aria-label="Save a copy"
        disabled={disabled}
        onClick={onSaveCopy}
      >
        <CopyIcon aria-hidden="true" />
        <span className="hidden md:inline">Save a copy</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        aria-label="Export all maps"
        disabled={allDisabled}
        onClick={onExportAll}
      >
        <FilesIcon aria-hidden="true" />
        <span className="hidden md:inline">Export all maps</span>
      </Button>
    </div>
  );
}
