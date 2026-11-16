'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesState,
  type Edge as FlowEdge,
  type NodeTypes,
} from '@xyflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WaypointNode, type WaypointNodeType } from '@/app/components/shell/WaypointNode';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { WAYPOINT_TYPES } from '@/app/lib/theme/tokens';
import type { Edge, Position, Waypoint } from '@/app/lib/workspace/types';

const nodeTypes: NodeTypes = { waypoint: WaypointNode };

const ARROWS: Record<string, Position> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function nextWaypoint(waypoints: Waypoint[], from: string | null, step: Position): Waypoint | null {
  const origin = waypoints.find(waypoint => waypoint.id === from) ?? null;
  if (!origin) {
    return waypoints[0] ?? null;
  }
  let best: Waypoint | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of waypoints) {
    if (candidate.id === origin.id) {
      continue;
    }
    const dx = candidate.position.x - origin.position.x;
    const dy = candidate.position.y - origin.position.y;
    const ahead = dx * step.x + dy * step.y;
    if (ahead <= 0) {
      continue;
    }
    const score = ahead + Math.abs(dx * step.y - dy * step.x);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

export function MapCanvas({
  waypoints,
  edges,
  selectedId,
  onSelect,
  onMove,
  dimmedIds,
  readOnly,
}: {
  waypoints: Waypoint[];
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: Position) => void;
  dimmedIds: Set<string> | null;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('all');
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (event.key !== '/' || typing || event.metaKey || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
        draggable: !readOnly,
        data: {
          label: waypoint.label,
          type: waypoint.type,
          dimmed: dimmedIds ? !dimmedIds.has(waypoint.id) : false,
        },
      })),
    [visible, dimmedIds, readOnly]
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<WaypointNodeType>(nodes);
  const selectedRef = useRef(selectedId);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setFlowNodes(nodes.map(node => ({ ...node, selected: node.id === selectedRef.current })));
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    setFlowNodes(current =>
      current.map(node => {
        const shouldSelect = node.id === selectedId;
        if (Boolean(node.selected) === shouldSelect) {
          return node;
        }
        return { ...node, selected: shouldSelect };
      })
    );
  }, [selectedId, setFlowNodes]);

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
            ref={search}
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
          <div
            role="group"
            aria-label="Map"
            tabIndex={0}
            className="h-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={event => {
              const step = ARROWS[event.key];
              if (!step || event.metaKey || event.ctrlKey || event.altKey) {
                return;
              }
              const target = nextWaypoint(visible, selectedId, step);
              if (!target) {
                return;
              }
              event.preventDefault();
              onSelect(target.id);
            }}
          >
            <ReactFlow
              nodes={flowNodes}
              onNodesChange={onNodesChange}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onlyRenderVisibleElements
              nodesDraggable={!readOnly}
              nodesConnectable={false}
              onNodeClick={(_, node) => onSelect(node.id)}
              onNodeDragStop={(_, node) => onMove(node.id, node.position)}
              onPaneClick={() => onSelect(null)}
              fitView
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: false }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--canvas-grid)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
