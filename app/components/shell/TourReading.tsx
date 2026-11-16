'use client';

import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { hasAnyNarration, stopSentence, type StopView } from '@/app/lib/tour-reading';
import type { Tour } from '@/app/lib/workspace/types';

const NO_NARRATION = 'This stop has no narration yet.';
const ABOUT = 'About this waypoint';
const TOUR_NO_NARRATION = 'This tour has no narration yet.';
const EMPTY_TOUR = 'This tour has no stops yet.';
const EMPTY_TOUR_HINT = 'Add stops with Edit tour.';
const CLOSE = 'Hide the tour text';

function TypeBadge({ view }: { view: StopView }) {
  if (!view.type) {
    return null;
  }
  return (
    <Badge variant="secondary" className="font-normal">
      {view.type}
    </Badge>
  );
}

function Narration({ view }: { view: StopView }) {
  if (!view.hasNarration) {
    return <p className="text-sm text-muted-foreground">{NO_NARRATION}</p>;
  }
  return <p className="whitespace-pre-line text-sm leading-relaxed">{view.narration}</p>;
}

function Description({ view }: { view: StopView }) {
  if (!view.description) {
    return null;
  }
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{ABOUT}</h3>
      <p className="whitespace-pre-line text-sm text-muted-foreground">{view.description}</p>
    </div>
  );
}

function StopBlock({ view }: { view: StopView }) {
  return (
    <div className="space-y-2">
      <TypeBadge view={view} />
      <p className="text-sm font-medium">{view.label}</p>
      <Narration view={view} />
      <Description view={view} />
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
      <p className="text-xs text-muted-foreground tabular-nums">{title}</p>
      <Button variant="ghost" size="icon" aria-label={CLOSE} className="-mt-1 -mr-2 shrink-0" onClick={onClose}>
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

function EmptyTour({ tour }: { tour: Tour }) {
  return (
    <div className="space-y-1 px-3 py-2">
      <p className="text-sm font-medium">{tour.name}</p>
      <p className="text-sm text-muted-foreground">{EMPTY_TOUR}</p>
      <p className="text-sm text-muted-foreground">{EMPTY_TOUR_HINT}</p>
    </div>
  );
}

function CardBody({
  tour,
  stops,
  step,
  onClose,
}: {
  tour: Tour;
  stops: StopView[];
  step: number;
  onClose: () => void;
}) {
  const view = stops[Math.min(Math.max(step, 0), stops.length - 1)];
  if (!view) {
    return (
      <div className="flex h-full flex-col">
        <Header title={tour.name} onClose={onClose} />
        <EmptyTour tour={tour} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <Header title={stopSentence(view)} onClose={onClose} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-2">
          <StopBlock view={view} />
        </div>
      </ScrollArea>
    </div>
  );
}

function PanelBody({
  tour,
  stops,
  step,
  onRead,
  onClose,
}: {
  tour: Tour;
  stops: StopView[];
  step: number;
  onRead: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-sm font-medium">{tour.name}</p>
        <Button variant="ghost" size="icon" aria-label={CLOSE} className="-mt-1 -mr-2 shrink-0" onClick={onClose}>
          <XIcon aria-hidden="true" />
        </Button>
      </div>
      {stops.length === 0 ? (
        <EmptyTour tour={tour} />
      ) : (
        <>
          {hasAnyNarration(tour) ? null : (
            <p className="px-3 py-2 text-sm text-muted-foreground">{TOUR_NO_NARRATION}</p>
          )}
          <ScrollArea className="min-h-0 flex-1">
            <ol className="divide-y divide-border">
              {stops.map((view, index) => (
                <li key={`${view.position}`} aria-current={index === step ? 'step' : undefined}>
                  <button
                    type="button"
                    className="w-full space-y-2 px-3 py-2 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&[aria-current=step]]:bg-accent"
                    onClick={() => onRead(index)}
                  >
                    <p className="text-xs text-muted-foreground tabular-nums">{stopSentence(view)}</p>
                    <StopBlock view={view} />
                  </button>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

export function TourReading({
  shape,
  tour,
  stops,
  step,
  onRead,
  onClose,
  children,
}: {
  shape: 'card' | 'panel';
  tour: Tour;
  stops: StopView[];
  step: number;
  onRead: (index: number) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const label = `Tour text: ${tour.name}`;
  const body =
    shape === 'card' ? (
      <CardBody tour={tour} stops={stops} step={step} onClose={onClose} />
    ) : (
      <PanelBody tour={tour} stops={stops} step={step} onRead={onRead} onClose={onClose} />
    );

  if (shape === 'panel') {
    return (
      <section
        role="region"
        aria-label={label}
        className="bg-canvas flex h-full w-[26rem] shrink-0 flex-col border-r border-border"
      >
        {body}
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label={label}
      className="bg-background flex h-full max-h-full w-full flex-col overflow-hidden rounded-md border border-border shadow-md"
    >
      {body}
      {children}
    </section>
  );
}
