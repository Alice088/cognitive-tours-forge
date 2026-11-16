# Contract — the reading surface

**Feature**: `015-tour-view-and-actions` | Component: `app/components/shell/TourReading.tsx`

What the person perceives, in both shapes. Anything not written here is free to change.

---

## 1. Shapes

| Shape   | When                                              | Geometry                                                                                                                                                                                           |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card`  | a tour is selected, not dismissed, `overview` off | absolute in the map area, `max-width` 24 rem, above the dock, never wider than the map column minus 2 rem; bottom-left by default, moving to the nearest corner that leaves the focused stop clear |
| `panel` | a tour is selected, not dismissed, `overview` on  | flex sibling on the left of the map, full height of the map column, width 26 rem, own scroll; the map shrinks to its right                                                                         |

Both shapes live inside the canvas column, so the top row and the dock are untouched.

Below the `md` breakpoint both shapes become a bottom sheet inside the canvas column, at most half the
column's height, and the map stays visible above it.

A tour with no stops still produces a surface in the active shape: the tour name as its heading, the
`emptyTour` sentence, and the `emptyTourHint` sentence; no stop block, no position sentence.

---

## 2. Content of one stop

Rendered identical in both shapes:

| Order | Element                       | Source                 | Rule                                                                |
| ----- | ----------------------------- | ---------------------- | ------------------------------------------------------------------- |
| 1     | `Stop N of M`                 | `StopView.sentence`    | always present                                                      |
| 2     | type badge                    | `StopView.type`        | hidden when `type` is null                                          |
| 3     | label                         | `StopView.label`       | always present                                                      |
| 4     | narration                     | `StopView.narration`   | present when `hasNarration`; `whitespace-pre-line`; never truncated |
| 4′    | no-narration sentence         | fixed text             | replaces 4 when `!hasNarration`                                     |
| 5     | `About this waypoint` heading | fixed text             | present when `description` is not null                              |
| 6     | description                   | `StopView.description` | present when not null; `whitespace-pre-line`                        |

Fixed sentences, exact text:

| Key               | Text                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `noNarration`     | `This stop has no narration yet.`                                            |
| `about`           | `About this waypoint`                                                        |
| `tourNoNarration` | `This tour has no narration yet.`                                            |
| `emptyTour`       | `This tour has no stops yet.`                                                |
| `emptyTourHint`   | `Add stops with Edit tour.`                                                  |
| `close`           | aria-label `Hide the tour text`                                              |
| `restore`         | aria-label `Show the tour text` (lives in the toolbar, see `map-toolbar.md`) |

The narration and the description never merge: even when the narration is absent, the description keeps
its own heading above it.

---

## 3. Whole-tour shape

| Element           | Rule                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------- |
| heading           | the tour name, once, at the top of the panel                                            |
| `tourNoNarration` | shown once, under the heading, when `hasAnyNarration(tour)` is false                    |
| each stop         | a list item in tour order, rendering the stop content of §2 with `position`/`total`     |
| current stop      | carries `aria-current="step"` and the visual accent of a selected item                  |
| choosing a stop   | steppers and the map focus follow; the surface returns to the `card` shape at that stop |
| closing the panel | returns to the `card` shape at the stop being read                                      |

Scrolling: the panel scrolls as one piece; the heading is not sticky.

---

## 4. Accessible names

| Element                | Role                                    | Name                     |
| ---------------------- | --------------------------------------- | ------------------------ |
| surface (both shapes)  | `region`                                | `Tour text: <tour name>` |
| panel close            | button                                  | `Hide the tour text`     |
| each stop in the panel | button or list item containing a button | its own label text       |

The surface is reachable by keyboard and dismissible by keyboard (its close control is a real button).
Focus is never moved into it automatically, and it never traps focus.

The stop number and label are plain text, so a screen reader reads them where they appear; no second
live region is introduced for reading.

---

## 5. Auto-open, dismissal, restore

| Event                                                     | Surface                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| a tour is selected                                        | opens in `card` shape at the first stop                                       |
| next / previous stop                                      | content swaps in place; shape unchanged; never a second surface               |
| `Whole tour` pressed                                      | `panel` shape                                                                 |
| `Whole tour` released, a stop chosen, or the panel closed | `card` shape at the current stop                                              |
| close pressed                                             | hidden; the tour, the step and the map focus unchanged                        |
| restore pressed in the toolbar                            | `card` shape at the current stop                                              |
| another tour selected                                     | opens in `card` shape at that tour's first stop, even if previously dismissed |
| `Edit tour` pressed                                       | hidden; the inspector shows the tour editor                                   |
| map changes                                               | hidden until a tour is selected again                                         |

Dismissal is remembered for the current tour only. Later steps do not re-open a dismissed surface.

---

## 6. Keyboard

| Key      | While a tour is selected and not being edited                            | Otherwise                                              |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `←`      | previous stop; at the first stop nothing happens and the key is consumed | moves the selection to the previous waypoint, as today |
| `→`      | next stop; at the last stop nothing happens and the key is consumed      | moves the selection to the next waypoint, as today     |
| `↑` `↓`  | unchanged: move the selection                                            | unchanged                                              |
| `Escape` | closes the surface (same as its close control)                           | unchanged                                              |

The arrow handler keeps its current home — the map group with `role="group" aria-label="Map"` — and the
tour rule is decided before the selection rule, in one place.

---

## 7. Map interaction

- The card keeps the map's centre clear and never covers the focused stop: if the stop falls under the
  bottom-left corner, the card takes the nearest free corner instead, and the map is not panned or
  zoomed by the move.
- Appearing, swapping stop, or being dismissed must not pan or zoom the map.
- Opening the `panel` shape re-fits the view so the focused stop stays visible after the map shrinks.
- Every token comes from the design tokens; no literal colour utility appears in this file.

---

## 8. Read-only and editing

| Surface status                    | Reading surface                                             |
| --------------------------------- | ----------------------------------------------------------- |
| ready, writable                   | full behaviour                                              |
| ready, read-only (travelled copy) | identical content; no editing control appears in or near it |
| loading / failed / gone           | never rendered — there is no document to read               |

Reading must not write: no `store.getState().update*` call is made from the surface, and a walk through
every stop leaves the file byte-identical.
