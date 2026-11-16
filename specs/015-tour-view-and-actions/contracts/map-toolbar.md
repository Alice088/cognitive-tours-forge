# Contract — the map's top row

**Feature**: `015-tour-view-and-actions` | Components: `app/components/shell/MapCanvas.tsx`,
`app/components/shell/MapActions.tsx`

---

## 1. Child order in the top row

Left to right, one row, wrapping as today (`flex flex-wrap items-end gap-2 border-b border-border
bg-canvas px-3 py-2`):

| #   | Child                                                     | Width rule                    |
| --- | --------------------------------------------------------- | ----------------------------- |
| 1   | search field, `id="map-search"`, label `Search waypoints` | `min-w-40 flex-1`             |
| 2   | type filter, `aria-label="Filter by type"`                | `w-44`                        |
| 3   | count, `N of M waypoints`                                 | natural                       |
| 4   | map actions (new slot)                                    | natural, `ml-auto` above `md` |

The actions are the last child. Nothing else joins the row in this feature.

---

## 2. The two actions

| Action          | Accessible name   | Visible label                                             | Disabled when                               |
| --------------- | ----------------- | --------------------------------------------------------- | ------------------------------------------- |
| save a copy     | `Save a copy`     | `Save a copy` above `md`; icon only below, name unchanged | as today — false while the map is writable  |
| export all maps | `Export all maps` | `Export all maps` above `md`; icon only below             | `frozen`, i.e. the map surface is not ready |

Both names are unchanged. Both handlers are unchanged: the same `setExportMode('one' | 'all')` wiring in
`MapWorkspace` drives the same `ExportDialog`.

---

## 3. Narrow widths

| Width   | Rendering                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| `>= md` | two `Button`s with icon and label, inline in the row                                                         |
| `< md`  | one `DropdownMenu` trigger with `aria-label="More map actions"`, containing both items with their full names |

The search field never drops below its `min-w-40`. If the row wraps, the actions go to the second line
rather than shrinking the search field.

---

## 4. Regions

`AppShell` exposes exactly four layout regions: `rail`, `canvas`, `inspector`, `dock`.

`data-region="map-actions"` is removed from `MapActions`. `tests/acceptance/shell.spec.ts` asserts
`[data-region]` has count 4; the floating bar has been a fifth region since feature 014 and this contract
restores the invariant.

---

## 5. No overlap

Inside the canvas column, the only absolutely positioned elements are:

1. the reading card (`contracts/tour-reading.md` §1), bottom-left, away from the map's top-right;
2. React Flow's own zoom controls, bottom-left of the map — the card sits above them and must not cover
   them.

A waypoint placed in any corner of the map is fully visible and draggable, and a click at the map's
top-right corner reaches the canvas.

---

## 6. Theme and keyboard

- Labels use `text-muted-foreground`/`text-foreground` from the tokens; the icons inherit.
- Tab order in the row is the child order of §1: search, type filter, count, save a copy, export all
  maps, then the map itself. No `tabIndex` values are added and the row is not a focus trap.
- Below `md`, the dropdown is reachable by `Enter`/`Space` and escapable by `Escape`, per the existing
  `dropdown-menu` primitive.
