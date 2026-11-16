'use client';

import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PanelRightIcon, PanelRightCloseIcon } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
  announcement?: string;
}

const NARROW_QUERY = '(max-width: 767px)';
function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function AppShell({
  rail,
  canvas,
  inspector,
  dock,
  inspectorOpen,
  onInspectorOpenChange,
  announcement = '',
}: AppShellProps) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileRail, setMobileRail] = useState(false);
  const railOpener = useRef<HTMLButtonElement>(null);
  const inspectorOpener = useRef<HTMLButtonElement>(null);

  const railWasOpen = useRef(false);
  const inspectorWasOpen = useRef(false);

  const setRail = (open: boolean) => {
    setMobileRail(open);
    if (open) {
      onInspectorOpenChange(false);
    }
  };

  const setInspector = (open: boolean) => {
    onInspectorOpenChange(open);
    if (open) {
      setMobileRail(false);
    }
  };

  useEffect(() => {
    if (railWasOpen.current && !mobileRail) {
      railOpener.current?.focus();
    }
    railWasOpen.current = mobileRail;
  }, [mobileRail]);

  useEffect(() => {
    if (inspectorWasOpen.current && !inspectorOpen) {
      inspectorOpener.current?.focus();
    }
    inspectorWasOpen.current = inspectorOpen;
  }, [inspectorOpen]);
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside
        data-region="rail"
        data-collapsed={railCollapsed ? 'true' : 'false'}
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-rail text-rail-foreground md:flex md:w-14',
          railCollapsed ? 'xl:w-14' : 'xl:w-60'
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
          <Button
            ref={railOpener}
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setRail(true)}
          >
            <MenuIcon aria-hidden="true" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Cognitive Tours</span>
          <Button
            ref={inspectorOpener}
            variant="ghost"
            size="icon"
            aria-label={inspectorOpen ? 'Close inspector' : 'Open inspector'}
            onClick={() => setInspector(!inspectorOpen)}
          >
            <PanelRightIcon aria-hidden="true" />
          </Button>
        </div>

        <div data-region="dock" className="order-2 shrink-0 border-t border-border bg-dock text-dock-foreground">
          {dock}
        </div>

        <div data-region="canvas" className="relative order-1 min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          {canvas}
        </div>
      </div>

      {!narrow ? (
        <>
          {inspectorCollapsed ? (
            <div className="hidden shrink-0 border-l border-border bg-background p-1 md:block">
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
              className="hidden shrink-0 flex-col border-l border-border bg-background md:flex md:w-[300px] xl:w-80"
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
        </>
      ) : null}

      <Sheet open={mobileRail} onOpenChange={setRail}>
        <SheetContent
          side="left"
          className="w-72 bg-rail p-0 text-rail-foreground"
          onCloseAutoFocus={event => {
            event.preventDefault();
            railOpener.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {rail}
        </SheetContent>
      </Sheet>

      {narrow ? (
        <Sheet open={inspectorOpen} onOpenChange={setInspector}>
          <SheetContent
            side="right"
            className="flex w-80 flex-col bg-background p-0"
            onCloseAutoFocus={event => event.preventDefault()}
          >
            <SheetTitle className="sr-only">Inspector</SheetTitle>
            <div className="min-h-0 w-full flex-1 overflow-y-auto">{inspector}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
