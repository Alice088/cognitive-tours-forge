'use client';

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { tourIssues } from '@/app/lib/workspace/validation';
import type { Tour, Waypoint } from '@/app/lib/workspace/types';

function StopNarrative({
  value,
  label,
  readOnly,
  onCommit,
}: {
  value: string;
  label: string;
  readOnly: boolean;
  onCommit: (narrative: string) => void;
}) {
  return (
    <Textarea
      aria-label={label}
      rows={2}
      className="mt-2 text-xs"
      defaultValue={value}
      disabled={readOnly}
      placeholder="What the reader should notice here"
      onBlur={event => {
        if (event.target.value !== value) {
          onCommit(event.target.value);
        }
      }}
    />
  );
}

export function TourEditor({
  tour,
  waypoints,
  onChange,
  onAddStop,
  onNarrative,
  onReorder,
  onRemoveStop,
  onDelete,
  readOnly,
}: {
  tour: Tour;
  waypoints: Waypoint[];
  onChange: (patch: Partial<Tour>) => void;
  onAddStop: (waypointId: string) => void;
  onNarrative: (index: number, narrative: string) => void;
  onReorder: (from: number, to: number) => void;
  onRemoveStop: (index: number) => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const [nameIssue, setNameIssue] = useState<string | null>(null);
  const byId = new Map(waypoints.map(waypoint => [waypoint.id, waypoint]));
  const taken = new Set(tour.stops.map(stop => stop.waypointId));
  const available = waypoints.filter(waypoint => !taken.has(waypoint.id));

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-1">
        <Label htmlFor="tour-name">Tour name</Label>
        <Input
          id="tour-name"
          value={tour.name}
          disabled={readOnly}
          aria-invalid={nameIssue ? true : undefined}
          onChange={event => {
            const issue = tourIssues({ name: event.target.value })[0] ?? null;
            setNameIssue(issue?.message ?? null);
            if (!issue) {
              onChange({ name: event.target.value });
            }
          }}
        />
        {nameIssue ? (
          <p role="alert" className="text-xs text-destructive">
            {nameIssue}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="tour-description">Description</Label>
        <Textarea
          id="tour-description"
          rows={3}
          value={tour.description ?? ''}
          disabled={readOnly}
          onChange={event => onChange({ description: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Stops</p>
        <Select
          value=""
          disabled={readOnly || available.length === 0}
          onValueChange={waypointId => onAddStop(waypointId)}
        >
          <SelectTrigger aria-label="Add a waypoint to this tour">
            <SelectValue placeholder={available.length === 0 ? 'Every waypoint is a stop' : 'Add a waypoint'} />
          </SelectTrigger>
          <SelectContent>
            {available.map(waypoint => (
              <SelectItem key={waypoint.id} value={waypoint.id}>
                {waypoint.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tour.stops.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This tour has no stops yet. Pick a waypoint above, or select one on the map and add it from there.
          </p>
        ) : (
          <ol className="space-y-2">
            {tour.stops.map((stop, index) => (
              <li key={`${stop.waypointId}-${index}`} className="rounded-md border border-border p-2">
                <p className="text-sm font-medium">
                  {index + 1}. {byId.get(stop.waypointId)?.label ?? stop.waypointId}
                </p>
                <StopNarrative
                  key={`${index}-${stop.narrative ?? ''}`}
                  value={stop.narrative ?? ''}
                  label={`Narrative for stop ${index + 1}`}
                  readOnly={readOnly}
                  onCommit={narrative => onNarrative(index, narrative)}
                />
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move stop ${index + 1} up`}
                    disabled={readOnly || index === 0}
                    onClick={() => onReorder(index, index - 1)}
                  >
                    <ArrowUpIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move stop ${index + 1} down`}
                    disabled={readOnly || index === tour.stops.length - 1}
                    onClick={() => onReorder(index, index + 1)}
                  >
                    <ArrowDownIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove stop ${index + 1}`}
                    disabled={readOnly}
                    onClick={() => onRemoveStop(index)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <Button variant="destructive" className="w-full" disabled={readOnly} onClick={onDelete}>
          Delete tour
        </Button>
      </div>
    </div>
  );
}
