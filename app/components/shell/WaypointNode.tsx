'use client';

import { Handle, NodeResizeControl, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { cn } from '@/app/lib/utils';
import type { WaypointType } from '@/app/lib/theme/tokens';
import {
  MAX_WAYPOINT_HEIGHT,
  MAX_WAYPOINT_WIDTH,
  MIN_WAYPOINT_HEIGHT,
  MIN_WAYPOINT_WIDTH,
  type WaypointSize,
} from '@/app/lib/waypoint-size';

export interface WaypointNodeData extends Record<string, unknown> {
  label: string;
  type: WaypointType;
  dimmed: boolean;
  width: number;
  size: WaypointSize | null;
  resizable: boolean;
  onResize: (id: string, size: WaypointSize) => void;
}

export type WaypointNodeType = Node<WaypointNodeData, 'waypoint'>;

const TYPE_CLASS: Record<WaypointType, string> = {
  Goal: 'bg-waypoint-goal text-waypoint-goal-foreground border-waypoint-goal-foreground/40',
  'User Need': 'bg-waypoint-user-need text-waypoint-user-need-foreground border-waypoint-user-need-foreground/40',
  Feature: 'bg-waypoint-feature text-waypoint-feature-foreground border-waypoint-feature-foreground/40',
  ADR: 'bg-waypoint-adr text-waypoint-adr-foreground border-waypoint-adr-foreground/40',
  'Code Component':
    'bg-waypoint-code-component text-waypoint-code-component-foreground border-waypoint-code-component-foreground/40',
  Test: 'bg-waypoint-test text-waypoint-test-foreground border-waypoint-test-foreground/40',
  Risk: 'bg-waypoint-risk text-waypoint-risk-foreground border-waypoint-risk-foreground/40',
  'AI Instruction':
    'bg-waypoint-ai-instruction text-waypoint-ai-instruction-foreground border-waypoint-ai-instruction-foreground/40',
  'Open Question':
    'bg-waypoint-open-question text-waypoint-open-question-foreground border-waypoint-open-question-foreground/40',
  Deprecated: 'bg-waypoint-deprecated text-waypoint-deprecated-foreground border-waypoint-deprecated-foreground/40',
};

function WaypointNodeInner({ id, data, selected }: NodeProps<WaypointNodeType>) {
  const boundaries = {
    minWidth: MIN_WAYPOINT_WIDTH,
    minHeight: MIN_WAYPOINT_HEIGHT,
    maxWidth: MAX_WAYPOINT_WIDTH,
    maxHeight: MAX_WAYPOINT_HEIGHT,
  };
  const commit = (_: unknown, params: { width: number; height: number }) =>
    data.onResize(id, { width: params.width, height: params.height });

  return (
    <>
      {data.resizable ? (
        <>
          <NodeResizer
            isVisible={selected}
            {...boundaries}
            lineClassName="!border-state-selected"
            handleClassName="!size-2 !rounded-sm !border-state-selected !bg-background"
            onResizeEnd={commit}
          />
          {selected ? (
            <>
              <NodeResizeControl
                position="right"
                resizeDirection="horizontal"
                {...boundaries}
                className="!size-2 !rounded-sm !border-state-selected !bg-background"
                onResizeEnd={commit}
              />
              <NodeResizeControl
                position="bottom"
                resizeDirection="vertical"
                {...boundaries}
                className="!size-2 !rounded-sm !border-state-selected !bg-background"
                onResizeEnd={commit}
              />
            </>
          ) : null}
        </>
      ) : null}
      <div
        className={cn(
          'box-border rounded-lg border px-3 py-2 text-left shadow-sm transition-opacity',
          data.size ? 'overflow-auto' : 'overflow-hidden',
          TYPE_CLASS[data.type],
          selected && 'ring-2 ring-state-selected',
          data.dimmed && 'opacity-40'
        )}
        style={{
          width: data.width,
          height: data.size ? data.size.height : 'auto',
          minHeight: data.size ? undefined : MIN_WAYPOINT_HEIGHT,
        }}
      >
        <Handle type="target" position={Position.Top} className="!size-2" />
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{data.type}</p>
        <p className="mt-0.5 text-sm font-medium break-words">{data.label}</p>
        <Handle type="source" position={Position.Bottom} className="!size-2" />
      </div>
    </>
  );
}

export const WaypointNode = memo(WaypointNodeInner, (previous, next) => {
  return (
    previous.id === next.id &&
    previous.data.label === next.data.label &&
    previous.data.type === next.data.type &&
    previous.data.dimmed === next.data.dimmed &&
    previous.data.width === next.data.width &&
    previous.data.size?.width === next.data.size?.width &&
    previous.data.size?.height === next.data.size?.height &&
    previous.data.resizable === next.data.resizable &&
    previous.selected === next.selected
  );
});
