import type { Stop, Tour, Waypoint } from '@/app/lib/workspace/types';
import type { WaypointType } from '@/app/lib/theme/tokens';

export interface StopView {
  position: number;
  total: number;
  label: string;
  type: WaypointType | null;
  narration: string | null;
  description: string | null;
  hasNarration: boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Area {
  width: number;
  height: number;
}

export type Corner = 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';

export const CARD_WIDTH = 384;
export const CARD_MAX_HEIGHT = 320;
export const CARD_INSET = 12;
export const CONTROLS_INSET = 96;
export const CORNERS: Corner[] = ['bottom-left', 'bottom-right', 'top-right', 'top-left'];

function trimmed(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const text = value.trim();
  return text === '' ? null : text;
}

export function stopView(stop: Stop, waypoint: Waypoint | null, index: number, total: number): StopView {
  const narration = trimmed(stop.narrative);
  return {
    position: index + 1,
    total,
    label: waypoint?.label ?? '',
    type: waypoint?.type ?? null,
    narration,
    description: trimmed(waypoint?.description),
    hasNarration: narration !== null,
  };
}

export function stopSentence(view: StopView): string {
  return `Stop ${view.position} of ${view.total}`;
}

export function hasAnyNarration(tour: Tour): boolean {
  return tour.stops.some(stop => trimmed(stop.narrative) !== null);
}

export function cardBox(corner: Corner, area: Area): Box {
  const width = Math.max(Math.min(CARD_WIDTH, area.width - 2 * CARD_INSET), 0);
  const height = Math.max(Math.min(CARD_MAX_HEIGHT, area.height / 2), 0);
  if (corner === 'bottom-left') {
    return { x: CARD_INSET, y: area.height - CONTROLS_INSET - height, width, height };
  }
  if (corner === 'bottom-right') {
    return { x: area.width - CARD_INSET - width, y: area.height - CARD_INSET - height, width, height };
  }
  if (corner === 'top-right') {
    return { x: area.width - CARD_INSET - width, y: CARD_INSET, width, height };
  }
  return { x: CARD_INSET, y: CARD_INSET, width, height };
}

export function intersects(left: Box, right: Box): boolean {
  return (
    left.x < right.x + right.width &&
    right.x < left.x + left.width &&
    left.y < right.y + right.height &&
    right.y < left.y + left.height
  );
}

export function pickCorner(area: Area, stop: Box | null): Corner {
  if (!stop) {
    return CORNERS[0];
  }
  return CORNERS.find(corner => !intersects(cardBox(corner, area), stop)) ?? CORNERS[0];
}
