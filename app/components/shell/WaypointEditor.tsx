'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { WAYPOINT_TYPES, type WaypointType } from '@/app/lib/theme/tokens';
import type { Waypoint } from '@/app/lib/workspace/types';

const COMMIT_DELAY = 600;

export function WaypointEditor({
  waypoint,
  onCommit,
}: {
  waypoint: Waypoint;
  onCommit: (patch: Partial<Waypoint>) => void;
}) {
  const [label, setLabel] = useState(waypoint.label);
  const [description, setDescription] = useState(waypoint.description ?? '');
  const [notes, setNotes] = useState(waypoint.notes ?? '');
  const [file, setFile] = useState(waypoint.file ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const schedule = (patch: Partial<Waypoint>) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => onCommit(patch), COMMIT_DELAY);
  };

  const commitNow = (patch: Partial<Waypoint>) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    onCommit(patch);
  };

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1">
        <Label htmlFor="waypoint-label">Label</Label>
        <Input
          id="waypoint-label"
          value={label}
          onChange={event => {
            setLabel(event.target.value);
            schedule({ label: event.target.value });
          }}
          onBlur={() => commitNow({ label })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="waypoint-type">Type</Label>
        <Select value={waypoint.type} onValueChange={value => onCommit({ type: value as WaypointType })}>
          <SelectTrigger id="waypoint-type" aria-label="Waypoint type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WAYPOINT_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="waypoint-description">Description</Label>
        <Textarea
          id="waypoint-description"
          rows={5}
          value={description}
          onChange={event => {
            setDescription(event.target.value);
            schedule({ description: event.target.value });
          }}
          onBlur={() => commitNow({ description })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="waypoint-notes">Notes</Label>
        <Textarea
          id="waypoint-notes"
          rows={3}
          value={notes}
          onChange={event => {
            setNotes(event.target.value);
            schedule({ notes: event.target.value });
          }}
          onBlur={() => commitNow({ notes })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="waypoint-file">File</Label>
        <Input
          id="waypoint-file"
          placeholder="app/components/example.tsx"
          value={file}
          onChange={event => {
            setFile(event.target.value);
            schedule({ file: event.target.value });
          }}
          onBlur={() => commitNow({ file })}
        />
        <p className="text-xs text-muted-foreground">Relative to the project root.</p>
      </div>
    </div>
  );
}
