# Implementation Plan: A tour that reads like a tour

**Branch**: `015-tour-view-and-actions` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-tour-view-and-actions/spec.md`

## Summary

Two surfaces change and nothing else does.

First, a stop's narration gets a place of its own. A `TourReading` surface inside the map column shows
the current stop — "Stop 3 of 7", the waypoint's label and type, the narration in full, and the
waypoint's description underneath as secondary text. It opens by itself when a tour is selected and
follows every step, sits in the map's bottom-left corner as a fixed-width card — moving to the nearest
free corner when the focused stop would fall under it — and is dismissed
from its own close control, which then holds for the rest of the work on that tour. Read whole, the
same surface becomes a full-height panel along the left edge and the map shrinks beside it. The left
and right arrows step the walk instead of moving the map selection while a tour is selected; the
selection then follows the new stop, as it already does when the step buttons are used.

Second, the map's two actions stop floating. `MapActions` loses its absolute corner and becomes part
of the canvas's top row, to the right of the search field, with an overflow menu below the `md`
breakpoint.

Everything is client-side and in-memory: no map field is added, no route, no API, no dependency, no
build change. The narration being read is the narration already in the file.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20+ (v22.22.3 here); Next.js App Router, React 19.

**Primary Dependencies**: Next.js, React, Tailwind CSS with the project's design tokens, shadcn/ui
primitives already vendored in `app/components/ui/` (`badge`, `button`, `dropdown-menu`, `scroll-area`,
`separator`, `tooltip`), `zustand` + `zundo` for the map store, React Flow for the canvas.

**Storage**: none new. The map file `.ctour/<name>.tour.json` is unchanged; reading writes nothing.

**Testing**: `vitest` (unit project + cli project) and `Playwright` against `next build && next start`
with one worker. New: `tests/unit/tour-reading.test.ts`, `tests/acceptance/tour-reading.spec.ts`;
adjusted: `tests/acceptance/shell.spec.ts` (the four-region invariant), `tests/acceptance/keyboard.spec.ts`
(arrow precedence).

**Target Platform**: local machine, a browser window 390 px to 1600 px wide, light and dark themes.

**Project Type**: single Next.js application with a bundled CLI — this feature touches the application
only.

**Performance Goals**: swapping stops shows new words in the same interaction (SC-005) — the surface is
a pure render of the step already in the store; a forty-stop whole-tour panel scrolls without jank.

**Constraints**: no comments in code; design tokens only (no literal colour utilities); no new
dependency; no state written from an effect where `react-hooks/set-state-in-effect` would reject it; no
control may cover the map area; the four `data-region` regions of `AppShell` must stay exactly four.

**Scale/Scope**: 2 new source files, 4 modified components, 1 modified pure module boundary,
2 new test files, 2 adjusted test files, 2 contract documents.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Gate                                                                                          | Verdict                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| I. Local First (NON-NEGOTIABLE)        | No network call, no account, no hosted surface; everything renders from the file already open | PASS — reading is a render of in-memory state; FR-022 forbids a write                    |
| II. The Map Lives With the Code        | No new field, no new file, no format change; the file stays the source of truth               | PASS — `narration` already exists in the map format                                      |
| III. One Command to Start              | No new command, process, port or setup step                                                   | PASS — nothing in the plan starts anything                                               |
| IV. Agent Access Through MCP           | No capability added or changed; the narration read here is the one the agent writes           | PASS — `cli/` untouched                                                                  |
| V. Understanding Stays With the Person | The author's reasoning reaches the reader instead of hiding behind the inspector              | PASS — this is the whole point of US1                                                    |
| VI. The Interface Is the Product       | Keyboard reach, theme contrast, narrow width, no overlapping controls                         | PASS — FR-018/FR-019/FR-023/FR-025/FR-026 and SC-003/SC-004/SC-007 are gates on the work |

Additional Constraints check:

- **No comments in code** — plan introduces no doc blocks; naming and types carry the meaning.
- **Tokens only** — `TourReading` and the toolbar use `bg-background`, `border-border`,
  `text-muted-foreground`, `bg-canvas`, `ring-ring`; no `text-gray-500`-style literals, and the
  `no-restricted-syntax` rule already fails the build on them.
- **Dead code deleted in the same change** — the `absolute right-2 top-2` positioning block and
  `data-region="map-actions"` leave with the move; the `.relative` wrapper in `MapWorkspace` follows
  if nothing else needs it.
- **Minimal diff** — no refactor of `MapCanvas`, `TourDock`, `Inspector` or the store beyond the
  minimum each requirement names.
- **A plan precedes a write** — this document.

Post-Phase-1 re-check: unchanged. The design adds one component, one pure module, one optional prop and
one state flag; no principle is strained and no gate is waived.

## Project Structure

### Documentation (this feature)

```text
specs/015-tour-view-and-actions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tour-reading.md
│   └── map-toolbar.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
app/
├── components/
│   ├── shell/
│   │   ├── MapActions.tsx        modified  inline, no corner, overflow below md
│   │   ├── MapCanvas.tsx         modified  actions slot in the top row; tour-arrow precedence
│   │   ├── MapWorkspace.tsx      modified  reading state, arrows wiring, panel/card placement
│   │   ├── TourDock.tsx          modified  "Whole tour" drives the reading mode
│   │   ├── TourReading.tsx       new       card and whole-tour panel, one component
│   │   ├── Inspector.tsx         untouched
│   │   └── AppShell.tsx          untouched  (four regions stay four)
│   └── ui/                       untouched  (badge, button, dropdown-menu, scroll-area used as-is)
└── lib/
    ├── tour-reading.ts           new       stop view derivation, pure
    ├── tour-markdown.ts          untouched
    └── store/map-store.ts        untouched  (reading is not document state, so no undo step)

tests/
├── unit/tour-reading.test.ts         new
├── acceptance/tour-reading.spec.ts   new
├── acceptance/shell.spec.ts          adjusted  four regions, no floating bar
└── acceptance/keyboard.spec.ts       adjusted  arrow precedence with a tour selected
```

**Structure decision**: the feature lives where the map screen already lives — `app/components/shell/`
for presentation, `app/lib/` for the one piece of derivation worth testing without a browser. No new
directory, no new layer: `TourReading` is a sibling of `TourDock`, both read the same store.

## Complexity Tracking

| Violation                                                                                       | Why needed                                                                                                                        | Simpler alternative rejected because                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading visibility lives in `MapWorkspace` local state instead of the map store                 | The store is wrapped in `zundo`; adding a UI flag there would put "I closed the card" into the undo history, which FR-022 forbids | Storing it in the store would need `partialize` exclusions in `map-store.ts` and would still re-render every subscriber on a purely visual change              |
| An optional `actions` slot on `MapCanvas` instead of rendering `MapActions` from `MapWorkspace` | The top row belongs to `MapCanvas`; passing the buttons in keeps one layout owner and avoids a second row                         | Rebuilding the top row in `MapWorkspace` would duplicate the search field, the type filter and the count, which is the duplication the product already rejects |
| An optional `onTourArrow` prop on `MapCanvas`                                                   | The arrow handler already lives there, and the precedence rule (tour first, selection second) must be decided in one place        | Handling arrows at the window level would fire while the person types in the search field or the inspector                                                     |

## Phase 0 — Research

`research.md` records D1–D12: one surface with two shapes, reading state outside the store, the meaning
of `overview`, card versus panel geometry, auto-open and dismissal scope, arrow precedence, content
derivation, scroll behaviour, fit-view after the panel, the toolbar move and its overflow, announcements,
and the test layers. No `NEEDS CLARIFICATION` remains: the five open decisions were settled in the
clarification session of 2026-11-16 and are quoted in the spec.

## Phase 1 — Design

`data-model.md` defines the derived `StopView`, the in-memory `ReadingState`, and the invariants
(reading writes nothing; dismissal is scoped to one tour; the description never stands in for the
narration).

`contracts/tour-reading.md` fixes the reading surface: its two shapes, what each state shows, the
accessible names, the keyboard rule and the precedence between tour arrows and selection arrows.

`contracts/map-toolbar.md` fixes the top row: child order, the two action names, their disabled
conditions, the overflow below `md`, and the four-region invariant that the floating bar used to break.

`quickstart.md` lists the runnable checks — by hand and as the automated equivalents — including the
one regression this feature is expected to repair: `shell.spec.ts` asserts `[data-region]` is exactly
four, while `MapActions` has been adding a fifth since feature 014.

## Known defect this feature closes

`app/components/shell/MapActions.tsx` carries `data-region="map-actions"` inside the canvas, so the
shell currently exposes five regions where `tests/acceptance/shell.spec.ts:72` asserts four. That
assertion has not been re-run since the button moved in (the full acceptance suite was interrupted
during 014). Moving the actions into the top row removes the attribute and restores the invariant; the
feature's own acceptance run is what proves it.
