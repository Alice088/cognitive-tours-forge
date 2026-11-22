'use client';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import type { Edge, Waypoint } from '@/app/lib/workspace/types';

export function DeleteWaypointsDialog({
  open,
  onOpenChange,
  ids,
  waypoints,
  edges,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  waypoints: Waypoint[];
  edges: Edge[];
  onConfirm: () => void;
}) {
  const doomed = new Set(ids);
  const chosen = waypoints.filter(waypoint => doomed.has(waypoint.id));
  const links = edges.filter(edge => doomed.has(edge.source) || doomed.has(edge.target)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {chosen.length} waypoints?</DialogTitle>
          <DialogDescription>
            {chosen.length} waypoints and {links} {links === 1 ? 'link' : 'links'} leave the map, and they leave every
            tour that stops at them. Undo brings them back.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-40 space-y-1 overflow-auto text-sm">
          {chosen.map(waypoint => (
            <li key={waypoint.id} className="truncate">
              {waypoint.label}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete {chosen.length} waypoints
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
