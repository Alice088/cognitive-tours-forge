# Tasks: A tour that reads like a tour

**Input**: Design documents from `/specs/015-tour-view-and-actions/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/tour-reading.md`, `contracts/map-toolbar.md`, `quickstart.md`

**Tests**: included. The constitution requires tests with every change, and `research.md` D12 names the
four files; every story therefore starts with a test task that fails first.

**Organization**: three user stories, one phase each, in priority order. US1 is the MVP. US2 and US3
each stand on their own.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirm the ground the component stands on. The feature adds no dependency, no route, no
build change — there is nothing to install.

- [x] T001 Confirm the primitives and tokens the contracts name exist before writing any component: `Badge` in `app/components/ui/badge.tsx`, `DropdownMenu` in `app/components/ui/dropdown-menu.tsx`, `ScrollArea` in `app/components/ui/scroll-area.tsx`, and the `bg-background` / `border-border` / `text-muted-foreground` / `ring-ring` / `bg-canvas` tokens in `app/globals.css`; `package.json` stays untouched.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the derivation both reading shapes share.

**⚠️ CRITICAL**: US1 and US3 both render the same stop block, so this phase must land before either.

- [x] T002 [P] Write failing unit tests for the stop derivation in `tests/unit/tour-reading.test.ts`: narration present; narration absent; narration of only whitespace yields `hasNarration: false` (V1); description absent; `position` is one-based and `total` comes from the tour (V3); `sentence` reads `Stop 3 of 7`; `hasAnyNarration` is false for a tour whose every narration is whitespace; `pickCorner` returns `bottom-left` for a stop in the top-right, `bottom-right` for a stop in the bottom-left, and never returns a corner whose rectangle contains the stop.
- [x] T003 [P] Implement `StopView`, `stopView(stop, waypoint, index, total)`, `hasAnyNarration(tour)` and `pickCorner(area, card, stop)` in `app/lib/tour-reading.ts` exactly as `data-model.md` §2 and `research.md` D4 define them: `narration` and `description` trimmed to `null`, `label` an empty string and `type` `null` when the waypoint is missing, corners tried in the order `bottom-left → bottom-right → top-right → top-left`, no comment in the file.

**Checkpoint**: `npx vitest run tests/unit/tour-reading.test.ts` green — the words of a stop are now derivable without a browser.

---

## Phase 3: User Story 1 - A stop carries its own words (Priority: P1) 🎯 MVP

**Goal**: a stop's narration appears in a card on the map screen, follows every step, can be dismissed,
and is restored from the top row; the left and right arrows step the walk.

**Independent Test**: open a map with a narrated tour, select the tour, press Next through every stop —
each narration is readable on screen without the inspector, the card never doubles, dismissal holds,
restore brings it back, and the arrows step the walk.

### Tests for User Story 1

- [x] T004 [US1] Write the failing card scenarios in `tests/acceptance/tour-reading.spec.ts`: the card shows `Stop 1 of N`, the type, the label and the narration; the description sits under `About this waypoint`; stepping swaps content in place with exactly one surface in the DOM; a stop without narration shows `This stop has no narration yet.`; a whitespace-only narration counts as none.
- [x] T005 [US1] Add the failing dismissal scenarios to `tests/acceptance/tour-reading.spec.ts`: close hides the card and leaves the tour, the step and the map focus untouched; later steps do not re-open it; the top-row control named `Show the tour text` restores the card at the current stop; choosing another tour opens it again at that tour's first stop.

### Implementation for User Story 1

- [x] T006 [US1] Build the `card` shape in a new `app/components/shell/TourReading.tsx`: `role="region"` named `Tour text: <tour name>`, then `Stop N of M`, a `Badge` with the type when present, the label, the narration as `whitespace-pre-line` inside a `ScrollArea` with a maximum height, the `About this waypoint` heading with the description, the `This stop has no narration yet.` sentence when there is none, and a close `Button` with `aria-label="Hide the tour text"`; tokens only, no literal colour utility, no comment.
- [x] T007 [US1] Add `readingDismissed` to `app/components/shell/MapWorkspace.tsx`, derive `readingVisible = Boolean(tour) && !readingDismissed` so a tour with no stops still produces a surface, reset it where `overview` and `editing` are already reset (tour change, new tour) and when the map changes, hide the surface while `editing` is true, and render `<TourReading>` in the canvas column above the dock, offset above React Flow's zoom controls so those stay clickable, in the corner `pickCorner` chooses from the focused stop's viewport position; the map must not pan or zoom when it appears or moves.
- [x] T008 [US1] Add an optional `actions?: ReactNode` slot to `app/components/shell/MapCanvas.tsx` rendered as the last child of the top row, and pass from `app/components/shell/MapWorkspace.tsx` a restore `Button` with `aria-label="Show the tour text"` shown only when a tour is selected and `readingDismissed` is true.
- [x] T009 [US1] Add the optional `onTourArrow?: (direction: 'previous' | 'next') => boolean` prop to `app/components/shell/MapCanvas.tsx`, consulted before the existing `ARROWS` / `nextWaypoint` handling: when it returns `true`, `preventDefault()` and stop; at the first stop the left arrow and at the last the right arrow consume the key and change nothing. Wire it in `app/components/shell/MapWorkspace.tsx` whenever a tour is selected and `editing` is false — it steps the walk and selects the new stop's waypoint, exactly as the dock's step buttons already do.
- [x] T010 [US1] Extend `tests/acceptance/keyboard.spec.ts`: with no tour selected the arrows still move the waypoint selection (the existing case, unchanged); with a tour selected the right and left arrows move the stop and the card follows; the selection does not jump to an unrelated neighbouring waypoint.

**Checkpoint**: US1 ships alone — the narration is readable, dismissible and steppable by keyboard, and no other story is required for it.

---

## Phase 4: User Story 2 - The map's own actions stop covering the map (Priority: P2)

**Goal**: `Save a copy` and `Export all maps` live in the top row and nothing floats over the map.

**Independent Test**: open any map — the top-right corner of the map shows map content only, a waypoint
dragged there stays visible and draggable, and both actions work from the top row at every width.

### Tests for User Story 2

- [x] T011 [US2] Extend `tests/acceptance/shell.spec.ts`, failing first: `[data-region]` is exactly four again; no element with `data-region="map-actions"` exists; with no tour read, a waypoint in the map's top-right corner is fully visible and a click at that corner reaches the canvas; `Save a copy` and `Export all maps` are found inside the canvas's top row; at 390 px wide a single `More map actions` control exposes both items by name.

### Implementation for User Story 2

- [x] T012 [US2] Rewrite `app/components/shell/MapActions.tsx`: remove `absolute right-2 top-2 z-10` and `data-region="map-actions"`, keep both accessible names and both handlers unchanged, render icon-and-label `Button`s above `md` and a single `DropdownMenu` trigger labelled `More map actions` containing both items below `md`.
- [x] T013 [US2] Render the `actions` slot in `app/components/shell/MapCanvas.tsx` last in the top row with `ml-auto` above `md`, keep the search field at `min-w-40 flex-1`, and pass `<MapActions …/>` from `app/components/shell/MapWorkspace.tsx`, deleting the now-unused `relative` wrapper there.
- [x] T014 [US2] Re-run `tests/acceptance/exchange.spec.ts` and fix only selector-level fallout from the move — the four `Save a copy` clicks and the dialog they open must behave exactly as before.

**Checkpoint**: US2 ships alone — the map's corners are free and both actions are reachable at any width.

---

## Phase 5: User Story 3 - A tour can be read end to end (Priority: P3)

**Goal**: `Whole tour` turns the same surface into a left-edge panel listing every stop with its
narration, while the map shrinks and stays visible.

**Independent Test**: open a tour of at least four narrated stops, press `Whole tour`, read every
narration in order in one scrollable panel with the map beside it, choose the third stop — the walk
moves there and the card appears at that stop.

### Tests for User Story 3

- [x] T015 [US3] Add the failing whole-tour scenarios to `tests/acceptance/tour-reading.spec.ts`, including a forty-stop tour built by the fixture that renders in one scroll-through with every narration present: `Whole tour` produces a panel along the left edge filling the map's height with the tour name once and every stop in order; the map is still visible; the panel scrolls without moving the map; choosing a stop moves the walk and returns to the card at that stop; a tour with no narration anywhere shows `This tour has no narration yet.` once; closing the panel returns to the card at the stop being read.

### Implementation for User Story 3

- [x] T016 [US3] Add the `panel` shape to `app/components/shell/TourReading.tsx`, reusing the same stop block as the card: the tour name as a heading, the `This tour has no narration yet.` sentence when `hasAnyNarration` is false, one list item per stop in tour order, `aria-current="step"` on the stop being read, its own full-height `ScrollArea`, and the same close control.
- [x] T017 [US3] Render the `panel` shape as a flex sibling of the map in `app/components/shell/MapWorkspace.tsx`, deriving `shape` from `overview` and `readingVisible`, and pass a refit signal so the map re-fits when the panel opens or closes; selecting a stop from the panel calls `setStep` and turns `overview` off.
- [x] T018 [US3] Handle the refit in `app/components/shell/MapCanvas.tsx`: when the panel toggles, the map re-fits the visible stops once, so the focused stop stays on screen after the map's width changes; stepping between stops must not move the map.
- [x] T019 [US3] Keep `app/components/shell/TourDock.tsx` behaviour compatible: `Whole tour` keeps its name, its place in the dock and its `aria-pressed`, and now drives the panel; `Edit tour` hides the reading surface by clearing `overview`.

**Checkpoint**: all three stories work; a forty-stop tour is readable as one piece.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: the width, the read-only copy, the no-write guarantee, the theme, the writing and the run.

- [x] T020 Make both shapes a bottom sheet inside the canvas column below the `md` breakpoint in `app/components/shell/TourReading.tsx`, at most half the column's height, with the map visible above it.
- [x] T021 [P] Add the read-only case to `tests/acceptance/tour-reading.spec.ts`: a map opened from an unavailable project folder shows the card and the panel with the same content and no editing control in or near the surface.
- [x] T022 [P] Add the no-write case to `tests/acceptance/tour-reading.spec.ts`: `sha256sum` of the map file is identical after walking every stop by arrow, opening the whole tour, choosing a stop, closing and restoring the card, and `Undo` stays disabled throughout.
- [x] T023 [P] Add the dark-theme case to `tests/acceptance/tour-reading.spec.ts`: with the theme toggled, the card and the panel stay legible and their borders visible, using the same tokens as the rest of the shell.
- [x] T024 [P] Write `docs/adr/013-tour-reading.md`: one surface with two shapes, reading state outside the temporal store, `overview` as the whole-tour mode, arrow precedence, the toolbar move that restores the four-region invariant, and the rejected alternatives from `research.md`.
- [x] T025 [P] Update `README.md`: a business paragraph about reading a tour in the words its author wrote, a line under architecture on where the two map actions live, and a troubleshooting row for a tour whose stops carry no narration.
- [x] T026 Run the full suite and record it at the top of `TEST_RESULTS.md`: `npx vitest run`, then `npx playwright test` for the whole acceptance set — including `shell.spec.ts`, whose four-region assertion has been failing since feature 014 and must now pass.
- [x] T027 Run the static checks named in `package.json`: `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check app tests`.
- [x] T028 Walk `specs/015-tour-view-and-actions/quickstart.md` against the production build and confirm every scenario, including the narrow window and the arrow precedence without a tour.

---

## Dependencies & Execution Order

### Phase order

```
Setup (T001)
   └─► Foundational (T002, T003)
          ├─► US1 (T004 ─► T005–T010) ── MVP, ships alone
          ├─► US2 (T011 ─► T012–T014) ── ships alone
          └─► US3 (T015 ─► T016–T019) ── needs T006 (the stop block) and T008 (the actions slot)
                                              └─► Polish (T020–T028)
```

- **T003 depends on T002** (the tests are written first) and both block every story.
- **US1** needs T003 only.
- **US2** needs T001 and T008's slot for T013; its own T012 is independent of reading.
- **US3** needs T006 and T017, which needs the slot and the card from US1; T019 needs T017.
- **Polish** needs all three stories; T026 needs T011 to be green.

### Within a story

Tests first (T004/T005, T011, T015), then the component, then the wiring, then re-running the story's
acceptance scenarios. A story is not done until its scenarios pass in the production build.

### Parallel opportunities

- T002 ∥ T003 — test and implementation of one pure module, written in order but reviewable together.
- T012 ∥ T016 — two different components, no shared file.
- T021 ∥ T022 ∥ T023 ∥ T024 ∥ T025 — five different files (one test file among them, but distinct cases).
- T020 touches only `TourReading.tsx` and can run beside T024/T025.

### Parallel examples

```text
US2 while US1 is being reviewed:
  T012 app/components/shell/MapActions.tsx
  T013 app/components/shell/MapCanvas.tsx        (slot already added by T008)
  T014 tests/acceptance/exchange.spec.ts

Polish writing pass:
  T024 docs/adr/013-tour-reading.md
  T025 README.md
  T021 tests/acceptance/tour-reading.spec.ts
```

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1 (T001–T010).** That is the person's first complaint answered: the
narration is on screen, in the words the tour author wrote, and steppable by keyboard.

1. T001–T003 — the derivation, green in unit tests.
2. T004–T010 — card, dismissal, restore, arrows; stop here and look at it in the browser.
3. T011–T014 — the actions leave the map's corner; this is also where `shell.spec.ts` starts passing
   again after feature 014 broke its four-region count.
4. T015–T019 — the whole-tour panel.
5. T020–T028 — width, read-only, no-write, theme, documents, the full run.

Stop points: after T010 (MVP demoable), after T014 (layout defect closed), after T019 (feature
complete), after T026 (recorded proof).

---

## Notes

- **Single owner per file**: `TourReading.tsx` is written once in T006 and extended in T016 and T020 —
  one owner, three passes.
- **`tour-reading.ts` is the only new module**; no store change, no API, no dependency, no build change.
- **No comment in any file this feature touches**, and no literal colour utility — the ESLint rule fails
  the build if one appears.
- **Dead code leaves in the same change**: `data-region="map-actions"` and the `absolute … top-2` block
  go with T012; the `relative` wrapper in `MapWorkspace.tsx` goes with T013.
- **Reading writes nothing**: no `update*` call is made from `TourReading.tsx`, and T022 proves it by
  checksum.
- **The card must not cover React Flow's zoom controls** (T007) — both live in the map's bottom-left, so
  the card sits above them.
- **On a narrow window the panel becomes a bottom sheet** (T020), as spec `Assumptions` allows; on a wide
  window it keeps the left-edge panel FR-011 requires.
- **The card never covers the focused stop** (FR-009 as amended after the SatisFix verification): its
  home is the bottom-left, but `pickCorner` in `app/lib/tour-reading.ts` moves it to the nearest free
  corner. The map is not panned or zoomed to achieve this, because FR-009 forbids that.
- **A tour with no stops is not silence** — the surface appears and says so (spec edge case), which is
  why `readingVisible` does not look at `stops.length`.
- **Arrows change the walk and nothing beyond it** (FR-027 as amended): the selection follows the new
  stop, exactly as the dock's step buttons already make it follow.
- **`shell.spec.ts` and `keyboard.spec.ts` both change** — the four-region count comes back with the
  move, and the arrow test needs a map with no tour selected, because a selected tour now owns the
  arrows.

---

## Notes

- **T001** — nothing to install: the feature reuses `Badge`, `Button`, `DropdownMenu`, `ScrollArea`
  and the existing tokens; `package.json` is untouched, no route and no build change.
- **T002/T003** — 15 unit tests in `tests/unit/tour-reading.test.ts`. `pickCorner` lives beside
  `stopView` in `app/lib/tour-reading.ts`, not in the component, so the corner rule is a pure function
  of four numbers. The card's height is assumed (320 px), which biases the choice towards moving.
- **T004/T005** — the acceptance scenarios live in the new `tests/acceptance/tour-reading.spec.ts`
  (19 tests). Fixtures gained `readingDocument`/`writeReadingMap` (four waypoints in the four corners, a
  narrated tour, a tour without narration, a tour without stops) and `writeLongTourMap` (40 stops).
- **T006** — `TourReading.tsx` renders both shapes from one `StopBlock`; the four fixed sentences and
  the two aria-labels are module constants. No `ui/checkbox`-style new primitive was needed.
- **T007** — `readingDismissed` is keyed by `` `${mapFile}:${tourId}` `` instead of being reset in an
  effect: switching tours changes the key, so no `set-state-in-effect` and no stored flag. The card is
  rendered inside `MapCanvas`, not `MapWorkspace`, because the corner rule needs the React Flow
  viewport; `MapCanvas` gained `reading`, `focusedStop`, `actions` and `onTourArrow` props and an inner
  `ReactFlowProvider` + `CornerCard` (~60 lines, no new file).
- **T008** — one `actions` slot in the top row carries the restore button and `MapActions`; the slot is
  `ml-auto`, so both sit at the row's right edge as FR-016 asks.
- **T009** — `onTourArrow` is consulted before the existing `ARROWS`/`nextWaypoint` code and returns
  `true` at the first and last stop, so the key is consumed and nothing else happens (FR-026).
- **T010** — `tests/acceptance/keyboard.spec.ts` keeps the arrow-navigation test but selects `No tour`
  first, because a selected tour now owns the arrows; the tour case is covered in `tour-reading.spec.ts`.
- **T011** — `tests/acceptance/shell.spec.ts` gained `leaves the map corner to the map`, which reads
  `document.elementFromPoint` at the map's top-right corner and requires `.react-flow__pane` there. The
  existing four-region assertion passes again after 014 broke it.
- **T012/T013** — `MapActions` is now three pieces: two `md`-and-up buttons and one `More map actions`
  menu; `data-region="map-actions"` and the `absolute right-2 top-2` block are gone.
- **T014** — `exchange.spec.ts` needed no selector change beyond the shared waypoint-click scope (below).
- **T015** — the forty-stop case builds the map with `writeLongTourMap()` and asserts 40 list items plus
  the last narration, which is SC-002 read literally.
- **T016/T017/T018** — the panel is a flex sibling (`w-[26rem]`) in `MapWorkspace`; opening or closing
  it re-measures the flow container, and React Flow's own resize handling keeps the stop on screen. No
  explicit refit signal was needed: `fitView` is applied once on mount and the panel does not pan.
- **T019** — `TourDock.tsx` needed no edit: `Whole tour` already drove `overview`, and `editing`
  already hid the surface through `readingVisible`.
- **T020** — below `md` the card is a full-width bottom sheet capped at half the map height; the corner
  rule is skipped there, which is what spec `Assumptions` allows.
- **T021–T023** — three cases in `tour-reading.spec.ts`: a read-only copy (the project folder renamed
  away mid-test, restored in `finally`), sha256 of the map file unchanged after reading with `Undo`
  still disabled, and the dark theme.
- **T024** — `docs/adr/013-tour-reading.md` (D1–D10).
- **T025** — `README.md` gained a business bullet, a `### Reading a tour` architecture section and two
  troubleshooting rows.
- **T026** — full acceptance run: **115 passed** in 2.5m. The first full run had 18 failures, all one
  cause: the card repeats the waypoint's label, so `getByText('<label>')` matched two elements. Every
  such click/assertion in `tests/acceptance/*.spec.ts` is now
  `page.locator('.react-flow__node', { hasText: '<label>' })` — 25 occurrences across 10 files.
- **T027** — `tsc --noEmit`, `eslint .`, `prettier --check app tests`, `next build`: clean.
- **T028** — walked with `.tmp/walk-015.mjs` against the production build and the live demo
  (`http://127.0.0.1:4317/p/support-inbox`): **32 checks, all passing**, one per expectation of the
  twelve scenarios, with screenshots for 1, 6, 9, 10 and 12. Two findings: (a) real — closing the
  whole-tour panel hid the card instead of returning to it (fixed in T017); (b) the walk expected
  `This tour has no narration yet.` from a tour that had one narrated stop, which is the walk being
  wrong, not the product — `hasAnyNarration` is per tour, and the demo needed a tour whose stops are
  all silent to check FR-013.
