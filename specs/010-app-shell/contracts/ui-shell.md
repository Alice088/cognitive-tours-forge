# Contract: UI Shell

Binding on every screen of this feature. A change here is a change to the
feature, not an implementation detail.

## 1. Regions

Exactly four regions exist. Each owns one kind of content and no other region
repeats it.

| Region          | Owns                                                                                           | Never shows                        |
| --------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| Navigation rail | projects, their maps, adding a project, collapsing itself                                      | tour content, waypoint detail      |
| Canvas          | the map: waypoints, edges, search and type filter, the "whole tour" toggle                     | tour editing, waypoint form fields |
| Inspector       | everything about the current selection: waypoint fields, or tour fields and stop order         | the tour's running position        |
| Tour dock       | current tour name, step position, previous/next, edit tour, export, autosave status, undo/redo | waypoint fields, stop reordering   |

A dialog may appear over the four regions for two things only: adding a project,
and creating a map. Nothing else in this feature uses a dialog.

## 2. Width bands

| Band   | Width            | Rail                                                    | Inspector                                              | Dock                                                              |
| ------ | ---------------- | ------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Wide   | `>= 1280px`      | expanded, 240 px, collapsible                           | docked, 320 px                                         | bottom row inside the canvas column                               |
| Medium | `768px – 1279px` | icons only, 56 px, labels on hover and on focus         | docked, 300 px                                         | bottom row, condensed                                             |
| Narrow | `< 768px`        | drawer over the canvas, opened from a persistent button | drawer over the canvas, opened by selecting a waypoint | fixed to the bottom, single row, horizontally scrollable controls |

Rules:

- Only one drawer is open at a time at narrow width. Opening one closes the
  other.
- The canvas is never smaller than 320 px wide and never scrolls horizontally.
- Collapsing the rail or the inspector returns the space to the canvas; it is
  not merely hidden.

## 3. Tokens

Semantic only. Components reference tokens; a literal colour utility
(`bg-white`, `text-gray-700`, `#171717`) in a component is a defect caught by
lint.

Surfaces: `background`, `foreground`, `card`, `card-foreground`, `popover`,
`popover-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`,
`primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`,
`accent-foreground`, `destructive`, `destructive-foreground`.

Shell: `canvas`, `canvas-grid`, `rail`, `rail-foreground`, `dock`,
`dock-foreground`.

Waypoint types: `waypoint-goal`, `waypoint-user-need`, `waypoint-feature`,
`waypoint-adr`, `waypoint-code-component`, `waypoint-test`, `waypoint-risk`,
`waypoint-ai-instruction`, `waypoint-open-question`, `waypoint-deprecated`, each
with a `-foreground` pair.

State: `state-new` (the halo), `state-dimmed`, `state-selected`.

Every token is defined twice: once for light, once for dark. There is no default
that works for both.

## 4. Keyboard and focus

| Key                            | Action                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`            | through rail, dock, canvas, inspector in that order; never into offscreen content |
| `Escape`                       | closes the topmost surface: dialog, then drawer, then tour, then selection        |
| `Ctrl/Cmd+Z`                   | step back in the map history                                                      |
| `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` | step forward                                                                      |
| `/`                            | focus the map search                                                              |
| `Enter` / `Space`              | activate the focused waypoint                                                     |
| Arrow keys                     | move between waypoints inside the canvas once focused                             |

Rules:

- Focus is visible on every control, in both themes, with a ring that meets 3:1
  against its surroundings.
- A drawer or dialog traps focus while open and returns it to whatever opened it.
- While focus is in a text field, `Ctrl/Cmd+Z` is text undo, not map undo.

## 5. Accessible names

- Every icon-only control carries an `aria-label` naming its action, not its
  glyph ("Undo", not "Arrow left").
- The dock announces the current step as `"Step 2 of 5"` and announces a change
  politely.
- The rail exposes the current project and map with `aria-current="page"`.
- Surface states (`empty`, `loading`, `failed`) are announced via a live region
  when they change.

## 6. One place per action

| Action                                       | Single home                  |
| -------------------------------------------- | ---------------------------- |
| Add project                                  | rail footer                  |
| Create map                                   | rail, inside the project row |
| Open a map                                   | rail                         |
| Select a waypoint                            | canvas                       |
| Search and filter by type                    | canvas, top right            |
| Edit waypoint text, type, file path          | inspector                    |
| Delete a waypoint                            | inspector                    |
| Edit tour name, description, stops and order | inspector, in tour mode      |
| Previous / next stop                         | dock                         |
| Show the whole tour                          | dock                         |
| Edit tour (enter tour editing)               | dock                         |
| Export tour                                  | dock                         |
| Undo / redo                                  | dock                         |
| Autosave status                              | dock                         |
| Switch theme                                 | header, above the rail       |
| Toggle rail                                  | rail edge                    |
| Toggle inspector                             | inspector edge               |

Any action found in a second place is a defect (SC-002).

## 7. Surface states

Each of the four states renders in place of the region's content, never as an
empty region.

| State                 | Content                           | Primary action                             |
| --------------------- | --------------------------------- | ------------------------------------------ |
| Workspace empty       | one sentence on what a project is | "Add project"                              |
| Project without a map | one sentence on what a map is     | "Create map"                               |
| Loading               | a skeleton of the region's shape  | none; data actions disabled and visibly so |
| Failed                | what failed, in plain language    | "Retry"                                    |

A project that is `unavailable` renders in the rail with a marker and a
tooltip naming the missing path; opening it shows the last cached document,
read-only, with one action: "Choose a new location".
