# 013 — A tour that reads like a tour

Walking a tour used to highlight boxes. The narration written for each stop lived
in the file and in the tour editor's two clamped lines, and nowhere else: the
inspector showed what the waypoint is, not why the author brought you to it. This
ADR records how the words got a surface of their own, and why the two map actions
left the map's corner.

## D1 — One component with two shapes

`app/components/shell/TourReading.tsx` renders both the single-stop card and the
whole-tour panel. Two components were rejected: the stop block (position, type,
label, narration, description) is identical in both, and two copies drift — the
first place a reader notices is the exact wording of "This stop has no narration
yet." The shapes differ only in frame and scroll container.

## D2 — Reading state is local, not in the store

`readingDismissed` lives in `MapWorkspace`'s state, not in the zustand store. The
store is wrapped in `zundo`, so a flag set there becomes an undo step; FR-022 says
reading creates no undo step. The dismissal is keyed by `` `${mapFile}:${tourId}` ``
rather than reset by an effect: switching tours changes the key, so the surface
opens again without any write, and a new map cannot inherit the previous
dismissal.

## D3 — `overview` becomes the whole-tour mode

The dock already had "Whole tour", which dimmed everything outside the tour and
showed all stops at once. That is the same intent as reading the tour end to end,
so the boolean drives the panel shape instead of a second control. A separate
button would have been a duplicate in the one place the product forbids them.

## D4 — Card in a corner, chosen so it never covers the focused stop

FR-009 asks for two things that collide when the focused stop sits in the
bottom-left corner: the card lives there, and it never covers the stop. Panning
the map to clear it is forbidden by the same requirement, so the card moves:
`pickCorner` in `app/lib/tour-reading.ts` tries `bottom-left → bottom-right →
top-right → top-left` and returns the first corner whose rectangle misses the
stop's node box. The stop's screen point comes from the React Flow viewport, so
pan and zoom are respected without being touched. The bottom-left box is measured
above React Flow's zoom controls so they stay clickable.

The card's maximum height is assumed (320 px) rather than measured, which biases
the choice towards moving the card: a wrong guess can move it when it did not
have to, never leave it on top of the stop.

## D5 — The panel is a flex sibling; the card is absolutely positioned

A full-height overlay over the map was rejected: FR-011 says the map stays
visible. The panel therefore takes a column (`26rem`) beside the map and the map
is resized. The card is not a sibling, because a column would have to exist while
reading exactly one stop, and the map would jump on every dismiss.

## D6 — Arrow precedence in one place

`MapCanvas` owns the arrow keys, so the tour gets a say there through
`onTourArrow`: when a tour is selected and the tour editor is closed, left and
right are consumed as steps (`preventDefault` before anything else) and the
waypoint navigation never sees them. A window-level listener was rejected — it
would fire while typing a narration. On a map with no tour read, `onTourArrow` is
`undefined` and the old behaviour is untouched, including at the first and last
stop, where the arrow is consumed and does nothing.

## D7 — The derivation is pure and the strings are fixed

`stopView` returns presentation-ready values: narration trimmed to `null` when
empty or whitespace-only, `position` one-based, `total` from the tour, `label` an
empty string when the waypoint is gone. `app/lib/tour-reading.ts` holds no React,
so the four rules that are easy to get subtly wrong are unit tests instead of
something to notice by eye. The component renders strings and nothing else.

## D8 — A tour with no stops is not silence

The surface appears for any selected tour, including one with no stops, and says
`This tour has no stops yet.` plus `Add stops with Edit tour.`. Hiding it was the
obvious alternative and was rejected: the spec asks the surface to say the tour is
empty, and a person who has just created a tour would otherwise see nothing and
assume the feature was broken.

## D9 — The map actions move into the top row and keep their places

`MapActions` lost its floating corner and `data-region="map-actions"` with it.
`AppShell` has four regions; a fifth, added when the actions were first built,
made `shell.spec.ts` fail from that day on and no acceptance run caught it. The
top row gained an `actions` slot in `MapCanvas`, the buttons keep the names and
handlers they had, and below the `md` breakpoint they collapse into one
`More map actions` menu so the search field keeps a usable width.

## D10 — Tests read the DOM, not the implementation

The acceptance suite asserts what a person perceives: the stop sentence, the
narration text, that exactly one surface exists, that the card's rectangle does
not intersect the focused node's, that the map file's sha256 is unchanged after a
full read, and that `document.elementFromPoint` at the map's top-right corner
reaches the canvas. Only the card's corner choice is unit-tested, because it is a
pure function of four numbers.
