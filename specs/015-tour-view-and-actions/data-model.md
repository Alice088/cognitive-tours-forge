# Data Model — A tour that reads like a tour

**Feature**: `015-tour-view-and-actions` | **Date**: 2026-11-16

The map file does not change. There is no migration, no new field, no new file and no cache. What this
document defines is the shape of the two in-memory values the reading surface needs, and the invariants
they must keep.

---

## 1. Persisted model — unchanged

Everything the reading surface shows already exists in `.ctour/<name>.tour.json`:

```ts
interface Stop {
  waypointId: string;
  narrative?: string;
}

interface Tour {
  id: string;
  name: string;
  description?: string;
  author?: string;
  updatedAt?: string;
  stops: Stop[];
}

interface Waypoint {
  id: string;
  label: string;
  type: WaypointType;
  description?: string;
  notes?: string;
  file?: string;
  position: Position;
}
```

`version`, `project`, `edges` are untouched. `narrative` was already serialised by
`app/lib/workspace/serialize.ts:35` and validated by `app/lib/workspace/map-file.ts:230`; nothing in this
feature writes it.

**Consequences**: no version bump, no `normalizeDocument` change, no import/export change, no MCP
capability change. A map written by the agent renders its narration here without knowing this feature
exists.

---

## 2. Derived model — `StopView`

Produced by `stopView(stop, waypoint, index, total)` in `app/lib/tour-reading.ts`. Never stored.

| Field          | Type                   | Rule                                                                        |
| -------------- | ---------------------- | --------------------------------------------------------------------------- |
| `position`     | `number`               | `index + 1` — the human number, one-based                                   |
| `total`        | `number`               | `tour.stops.length`                                                         |
| `label`        | `string`               | `waypoint.label`; empty string when the waypoint is missing                 |
| `type`         | `WaypointType \| null` | `waypoint.type`; `null` when the waypoint is missing                        |
| `narration`    | `string \| null`       | `stop.narrative` trimmed; `null` when absent **or whitespace-only**         |
| `description`  | `string \| null`       | `waypoint.description` trimmed; `null` when absent or whitespace-only       |
| `hasNarration` | `boolean`              | `narration !== null`                                                        |
| `sentence`     | `string`               | `"Stop ${position} of ${total}"`, or `"Stop ${position}"` when `total` is 0 |

Validation rules:

- **V1** A whitespace-only narration is treated as no narration (spec edge case). `"   "` must produce
  `hasNarration: false`.
- **V2** The description is never substituted for the narration: when `hasNarration` is false the
  description appears in its own block, and the surface adds one sentence saying this stop has no
  narration yet (FR-004).
- **V3** `position` and `total` come from the tour, not from the waypoint, so a tour that visits the same
  waypoint twice still counts stops.
- **V4** A stop whose waypoint was dropped by `normalizeDocument` cannot reach this model:
  `map-file.ts` already discards stops that reference a missing waypoint, so the surface never renders an
  empty label.

`hasAnyNarration(tour)` returns `true` when at least one stop has a non-whitespace narration; it drives
the one sentence shown for a tour with no narration at all (FR-013).

---

## 3. In-memory model — `ReadingState`

Lives in `MapWorkspace` as two values, never in the store (research D2):

| Value              | Type                       | Initial | Reset when                       |
| ------------------ | -------------------------- | ------- | -------------------------------- |
| `overview`         | `boolean` (already exists) | `false` | tour change; new tour created    |
| `readingDismissed` | `boolean`                  | `false` | active tour changes; map changes |

Derived, not stored:

```ts
tour = document.tours.find(item => item.id === activeTourId) ?? null;
stop = tour?.stops[step] ?? null;
waypoint = document.waypoints.find(item => item.id === stop?.waypointId) ?? null;
readingVisible = Boolean(tour) && tour.stops.length > 0 && !readingDismissed;
shape = overview && readingVisible ? 'panel' : 'card';
```

| Situation                                             | `readingVisible` | Shape                                         |
| ----------------------------------------------------- | ---------------- | --------------------------------------------- |
| No tour selected                                      | `false`          | none                                          |
| Tour selected, has stops, not dismissed, stop-by-stop | `true`           | card                                          |
| Tour selected, `overview` on, not dismissed           | `true`           | panel                                         |
| Tour selected and dismissed                           | `false`          | none, until restored from the toolbar control |
| Tour with zero stops                                  | `false`          | none — the dock already offers editing        |

State transitions:

```
no tour ──select tour──► reading (card)
reading ──next/previous──► reading (same shape, new stop)
reading ──Whole tour──► reading (panel)
panel ──Whole tour off / choose a stop / close──► reading (card at that stop)
reading ──close──► dismissed ──restore control──► reading (card, same step)
reading|dismissed ──select another tour──► reading (card, first stop, not dismissed)
reading ──Edit tour──► authoring; the reading surface hides
```

**Why `Edit tour` hides the surface**: the person is editing a stop list, and the card and the editor
compete for the same content. `editing` already resets `overview`; it hides the card too.

---

## 4. Arrow-key routing

One rule, decided in `MapCanvas` (research D6):

| Condition                              | Left / Right                                     | Up / Down                   |
| -------------------------------------- | ------------------------------------------------ | --------------------------- |
| A tour is selected, `editing` is false | previous / next stop; selection follows the stop | unchanged (selection moves) |
| A tour is selected and being edited    | unchanged (selection moves)                      | unchanged                   |
| No tour selected                       | unchanged (selection moves)                      | unchanged                   |

At the first stop the left arrow and at the last stop the right arrow do nothing and still consume the
key, so selection never moves as a side effect.

---

## 5. Toolbar model

| Field                  | Type         | Rule                                                                            |
| ---------------------- | ------------ | ------------------------------------------------------------------------------- |
| `actions`              | `ReactNode?` | Rendered last in `MapCanvas`'s top row, after the waypoint count                |
| save-copy disabled     | `boolean`    | unchanged: false while the map is writable, as today                            |
| export-all disabled    | `boolean`    | unchanged: `frozen` (surface not ready)                                         |
| overflow trigger label | `string`     | `"More map actions"`, shown below `md`                                          |
| region attribute       | —            | `data-region="map-actions"` is removed; `AppShell` exposes exactly four regions |

---

## 6. Invariants

1. **Reading writes nothing.** No document field, no autosave, no undo step, no `mapMtime` change. A test
   asserts the file's bytes before and after a full walk.
2. **One surface.** At any moment at most one reading surface exists in the DOM, in either shape.
3. **Dismissal is scoped to one tour.** Switching tours restores the surface; the step of the previous
   tour never leaks into the next (`setActiveTour` already resets `step` to 0).
4. **The narration is never replaced by the description.** They are separate blocks with separate
   headings, in both shapes.
5. **No control floats over the map.** The only absolutely positioned elements in the canvas column are
   the reading card and React Flow's own controls.
6. **The four regions stay four.** `rail`, `canvas`, `inspector`, `dock` — no fifth attribute.
