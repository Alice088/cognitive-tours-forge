# Research — A tour that reads like a tour

**Feature**: `015-tour-view-and-actions` | **Date**: 2026-11-16

Twelve decisions. Each one names what was chosen, why, and what was rejected. The five decisions that
came from the person are quoted from `spec.md` → `## Clarifications`.

---

## D1 — One surface with two shapes, not two components

**Decision**: a single `app/components/shell/TourReading.tsx` renders both the single-stop card and the
whole-tour panel. Its props decide the shape; the content markup for one stop is written once and reused
per stop in the list.

**Rationale**: FR-005 forbids a second surface appearing, and FR-011 says the whole-tour reading happens
in the same surface. Two components would drift: the card would learn a new field and the list would
not. One component also means one place to keep the "no narration yet" sentence and the accessible names.

**Alternatives considered**:

- `TourCard.tsx` + `TourOverview.tsx` — rejected: two sources for the same four lines of text.
- Reuse `TourEditor` in read mode — rejected: the editor is an authoring surface with move and delete
  controls, and FR-021 requires a read-only copy to show no editing control at all.

---

## D2 — Reading visibility is local component state, never store state

**Decision**: `MapWorkspace` holds `readingDismissed: boolean` and derives `readingVisible` from
`tour`, `tour.stops.length`, `overview` and that flag. Nothing about reading enters
`app/lib/store/map-store.ts`.

**Rationale**: the store is wrapped in `zundo`; anything stored there becomes an undo step. FR-022
forbids reading from creating an undo step, and "I closed the card" is not a change to the map.

**Alternatives considered**:

- A `readingOpen` field in the store with `partialize` exclusion — rejected: touching the store for a
  purely visual flag widens the diff and risks a temporal regression for no gain.
- A query parameter in the URL — rejected: reading a stop is not a navigation the person asked for, and
  it would add history entries per step.

---

## D3 — `overview` becomes the reading mode

**Decision**: the existing `overview` flag in `MapWorkspace` (today: "Whole tour" turns off dimming)
becomes the whole-tour mode. The toggle keeps its name "Whole tour", its position in `TourDock` and its
`aria-pressed`; what changes is that the panel appears.

**Rationale**: the person already presses this control to ask "show me the whole tour". Adding a second
control with the same meaning is exactly the duplicated-controls complaint the product has collected
before. Dimming behaviour is preserved: in whole-tour mode nothing is dimmed.

**Alternatives considered**:

- A separate "Read whole tour" button — rejected: two controls, one meaning.
- Replacing the toggle with a tab between "Stop" and "Whole tour" — rejected: it changes a control the
  spec's assumptions say keeps its name, place and behaviour.

---

## D4 — Card and panel sit inside the canvas column; the map is resized, not covered

**Decision**: `TourReading` renders inside the canvas column that `MapWorkspace` already builds. The
card is absolutely positioned in a corner of the map area with a fixed maximum width — bottom-left by
default, moved to the nearest free corner when the focused stop would fall under it; the whole-tour
panel is a flex sibling of the map, so the map's box shrinks and React Flow re-measures.

**Rationale**: FR-009 (card never covers the focused stop or its neighbours) and FR-011 (panel on the
left edge, map still visible) describe two different geometries. A flex sibling is the only way to make
the map narrower without covering it; absolute positioning is the only way to keep the card out of the
layout flow in stop-by-stop mode.

**Alternatives considered**:

- Both as overlay panels — rejected: a full-height overlay covers the map, which FR-011 forbids.
- Both as flex siblings — rejected: the card would then take a permanent column from the map while
  reading one stop, and the map would jump on every dismiss.
- Card pinned to bottom-left with the stop allowed under it — rejected: FR-009 says the card never
  covers the focused stop, and panning the map on appearance is forbidden by the same requirement.
- Card bottom-left with the map panned to clear it — rejected: FR-009 forbids the surface's appearance
  from panning or zooming the map.

**Placement rule**: `pickCorner(area, card, stop)` in `app/lib/tour-reading.ts` tries
`bottom-left → bottom-right → top-right → top-left` and returns the first corner whose card rectangle
does not intersect the focused stop's node box. The focused stop's screen point comes from the React
Flow viewport (`x + position.x * zoom`), so the rule follows pan and zoom without touching them.

---

## D5 — Auto-open, and dismissal scoped to one tour

**Decision**: `readingVisible = Boolean(tour) && !readingDismissed`. A tour with no stops still shows the
surface, carrying `This tour has no stops yet.`. `readingDismissed` is reset when the active tour changes
(the same place `overview` and `editing` are already reset) and when the map changes.

Clarification quoted: _"Открывается сама при выборе тура и при каждом шаге; закрытие держится до конца
работы с этим туром, пока её не вернут кнопкой; выбор другого тура открывает снова."_

**Rationale**: FR-006 and FR-008 pull in opposite directions on purpose — the card is automatic until
the person says otherwise, and "otherwise" is remembered for that tour only. Resetting on tour change is
also FR-024.

**Alternatives considered**:

- Remember dismissal per map, across tours — rejected: it contradicts FR-024 ("MUST open again … even if
  it was dismissed for the previous tour").
- Remember it in `localStorage` — rejected: no requirement, and it would survive a reload in a way the
  person never asked for.

---

## D6 — Arrow precedence: the tour wins while a tour is selected

**Decision**: `MapCanvas` gains an optional `onTourArrow?: (direction: 'previous' | 'next') => boolean`.
The existing `onKeyDown` handler asks it first; if it returns `true`, the handler calls
`preventDefault()` and returns. `MapWorkspace` supplies it whenever a tour is selected and the tour is
not being edited; it steps the walk and selects the new stop's waypoint.

**Rationale**: FR-026/FR-027. The arrow handler already lives in the map group, and the precedence rule
must be decided in exactly one place or the search field and the inspector will start stepping tours.
Today `ARROWS` maps every direction to `nextWaypoint(visible, selectedId, step)`; that stays the
behaviour when no tour is selected, which is what `tests/acceptance/keyboard.spec.ts` exercises.

**Alternatives considered**:

- A window-level `keydown` listener — rejected: it would fire while typing a narration in the editor.
- Making the card a focusable widget that owns the arrows — rejected: the person's hands are on the map,
  and FR-025 only requires the surface to be reachable, not that it must be focused first.

At the first stop the left arrow and at the last stop the right arrow do nothing and still consume the
key, so the selection cannot move behind the person's back.

---

## D7 — The stop's content is derived by one pure function

**Decision**: `app/lib/tour-reading.ts` exports `stopView(stop, waypoint, index, total)` returning
`{ position, label, type, narration, description, hasNarration }`, plus `hasAnyNarration(tour)`. A
narration that is only whitespace counts as absent (edge case in the spec).

**Rationale**: FR-002/FR-003/FR-004/FR-013 are all "what is shown", and the difference between "no
narration" and "narration that looks empty" is exactly the kind of thing that gets a unit test instead
of a browser. It also keeps `TourReading.tsx` a presentation file with no conditional text logic beyond
one ternary.

**Alternatives considered**:

- Deriving inside the component — rejected: no browser-free test, and the same rules would be needed
  again in the whole-tour list.
- Extending `app/lib/tour-markdown.ts` — rejected: that module renders a shareable document; reading a
  stop on screen is a different output.

---

## D8 — Scrolling: `ScrollArea`, never an ellipsis

**Decision**: the narration paragraph is rendered with `whitespace-pre-line` inside a `ScrollArea` with
a maximum height on the card. The whole-tour panel has its own `ScrollArea` filling the panel height.

**Rationale**: FR-010 forbids truncation. `tour-markdown.ts` already quotes the narration as a paragraph,
so line breaks are meaningful and must be preserved on screen too.

**Alternatives considered**:

- `line-clamp` with a "more" affordance — rejected: forbidden by FR-010, and `TourEditor` already uses
  `line-clamp-2` for its own compact list, which is fine because that is a summary, not the reading.

---

## D9 — Fit the view after the panel opens, not after the card

**Decision**: opening or closing the whole-tour panel asks React Flow to fit the visible stops again
(the canvas already knows how via its `fitView` option; the panel toggle is the only trigger added).

**Rationale**: FR-009 forbids the card from panning or zooming the map — the card changes nothing about
the map's box. The panel does change the box; leaving the view untouched would push the focused stop out
of sight, which contradicts the reason for reading the tour. The two cases are different and are treated
differently on purpose.

**Alternatives considered**:

- Never refit — rejected: at 1440 px the panel takes ~30% of the width and the focused node lands off
  screen.
- Animate the transition — rejected: motion is not requested and would fight SC-005's "no visible
  re-layout".

---

## D10 — The two actions join the top row; the four-region invariant is restored

**Decision**: `MapActions` loses `absolute right-2 top-2 z-10` and its `data-region="map-actions"`
attribute. `MapCanvas` gains an `actions?: ReactNode` slot rendered in its top row after the waypoint
count. Below the `md` breakpoint the two buttons collapse into one `DropdownMenu` trigger labelled
"More map actions".

**Rationale**: FR-015/FR-016/FR-018. Placing them in the row `MapCanvas` already owns avoids rebuilding
that row in `MapWorkspace` (which would duplicate the search field, the type filter and the count).
Removing the attribute is not cosmetic: `tests/acceptance/shell.spec.ts:72` asserts `[data-region]` is
exactly four, and the floating bar has been a fifth region since feature 014 — a live regression this
change repairs.

**Alternatives considered**:

- Rendering `MapActions` from `MapWorkspace` into a new row above `MapCanvas` — rejected: two rows of
  chrome, and the search field would no longer be the first control.
- Keeping `data-region` and updating the test to five — rejected: the attribute marks a layout region,
  and an overlay that no longer exists must not keep claiming to be one.
- `hidden` labels only, no overflow menu — rejected: FR-018 requires the actions to stay reachable on a
  narrow window, and two icon-only buttons plus search plus the type filter do not fit at 390 px.

---

## D11 — Announcements

**Decision**: the reading surface is a `role="region"` with `aria-label` naming the tour and the stop
position; the stop number and label are plain text inside it; a polite live region already exists in
`MapWorkspace`'s `announcement` for map-level messages and is left alone.

**Rationale**: FR-025. Naming the region by its stop lets a screen reader say where it is without
reading the whole card first; a second live region would compete with the existing one.

**Alternatives considered**:

- `role="dialog"` — rejected: it is not modal, it does not trap focus, and it must not steal focus
  (D6).
- A new live region per step — rejected: two competing announcements on every Next.

---

## D12 — Test layers

**Decision**:

- `tests/unit/tour-reading.test.ts` — `stopView` and `hasAnyNarration`: narration present, absent,
  whitespace-only, description absent, positions at first/last stop, empty tour.
- `tests/acceptance/tour-reading.spec.ts` — the card's content and the four visible facts, step by
  button and by arrow, dismissal and restore, no second surface, switching tours, the whole-tour panel
  with the map still visible and a stop chosen from it, a tour with no narration, read-only map.
- `tests/acceptance/shell.spec.ts` — the four-region count again plus "no control floats over the map":
  a waypoint dragged into the top-right corner stays visible and clickable.
- `tests/acceptance/keyboard.spec.ts` — unchanged behaviour with no tour, and the new precedence with
  one.

**Rationale**: the unit test covers the derivation that would otherwise need a browser; the acceptance
test covers everything the person can perceive, including the defect being repaired. `MapCanvas` uses
`onlyRenderVisibleElements`, so acceptance asserts counts and text rather than node labels where the
existing suite already learned to.

**Alternatives considered**:

- A jsdom component test of `TourReading` — rejected: `@testing-library` is available but the same
  assertions are more honest in the production build, where the layout and the tokens are real.
- Asserting exact pixel widths of the card and panel — rejected: the contract fixes a maximum width, not
  a layout constant; pinning pixels makes the suite brittle for no requirement.
