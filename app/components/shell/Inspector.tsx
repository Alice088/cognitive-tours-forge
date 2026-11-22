'use client';

import { Maximize2Icon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useStore } from 'zustand';
import { DeleteWaypointsDialog } from '@/app/components/shell/DeleteWaypointsDialog';
import { TourEditor } from '@/app/components/shell/TourEditor';
import { WaypointEditor } from '@/app/components/shell/WaypointEditor';
import type { MapStore } from '@/app/lib/store/map-store';
import { nextEdgeId, nextWaypointId } from '@/app/lib/store/selectors';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

export function Inspector({ store, editing }: { store: MapStore; editing: boolean }) {
  const selectedId = useStore(store, state => state.selectedWaypointId);
  const selectedIds = useStore(store, state => state.selectedIds);
  const document = useStore(store, state => state.document);
  const activeTourId = useStore(store, state => state.activeTourId);
  const readOnly = useStore(store, state => state.readOnly);
  const documentEpoch = useStore(store, state => state.documentEpoch);
  const [confirming, setConfirming] = useState(false);

  const waypoint = document?.waypoints.find(item => item.id === selectedId) ?? null;
  const tour = document?.tours.find(item => item.id === activeTourId) ?? null;

  if (document && selectedIds.length > 1) {
    const doomed = new Set(selectedIds);
    const links = document.edges.filter(edge => doomed.has(edge.source) || doomed.has(edge.target)).length;
    const stops = document.tours.reduce(
      (total, item) => total + item.stops.filter(stop => doomed.has(stop.waypointId)).length,
      0
    );
    return (
      <div className="space-y-3 p-3">
        <p className="text-sm font-medium">{selectedIds.length} waypoints selected</p>
        <p className="text-sm text-muted-foreground">
          {links} {links === 1 ? 'link' : 'links'} and {stops} tour {stops === 1 ? 'stop' : 'stops'} point at them.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => store.getState().selectWaypoint(selectedId ?? selectedIds[0])}
        >
          Select one
        </Button>
        <Button variant="destructive" className="w-full" disabled={readOnly} onClick={() => setConfirming(true)}>
          Delete selected
        </Button>
        <DeleteWaypointsDialog
          open={confirming}
          onOpenChange={setConfirming}
          ids={selectedIds}
          waypoints={document.waypoints}
          edges={document.edges}
          onConfirm={() => {
            store.getState().deleteWaypoints(selectedIds);
            setConfirming(false);
          }}
        />
      </div>
    );
  }

  if (editing && tour && document) {
    return (
      <TourEditor
        tour={tour}
        waypoints={document.waypoints}
        readOnly={readOnly}
        onChange={patch => store.getState().updateTour(tour.id, patch)}
        onAddStop={waypointId => store.getState().setTourStops(tour.id, [...tour.stops, { waypointId }])}
        onNarrative={(index, narrative) =>
          store.getState().setTourStops(
            tour.id,
            tour.stops.map((stop, position) => (position === index ? { waypointId: stop.waypointId, narrative } : stop))
          )
        }
        onReorder={(from, to) => store.getState().moveStop(tour.id, from, to)}
        onRemoveStop={index =>
          store.getState().setTourStops(
            tour.id,
            tour.stops.filter((_, position) => position !== index)
          )
        }
        onDelete={() => store.getState().deleteTour(tour.id)}
      />
    );
  }

  if (waypoint) {
    const links = (document?.edges ?? []).filter(edge => edge.source === waypoint.id || edge.target === waypoint.id);
    const labelOf = (id: string) => document?.waypoints.find(item => item.id === id)?.label ?? id;
    const candidates = (document?.waypoints ?? []).filter(item => item.id !== waypoint.id);
    const inTour = tour?.stops.some(stop => stop.waypointId === waypoint.id) ?? false;
    return (
      <div>
        <WaypointEditor
          key={`${waypoint.id}-${documentEpoch}`}
          waypoint={waypoint}
          readOnly={readOnly}
          onCommit={patch => store.getState().updateWaypoint(waypoint.id, patch)}
          onDrafting={drafting => store.getState().setDrafting(drafting)}
        />

        <div className="space-y-2 border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={readOnly || !waypoint.size}
            onClick={() => store.getState().updateWaypoint(waypoint.id, { size: undefined })}
          >
            <Maximize2Icon aria-hidden="true" />
            Fit the box to its text
          </Button>
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <Label htmlFor="link-target">Links</Label>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">This waypoint is not linked to another one yet.</p>
          ) : (
            <ul className="space-y-1">
              {links.map(edge => (
                <li key={edge.id} className="flex items-center gap-1 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {labelOf(edge.source)} → {labelOf(edge.target)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove the link from ${labelOf(edge.source)} to ${labelOf(edge.target)}`}
                    disabled={readOnly}
                    onClick={() => store.getState().deleteEdge(edge.id)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Select
            value=""
            disabled={readOnly || candidates.length === 0}
            onValueChange={target => {
              if (!document) {
                return;
              }
              store.getState().addEdge({
                id: nextEdgeId(document.edges),
                source: waypoint.id,
                target,
              });
            }}
          >
            <SelectTrigger id="link-target" aria-label="Connect to a waypoint">
              <SelectValue placeholder="Connect to a waypoint" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={readOnly || !tour || inTour}
            onClick={() => {
              if (!tour) {
                return;
              }
              store.getState().setTourStops(tour.id, [...tour.stops, { waypointId: waypoint.id }]);
            }}
          >
            {tour
              ? inTour
                ? `Already in “${tour.name}”`
                : `Add to “${tour.name}”, stop ${tour.stops.length + 1}`
              : 'Add to a tour'}
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            disabled={readOnly}
            onClick={() => store.getState().deleteWaypoint(waypoint.id)}
          >
            Delete waypoint
          </Button>
        </div>
      </div>
    );
  }

  if (document) {
    return (
      <div className="space-y-3 p-3">
        <p className="text-sm text-muted-foreground">
          Select a waypoint on the map to edit it here, or open a tour from the dock.
        </p>
        <Button
          variant="outline"
          disabled={readOnly}
          onClick={() =>
            store.getState().addWaypoint({
              id: nextWaypointId(document.waypoints),
              label: 'New waypoint',
              type: 'Open Question',
              position: { x: 80, y: 80 },
            })
          }
        >
          Add a waypoint
        </Button>
      </div>
    );
  }

  return <p className="p-3 text-sm text-muted-foreground">Open a map to see what you can edit.</p>;
}
