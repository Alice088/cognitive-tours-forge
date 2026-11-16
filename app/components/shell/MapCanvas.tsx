'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useViewport,
  type Edge as FlowEdge,
  type NodeTypes,
} from '@xyflow/react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { WaypointNode, type WaypointNodeType } from '@/app/components/shell/WaypointNode';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { WAYPOINT_TYPES } from '@/app/lib/theme/tokens';
import { CARD_INSET, CONTROLS_INSET, cardBox, pickCorner, type Area, type Corner } from '@/app/lib/tour-reading';
import type { Edge, Position, Waypoint } from '@/app/lib/workspace/types';

const nodeTypes: NodeTypes = { waypoint: WaypointNode };

const NODE_WIDTH = 208;
const NODE_HEIGHT = 74;
const NARROW_QUERY = '(max-width: 767px)';

function subscribeNarrow(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}

function cornerAnchor(corner: Corner): CSSProperties {
  if (corner === 'bottom-left') {
    return { left: CARD_INSET, bottom: CONTROLS_INSET };
  }
  if (corner === 'bottom-right') {
    return { right: CARD_INSET, bottom: CARD_INSET };
  }
  if (corner === 'top-right') {
    return { right: CARD_INSET, top: CARD_INSET };
  }
  return { left: CARD_INSET, top: CARD_INSET };
}

function CornerCard({ stop, children }: { stop: Waypoint | null; children: ReactNode }) {
  const { x, y, zoom } = useViewport();
  const host = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Area>({ width: 0, height: 0 });
  const narrow = useNarrow();

  useEffect(() => {
    const node = host.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(() => setArea({ width: node.clientWidth, height: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const box = stop
    ? { x: x + stop.position.x * zoom, y: y + stop.position.y * zoom, width: NODE_WIDTH, height: NODE_HEIGHT }
    : null;
  const corner = pickCorner(area, box);
  const frame = cardBox(corner, area);

  return (
    <div ref={host} className="pointer-events-none absolute inset-0 z-10">
      {narrow ? (
        <div className="absolute inset-x-0 bottom-0 max-h-[50%] pointer-events-auto">{children}</div>
      ) : (
        <div
          className="pointer-events-auto absolute"
          style={{ ...cornerAnchor(corner), width: frame.width, maxHeight: frame.height }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

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
  actions,
  reading,
  focusedStop,
  onTourArrow,
}: {
  waypoints: Waypoint[];
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: Position) => void;
  dimmedIds: Set<string> | null;
  readOnly: boolean;
  actions?: ReactNode;
  reading?: ReactNode;
  focusedStop?: Waypoint | null;
  onTourArrow?: (direction: 'previous' | 'next') => boolean;
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
        {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
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
          <ReactFlowProvider>
            <div
              role="group"
              aria-label="Map"
              tabIndex={0}
              className="relative h-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onKeyDown={event => {
                if (event.metaKey || event.ctrlKey || event.altKey) {
                  return;
                }
                if (onTourArrow && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                  event.preventDefault();
                  onTourArrow(event.key === 'ArrowLeft' ? 'previous' : 'next');
                  return;
                }
                const step = ARROWS[event.key];
                if (!step) {
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
              {reading ? <CornerCard stop={focusedStop ?? null}>{reading}</CornerCard> : null}
            </div>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
