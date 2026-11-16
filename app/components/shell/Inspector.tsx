'use client';

import { useStore } from 'zustand';
import { TourEditor } from '@/app/components/shell/TourEditor';
import { WaypointEditor } from '@/app/components/shell/WaypointEditor';
import type { MapStore } from '@/app/lib/store/map-store';
import { nextWaypointId } from '@/app/lib/store/selectors';
import { Button } from '@/app/components/ui/button';

export function Inspector({ store, editing }: { store: MapStore; editing: boolean }) {
  const selectedId = useStore(store, state => state.selectedWaypointId);
  const document = useStore(store, state => state.document);
  const activeTourId = useStore(store, state => state.activeTourId);

  const waypoint = document?.waypoints.find(item => item.id === selectedId) ?? null;
  const tour = document?.tours.find(item => item.id === activeTourId) ?? null;

  if (editing && tour && document) {
    return (
      <TourEditor
        tour={tour}
        waypoints={document.waypoints}
        onChange={patch => store.getState().updateTour(tour.id, patch)}
        onReorder={(from, to) => store.getState().moveStop(tour.id, from, to)}
        onRemoveStop={index =>
          store.getState().setTourStops(
            tour.id,
            tour.stops.filter((_, position) => position !== index)
          )
        }
      />
    );
  }

  if (waypoint) {
    return (
      <div>
        <WaypointEditor
          key={waypoint.id}
          waypoint={waypoint}
          onCommit={patch => store.getState().updateWaypoint(waypoint.id, patch)}
        />
        <div className="space-y-2 border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={!tour || tour.stops.some(stop => stop.waypointId === waypoint.id)}
            onClick={() => {
              if (!tour) {
                return;
              }
              store.getState().setTourStops(tour.id, [...tour.stops, { waypointId: waypoint.id }]);
            }}
          >
            Add to current tour
          </Button>
          <Button variant="destructive" className="w-full" onClick={() => store.getState().deleteWaypoint(waypoint.id)}>
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
