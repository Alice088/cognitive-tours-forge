# Quickstart — A tour that reads like a tour

**Feature**: `015-tour-view-and-actions` | **Date**: 2026-11-16

Every check below is runnable by hand against a development build, and every one has an automated
equivalent in the last section. A check that only exists as a sentence here is not done.

---

## Prerequisites

```bash
cd /home/fworld/GolandProjects/cognitive-tours-forge
npm install
npm run build          # the application
```

A workspace with at least one map that has a tour whose stops carry narration. To make one from scratch:

```bash
mkdir -p .tmp/reading-home/projects/demo
export CTOUR_HOME="$PWD/.tmp/reading-home"
node dist/cli.mjs init "$PWD/.tmp/reading-home/projects/demo"
```

Then open the map in the interface, create four waypoints, a tour, and give two of the stops a
narration. The fixture used by the acceptance suite builds exactly this shape; a hand-made map of four
waypoints and one tour is enough.

Run the application:

```bash
CTOUR_HOME="$PWD/.tmp/reading-home" npm run dev
```

---

## Scenario 1 — a stop shows its own words

1. Open a map with a tour, choose the tour in the dock.
2. **Expect** a card in the bottom-left of the map: `Stop 1 of N`, the waypoint's type, its label, and the
   narration in full.
3. **Expect** the waypoint's description under `About this waypoint`, not in place of the narration.
4. **Expect** the map's centre and the focused stop to stay visible.

## Scenario 2 — stepping swaps the text in place

1. Press `Next` four times.
2. **Expect** the stop number and the text to change each time, in the same card, with no flash of an
   empty surface and no second card.
3. **Expect** the last stop's `Next` to be disabled.

## Scenario 3 — a stop with no narration

1. Step to a stop without a narration.
2. **Expect** `This stop has no narration yet.` in the place where the narration would be, the label and
   type still present, and the description still under its own heading.

## Scenario 4 — arrow keys step the tour

1. Click the map background once so the map group has focus, then press `→` and `←`.
2. **Expect** the stop to change; the card follows.
3. **Expect** the selection to follow the stop's waypoint, and **not** to jump to a neighbouring
   waypoint on its own.
4. At the first stop, press `←`: nothing changes and the selection does not move.
5. Deselect the tour (choose `No tour`), focus the map, press `→`: the selection moves to the next
   waypoint, as before this feature.

## Scenario 5 — dismissal holds for this tour

1. Press the card's close control.
2. **Expect** the card to disappear; the tour stays selected, the step stays the same, the map keeps its
   focus, and `Show the tour text` appears in the top row.
3. Press `Next` twice: **expect** the card not to come back.
4. Press `Show the tour text`: **expect** the card at the current stop.
5. Close it again, then choose another tour: **expect** the card to open at that tour's first stop.

## Scenario 6 — reading the whole tour

1. With a tour selected, press `Whole tour`.
2. **Expect** a panel along the left edge of the map, full height, with the tour name at the top and
   every stop in order, each with its number, label, type and narration.
3. **Expect** the map still visible to the right, with the focused stop in view.
4. Scroll the panel with the wheel: the panel scrolls, the map does not move.
5. Choose the third stop: **expect** the walk to move there, the surface to return to the card shape at
   that stop, and the map to focus it.
6. Press `Whole tour`, then close the panel: **expect** the card at the stop being read.

## Scenario 7 — a tour with nothing written

1. Create a tour, add stops, write no narration.
2. **Expect** the card to say `This stop has no narration yet.`, and `Whole tour` to say
   `This tour has no narration yet.` once, above the list.

## Scenario 8 — the two actions no longer cover the map

1. Open any map at 1440 px wide.
2. **Expect** `Save a copy` and `Export all maps` in the top row, to the right of the waypoint count.
3. **Expect** the map's top-right corner to be empty: no floating bar.
4. Drag a waypoint into that corner: **expect** it to stay fully visible and draggable.
5. Press `Save a copy`: **expect** the export dialog to open as before.

## Scenario 9 — the narrow window

1. Narrow the window to 390 px.
2. **Expect** the search field still usable, and one control named `More map actions`.
3. Open it: **expect** both items with their full names, both working.

## Scenario 10 — read-only map

1. Open a map from a project whose folder is unavailable (the travelled copy).
2. Choose a tour: **expect** the card, the narration and the panel to work; **expect** no editing
   control anywhere in the surface.

## Scenario 11 — reading writes nothing

1. Note the map file's checksum: `sha256sum <project>/.ctour/<map>.tour.json`.
2. Walk every stop by arrow, open the whole tour, choose a stop, close and restore the card.
3. **Expect** the checksum to be identical and `Undo` to remain disabled.

## Scenario 12 — dark theme

1. Switch the theme with the toggle.
2. **Expect** the card and the panel to keep readable contrast — the text is legible, the border visible,
   the type badge distinguishable.

---

## Automated equivalents

| Scenario | Test                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| 1, 2, 3  | `tests/unit/tour-reading.test.ts` (derivation) and `tests/acceptance/tour-reading.spec.ts` (perceived content) |
| 4        | `tests/acceptance/tour-reading.spec.ts` arrow cases; `tests/acceptance/keyboard.spec.ts` unchanged cases       |
| 5, 6, 7  | `tests/acceptance/tour-reading.spec.ts`                                                                        |
| 8, 9     | `tests/acceptance/tour-reading.spec.ts` toolbar cases; `tests/acceptance/shell.spec.ts` four-region count      |
| 10       | `tests/acceptance/tour-reading.spec.ts` read-only case                                                         |
| 11       | `tests/acceptance/tour-reading.spec.ts` checksum case                                                          |
| 12       | existing theme and contrast suite; the reading surface uses the same tokens                                    |

Commands:

```bash
npx vitest run tests/unit/tour-reading.test.ts
npx playwright test tests/acceptance/tour-reading.spec.ts
npx playwright test tests/acceptance/shell.spec.ts tests/acceptance/keyboard.spec.ts
```

Full run, recorded at the top of `TEST_RESULTS.md`:

```bash
npx vitest run
npx playwright test
npx tsc --noEmit && npx eslint . && npx prettier --check app tests
```

---

## Coverage

| Requirement            | Proved by                                                      |
| ---------------------- | -------------------------------------------------------------- |
| FR-001 … FR-005        | Scenarios 1, 2, 3                                              |
| FR-006, FR-007, FR-008 | Scenario 5                                                     |
| FR-009                 | Scenarios 1, 6 (map still visible, centre clear)               |
| FR-010                 | Scenario 1 with a long narration; unit test on scroll presence |
| FR-011 … FR-014        | Scenario 6, 7                                                  |
| FR-015 … FR-020        | Scenarios 8, 9; four-region count                              |
| FR-021                 | Scenario 10                                                    |
| FR-022                 | Scenario 11                                                    |
| FR-023                 | Scenario 12                                                    |
| FR-024                 | Scenario 5 step 5                                              |
| FR-025                 | Scenario 4; accessible-name assertions                         |
| FR-026, FR-027         | Scenario 4, including the no-tour case                         |
| SC-001                 | Scenario 1 — narration visible without the inspector           |
| SC-002                 | Scenario 6 with a forty-stop tour                              |
| SC-003                 | Scenario 8 step 4                                              |
| SC-004                 | Scenarios 8, 9                                                 |
| SC-005                 | Scenario 2                                                     |
| SC-006                 | Scenario 1 read by someone who has not seen the product        |
| SC-007                 | Scenario 12                                                    |
