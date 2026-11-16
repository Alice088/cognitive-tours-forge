# Quickstart: Validating the Application Shell

A runnable guide to proving this feature works. It contains no implementation —
only how to run it and what to expect.

## Prerequisites

- Node.js 20 or newer (22 tested)
- A project directory to use as a fixture; any repository will do, ideally this
  one
- An empty directory to act as the isolated workspace home, so validation never
  touches the real `~/.ctour`

```bash
mkdir -p /tmp/ctour-check && export CTOUR_HOME=/tmp/ctour-check
```

`CTOUR_HOME` relocates the workspace registry. Every scenario below assumes it
is set; without it the application reads and writes `~/.ctour/workspace.json`.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. First load against an empty `CTOUR_HOME` shows the
empty workspace state.

## Static checks

```bash
npm run typecheck     # tsc --noEmit, must be clean
npm run lint          # eslint, must be clean, includes the literal-colour rule
npm run test:unit     # vitest: history, map-file, registry, tokens, contrast
npm run test:e2e      # playwright: the scenarios below, automated
```

`npm run test:unit` covers the four things that are cheaper to prove in a unit
than in a browser: undo/redo semantics, map-file round-trip and ordering,
registry atomicity and corruption recovery, and the token contrast table.

## Scenarios

Each maps to a user story in `spec.md` and states what must be observable.

### 1. Add a project from inside the application (US5, FR-026, FR-028, SC-012)

1. With the empty workspace state showing, activate **Add project**.
2. Browse to a repository that has no `.tours/` directory and confirm it.
3. Reopen the application.

Expected: the project appears in the rail as `uninitialised`, offering **Create
map**; no terminal was needed; `~/.ctour/workspace.json` (or
`$CTOUR_HOME/workspace.json`) lists it.

### 2. Create a map and land in it (US5, FR-027, FR-007, FR-008)

1. Activate **Create map**, name it `main`.
2. Accept.

Expected: `.tours/main.tour.json` exists in the project, contains
`"version": 1` and three empty arrays, and the canvas opens showing the empty
map state. No reload.

### 3. Open, edit, and see the change on disk (US1, US6, FR-015)

1. With a map containing waypoints, select one on the canvas.
2. Edit its description in the inspector, then wait a moment without pressing
   anything.
3. Run `git diff .tours/` in the project.

Expected: the description appears in the diff. No Save button was pressed. The
dock shows a saved status.

### 4. Undo and redo like a browser (US6, FR-018–FR-023)

1. Make five changes: two edits, a new waypoint, a delete, a reorder.
2. Press `Ctrl/Cmd+Z` five times, then `Ctrl/Cmd+Shift+Z` five times.

Expected: every intermediate state matches the state passed through on the way
back; forward restores each change in the same order. Then step back twice, make
one new change, and confirm forward is no longer available.

### 5. Restore where you were (US3, FR-029, SC-011)

1. Open a second project, a specific map, tour and step.
2. Close the tab, reopen `http://localhost:3000`.

Expected: the same project, map, tour and step are open. Repeat three times.

### 6. A missing project does not lose your place (FR-010, FR-011)

1. Rename the project directory on disk.
2. Reload the application.

Expected: the project is listed with an unavailable marker, opens read-only from
the cached document, and offers **Choose a new location**. Choosing the renamed
directory restores it.

### 7. Themes are correct everywhere (US2, FR-004–FR-006, SC-003)

1. Switch the theme to dark, then to light, then to follow the system.
2. In each, open the rail, the inspector, the dock, a dialog, a tooltip and the
   filter panel.

Expected: no surface, border, input, badge or canvas keeps the other theme's
colour. Changing the OS theme while on "follow the system" updates the
interface within a second. The choice survives a reload. `npm run test:unit`
reports every token pair at or above 4.5:1 (or 3:1 for borders and large text).

### 8. It works at 360 px (US4, FR-012, FR-013, SC-004)

1. Resize the window to 1440, 1024, 768 and 360 px wide.

Expected: at 1440 all four regions are visible; at 1024 the rail is icons only;
at 360 the rail and inspector are drawers and the dock is a single bottom row.
No horizontal scrolling anywhere outside the canvas; every control remains
reachable; closing a drawer gives its space back to the canvas.

### 9. Keyboard only (FR-016, FR-017, SC-008)

1. Put the keyboard in the address bar, then `Tab` through the whole screen.
2. Reach a waypoint, open it, edit it, undo it, and close the inspector with
   `Escape`.

Expected: focus order is rail, dock, canvas, inspector; focus is visible at every
stop; `Escape` closes the topmost surface first; `Ctrl/Cmd+Z` inside a text field
undoes text, not the map; every icon-only control is announced with an action
name.

### 10. A big map stays responsive (FR-024, FR-025, SC-010)

1. Generate a fixture map with 250 waypoints and 40 tours (see `test:unit`
   fixtures for a builder).
2. Pan, zoom, select, drag a waypoint and type in search.

Expected: each action shows a visible change within 100 ms with no stall. Load a
map with 400 waypoints: it still works and reports that it exceeds the supported
size.

## When it fails

| Symptom                          | Where to look                                                             |
| -------------------------------- | ------------------------------------------------------------------------- |
| Empty workspace never appears    | `$CTOUR_HOME` not set, or the registry holds projects                     |
| Add project refuses a path       | `contracts/workspace-api.md`, the `refused-self` and `outside-home` codes |
| Edit does not reach the file     | `saveStatus` in the dock; a failed save keeps your text and offers retry  |
| "This map changed on disk"       | expected `409`; choose reload or overwrite                                |
| Undo steps back too far          | history limit is 50; a reload clears it by design                         |
| A token looks wrong in one theme | `app/lib/theme/tokens.ts`; the contrast unit test names the pair          |
