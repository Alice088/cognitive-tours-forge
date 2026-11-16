'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { WAYPOINT_TYPES, type WaypointType } from '@/app/lib/theme/tokens';
import { waypointIssues, type FieldIssue } from '@/app/lib/workspace/validation';
import type { Waypoint } from '@/app/lib/workspace/types';

const COMMIT_DELAY = 600;

export function WaypointEditor({
  waypoint,
  onCommit,
  onDrafting,
  readOnly,
}: {
  waypoint: Waypoint;
  onCommit: (patch: Partial<Waypoint>) => void;
  onDrafting: (drafting: boolean) => void;
  readOnly: boolean;
}) {
  const [label, setLabel] = useState(waypoint.label);
  const [description, setDescription] = useState(waypoint.description ?? '');
  const [notes, setNotes] = useState(waypoint.notes ?? '');
  const [file, setFile] = useState(waypoint.file ?? '');
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const commit = (patch: Partial<Waypoint>) => {
    if (readOnly) {
      return;
    }
    onDrafting(false);
    const found = waypointIssues(patch);
    setIssues(found);
    if (found.length === 0) {
      onCommit(patch);
    }
  };

  const schedule = (patch: Partial<Waypoint>) => {
    onDrafting(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => commit(patch), COMMIT_DELAY);
  };

  const commitNow = (patch: Partial<Waypoint>) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    commit(patch);
  };

  const issueFor = (field: FieldIssue['field']) => issues.find(issue => issue.field === field) ?? null;

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1">
        <Label htmlFor="waypoint-label">Label</Label>
        <Input
          id="waypoint-label"
          value={label}
          disabled={readOnly}
          aria-invalid={issueFor('label') ? true : undefined}
          onChange={event => {
            setLabel(event.target.value);
            schedule({ label: event.target.value });
          }}
          onBlur={() => commitNow({ label })}
        />
        {issueFor('label') ? (
          <p role="alert" className="text-xs text-destructive">
            {issueFor('label')?.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="waypoint-type">Type</Label>
        <Select
          value={waypoint.type}
          disabled={readOnly}
          onValueChange={value => onCommit({ type: value as WaypointType })}
        >
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
          disabled={readOnly}
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
          disabled={readOnly}
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
          disabled={readOnly}
          aria-invalid={issueFor('file') ? true : undefined}
          onChange={event => {
            setFile(event.target.value);
            schedule({ file: event.target.value });
          }}
          onBlur={() => commitNow({ file })}
        />
        {issueFor('file') ? (
          <p role="alert" className="text-xs text-destructive">
            {issueFor('file')?.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Relative to the project root.</p>
        )}
      </div>
    </div>
  );
}
