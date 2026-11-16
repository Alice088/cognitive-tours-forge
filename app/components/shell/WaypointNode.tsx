'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { cn } from '@/app/lib/utils';
import type { WaypointType } from '@/app/lib/theme/tokens';

export interface WaypointNodeData extends Record<string, unknown> {
  label: string;
  type: WaypointType;
  dimmed: boolean;
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

function WaypointNodeInner({ data, selected }: NodeProps<WaypointNodeType>) {
  return (
    <div
      className={cn(
        'w-52 rounded-lg border px-3 py-2 text-left shadow-sm transition-opacity',
        TYPE_CLASS[data.type],
        selected && 'ring-2 ring-state-selected',
        data.dimmed && 'opacity-40'
      )}
    >
      <Handle type="target" position={Position.Top} className="!size-2" />
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{data.type}</p>
      <p className="mt-0.5 line-clamp-3 text-sm font-medium">{data.label}</p>
      <Handle type="source" position={Position.Bottom} className="!size-2" />
    </div>
  );
}

export const WaypointNode = memo(WaypointNodeInner, (previous, next) => {
  return (
    previous.data.label === next.data.label &&
    previous.data.type === next.data.type &&
    previous.data.dimmed === next.data.dimmed &&
    previous.selected === next.selected
  );
});
