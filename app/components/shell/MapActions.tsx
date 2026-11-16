'use client';

import { CopyIcon, FilesIcon, MoreHorizontalIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

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
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hidden gap-2 md:inline-flex"
        aria-label="Save a copy"
        disabled={disabled}
        onClick={onSaveCopy}
      >
        <CopyIcon aria-hidden="true" />
        <span>Save a copy</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="hidden gap-2 md:inline-flex"
        aria-label="Export all maps"
        disabled={allDisabled}
        onClick={onExportAll}
      >
        <FilesIcon aria-hidden="true" />
        <span>Export all maps</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="More map actions">
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem aria-label="Save a copy" disabled={disabled} onSelect={onSaveCopy}>
            <CopyIcon aria-hidden="true" />
            Save a copy
          </DropdownMenuItem>
          <DropdownMenuItem aria-label="Export all maps" disabled={allDisabled} onSelect={onExportAll}>
            <FilesIcon aria-hidden="true" />
            Export all maps
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
