'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge as FlowEdge,
  type NodeTypes,
} from '@xyflow/react';
import { useMemo, useState } from 'react';
import { WaypointNode, type WaypointNodeType } from '@/app/components/shell/WaypointNode';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { WAYPOINT_TYPES } from '@/app/lib/theme/tokens';
import type { Edge, Waypoint } from '@/app/lib/workspace/types';

const nodeTypes: NodeTypes = { waypoint: WaypointNode };

export function MapCanvas({
  waypoints,
  edges,
  selectedId,
  onSelect,
  dimmedIds,
}: {
  waypoints: Waypoint[];
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  dimmedIds: Set<string> | null;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return waypoints.filter(waypoint => {
      const matchesType = type === 'all' || waypoint.type === type;
      const matchesQuery =
        needle === '' ||
        waypoint.label.toLowerCase().includes(needle) ||
        (waypoint.description ?? '').toLowerCase().includes(needle);
      return matchesType && matchesQuery;
    });
  }, [waypoints, query, type]);

  const nodes = useMemo<WaypointNodeType[]>(
    () =>
      visible.map(waypoint => ({
        id: waypoint.id,
        type: 'waypoint',
        position: waypoint.position,
        selected: waypoint.id === selectedId,
        data: {
          label: waypoint.label,
          type: waypoint.type,
          dimmed: dimmedIds ? !dimmedIds.has(waypoint.id) : false,
        },
      })),
    [visible, selectedId, dimmedIds]
  );

  const flowEdges = useMemo<FlowEdge[]>(
    () =>
      edges
        .filter(edge => visible.some(item => item.id === edge.source))
        .filter(edge => visible.some(item => item.id === edge.target))
        .map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: false,
        })),
    [edges, visible]
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-wrap items-end gap-2 border-b border-border bg-canvas px-3 py-2">
        <div className="min-w-40 flex-1">
          <Label htmlFor="map-search" className="sr-only">
            Search waypoints
          </Label>
          <Input
            id="map-search"
            placeholder="Search waypoints"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
        <div className="w-44">
          <Label htmlFor="map-type" className="sr-only">
            Filter by type
          </Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="map-type" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {WAYPOINT_TYPES.map(item => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {visible.length} of {waypoints.length} waypoints
        </p>
      </div>

      <div className="min-h-0 flex-1">
        {waypoints.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium">This map has no waypoints yet.</p>
              <p className="text-sm text-muted-foreground">
                A map collects the waypoints and tours that explain a project.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onlyRenderVisibleElements
            onNodeClick={(_, node) => onSelect(node.id)}
            onPaneClick={() => onSelect(null)}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--canvas-grid)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
