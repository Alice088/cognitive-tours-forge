'use client';

import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PanelRightIcon, PanelRightCloseIcon } from 'lucide-react';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/app/components/ui/sheet';
import { cn } from '@/app/lib/utils';

export interface AppShellProps {
  rail: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  dock: ReactNode;
  inspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
}

const NARROW_QUERY = '(max-width: 1023px)';
function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function AppShell({ rail, canvas, inspector, dock, inspectorOpen, onInspectorOpenChange }: AppShellProps) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileRail, setMobileRail] = useState(false);
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside
        data-region="rail"
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-rail text-rail-foreground md:flex',
          railCollapsed ? 'w-14 [&_[data-rail-label]]:hidden [&_[data-rail-wide]]:hidden' : 'w-14 lg:w-60'
        )}
      >
        <div className="min-h-0 flex-1">{rail}</div>
        <div className="border-t border-border p-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={railCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setRailCollapsed(value => !value)}
          >
            {railCollapsed ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2 md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileRail(true)}>
            <MenuIcon aria-hidden="true" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Cognitive Tours</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={inspectorOpen ? 'Close inspector' : 'Open inspector'}
            onClick={() => onInspectorOpenChange(!inspectorOpen)}
          >
            <PanelRightIcon aria-hidden="true" />
          </Button>
        </div>

        <div data-region="canvas" className="relative min-h-0 min-w-0 flex-1 bg-canvas">
          {canvas}
        </div>

        <div data-region="dock" className="shrink-0 border-t border-border bg-dock text-dock-foreground">
          {dock}
        </div>
      </div>

      {inspectorCollapsed ? (
        <div className="hidden shrink-0 border-l border-border bg-background p-1 lg:block">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand inspector"
            onClick={() => setInspectorCollapsed(false)}
          >
            <PanelRightIcon aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <aside
          data-region="inspector"
          className="hidden shrink-0 flex-col border-l border-border bg-background lg:flex lg:w-80"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Inspector</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Collapse inspector"
              onClick={() => setInspectorCollapsed(true)}
            >
              <PanelRightCloseIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{inspector}</div>
        </aside>
      )}

      <Sheet open={mobileRail} onOpenChange={setMobileRail}>
        <SheetContent side="left" className="w-72 bg-rail p-0 text-rail-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {rail}
        </SheetContent>
      </Sheet>

      {narrow ? (
        <Sheet open={inspectorOpen} onOpenChange={onInspectorOpenChange}>
          <SheetContent side="right" className="w-80 bg-background p-0">
            <SheetTitle className="sr-only">Inspector</SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto">{inspector}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
