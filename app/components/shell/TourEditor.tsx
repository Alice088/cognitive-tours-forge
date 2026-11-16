'use client';

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { tourIssues } from '@/app/lib/workspace/validation';
import type { Tour, Waypoint } from '@/app/lib/workspace/types';

export function TourEditor({
  tour,
  waypoints,
  onChange,
  onReorder,
  onRemoveStop,
  onDelete,
  readOnly,
}: {
  tour: Tour;
  waypoints: Waypoint[];
  onChange: (patch: Partial<Tour>) => void;
  onReorder: (from: number, to: number) => void;
  onRemoveStop: (index: number) => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const [nameIssue, setNameIssue] = useState<string | null>(null);
  const byId = new Map(waypoints.map(waypoint => [waypoint.id, waypoint]));

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
        {tour.stops.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This tour has no stops. Select a waypoint on the map to add one.
          </p>
        ) : (
          <ol className="space-y-2">
            {tour.stops.map((stop, index) => (
              <li key={`${stop.waypointId}-${index}`} className="rounded-md border border-border p-2">
                <p className="text-sm font-medium">
                  {index + 1}. {byId.get(stop.waypointId)?.label ?? stop.waypointId}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{stop.narrative ?? ''}</p>
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
