import type { MapStore } from '@/app/lib/store/map-store';

export function undo(store: MapStore): void {
  store.temporal.getState().undo();
}

export function redo(store: MapStore): void {
  store.temporal.getState().redo();
}

export function canUndo(store: MapStore): boolean {
  return store.temporal.getState().pastStates.length > 0;
}

export function canRedo(store: MapStore): boolean {
  return store.temporal.getState().futureStates.length > 0;
}

export function clearHistory(store: MapStore): void {
  store.temporal.getState().clear();
}

export function historyDepth(store: MapStore): { past: number; future: number } {
  const temporal = store.temporal.getState();
  return { past: temporal.pastStates.length, future: temporal.futureStates.length };
}
