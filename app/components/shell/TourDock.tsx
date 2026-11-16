'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  Undo2Icon,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import type { SaveStatus, Tour } from '@/app/lib/workspace/types';

export function TourDock({
  tours,
  activeTourId,
  step,
  onTourChange,
  onStep,
  onCreateTour,
  editing,
  onEditingChange,
  overview,
  onOverviewChange,
  onExport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  disabled,
  readOnly,
}: {
  tours: Tour[];
  activeTourId: string | null;
  step: number;
  onTourChange: (tourId: string | null) => void;
  onStep: (step: number) => void;
  onCreateTour: () => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  overview: boolean;
  onOverviewChange: (overview: boolean) => void;
  onExport: (() => void) | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  disabled: boolean;
  readOnly: boolean;
}) {
  const tour = tours.find(item => item.id === activeTourId) ?? null;
  const total = tour?.stops.length ?? 0;
  const frozen = disabled || readOnly;

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
      <Select value={tour?.id ?? 'none'} onValueChange={value => onTourChange(value === 'none' ? null : value)}>
        <SelectTrigger aria-label="Current tour" className="w-52 shrink-0" disabled={disabled}>
          <SelectValue placeholder="No tour" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No tour</SelectItem>
          {tours.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" aria-label="New tour" disabled={frozen} onClick={onCreateTour}>
        <PlusIcon aria-hidden="true" />
      </Button>

      <p className="shrink-0 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {tour ? `Step ${Math.min(step + 1, Math.max(total, 1))} of ${total}` : 'No tour selected'}
      </p>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous stop"
          disabled={disabled || !tour || step <= 0}
          onClick={() => onStep(step - 1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next stop"
          disabled={disabled || !tour || step >= total - 1}
          onClick={() => onStep(step + 1)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <Button
          variant={overview ? 'default' : 'outline'}
          size="sm"
          aria-pressed={overview}
          disabled={disabled || !tour}
          onClick={() => onOverviewChange(!overview)}
        >
          Whole tour
        </Button>
        <Button
          variant={editing ? 'default' : 'outline'}
          size="sm"
          aria-pressed={editing}
          disabled={frozen || !tour}
          onClick={() => onEditingChange(!editing)}
        >
          <PencilIcon aria-hidden="true" />
          Edit tour
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || !tour || !onExport} onClick={onExport ?? undefined}>
          <DownloadIcon aria-hidden="true" />
          Export
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6 shrink-0" />

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Undo" disabled={frozen || !canUndo} onClick={onUndo}>
              <Undo2Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Redo" disabled={frozen || !canRedo} onClick={onRedo}>
              <Redo2Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>

      <p className="ml-auto shrink-0 text-xs text-muted-foreground" aria-live="polite">
        {disabled
          ? 'Waiting'
          : saveStatus === 'pending'
            ? 'Saving'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'failed'
                ? 'Not saved'
                : 'Up to date'}
      </p>
    </div>
  );
}
