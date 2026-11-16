# Feature Specification: Application Shell

**Feature Branch**: `010-app-shell`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "надо начать делать интерфейс" (start building the interface)

## Clarifications

### Session 2026-11-16

- Q: Should edits to waypoint text and tour stop order be saved automatically, or only when the person explicitly confirms? → A: Autosave, with browser-style undo and redo: the person can step back through their changes and forward again across the ones they stepped back over.
- Q: How many waypoints must the interface keep smooth at once? → A: 250 waypoints and 40 tours.
- Q: On launch, should the application return to the project, map, tour and stop that were open when it last closed? → A: Yes, restore all four.
- Q: When there are no projects yet, should the empty screen add one itself, or only explain how? → A: Add one itself: the action opens a location picker and the project appears in the rail.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - One coherent workspace instead of three competing panels (Priority: P1)

A person opens Cognitive Tours and sees a single workspace: a navigation rail on
the left listing projects and their maps, the map itself in the centre, a
contextual inspector on the right, and one tour dock that holds everything about
the current tour. Today the same information appears in two or three places at
once and the person has to work out which copy is live.

**Why this priority**: Every other improvement lands inside this shell. Without
it, new capability makes the screen denser and the problem worse.

**Independent Test**: Open the application with a populated workspace and check
that the map, the navigation, the inspector and the tour dock are each the only
place their content appears. No control is duplicated.

**Acceptance Scenarios**:

1. **Given** a workspace with one project and one map, **When** the application
   opens, **Then** the navigation rail, the map area, the inspector and the tour
   dock are all visible without scrolling and without overlapping.
2. **Given** the map area is showing, **When** the person looks for the current
   tour's name, its step position and the way to move to the next stop,
   **Then** all three are found in the tour dock and nowhere else.
3. **Given** any visible control, **When** the person activates it,
   **Then** something observable happens.

---

### User Story 2 - A theme that is correct on every surface (Priority: P2)

A person whose system is set to dark mode opens the application and sees a dark
interface — panels, inputs, menus, the map canvas, badges and tooltips. The
person can also choose light, dark or follow the system, and the choice is
remembered.

**Why this priority**: Today only the page background reacts to the system theme
and every panel stays white. This is the most visible defect in the product.

**Independent Test**: Open the application once in light and once in dark, on
every screen with every panel open, and confirm that no surface, text or border
retains the opposite theme's colour.

**Acceptance Scenarios**:

1. **Given** the system theme is dark, **When** the application opens,
   **Then** every surface is dark and every text is light.
2. **Given** the person selects a theme explicitly, **When** the application is
   reopened, **Then** that theme is applied without asking again.
3. **Given** the person chose to follow the system, **When** the system theme
   changes while the application is open, **Then** the interface follows within
   one second without a reload.
4. **Given** either theme, **When** text is displayed on any surface,
   **Then** its contrast is at least the WCAG AA threshold for that text size.

---

### User Story 3 - Switching between projects and maps from one place (Priority: P3)

A person keeps several repositories, and some repositories hold more than one
map. The navigation rail lists every project and the maps inside it. Selecting
a map opens it in the same window, and returning to a project restores the map,
tour and stop that were last open there.

**Why this priority**: The workspace is the reason the product stops being a
per-deployment site. It is also the first thing a person meets on launch.

**Independent Test**: With two projects and three maps between them, switch
between all of them in one session and confirm that each returns to the state it
was left in.

**Acceptance Scenarios**:

1. **Given** a workspace with several projects, **When** the person selects a
   project, **Then** its maps are listed and one of them opens.
2. **Given** two projects have been visited, **When** the person switches back
   to the first, **Then** the same map, tour and stop are restored.
3. **Given** a project whose folder no longer exists, **When** the workspace
   loads, **Then** the project is still listed with a visible "not found"
   marker, opens read-only, and offers a way to point at a new location.
4. **Given** the rail is collapsed, **When** the person needs it,
   **Then** a single always-visible control reopens it.
5. **Given** the application was closed on a map, **When** it is opened again,
   **Then** that project, map, tour and stop are already open.

---

### User Story 4 - Usable at any window width (Priority: P4)

A person works on a desktop, then on a laptop, then checks something on a phone.
The interface rearranges itself rather than breaking: at wide widths all three
zones are visible; at medium widths the rail collapses to icons; at narrow
widths the rail and the inspector become drawers and the tour dock moves to the
bottom.

**Why this priority**: The map stays readable at every width; the surrounding
furniture must not be the reason a phone user cannot read it.

**Independent Test**: Open the application at widths of 1440, 1024, 768 and 360
pixels and confirm that no content is clipped, no control is unreachable and no
horizontal scrolling appears outside the map canvas.

**Acceptance Scenarios**:

1. **Given** a 360 pixel wide window, **When** a map is open,
   **Then** the map fills the width and the rail and inspector are reachable as
   drawers.
2. **Given** a drawer or a dock is open at a narrow width, **When** the person
   dismisses it, **Then** the map regains the space it occupied.
3. **Given** any supported width, **When** the tour dock is visible,
   **Then** the current stop and the next/previous controls remain usable.

---

### User Story 5 - A person always knows what to do next (Priority: P5)

A person opens the application and finds nothing: no projects, or a project with
no map, or a project that is loading, or one that failed to load. Each of these
states says what happened and offers exactly one next action.

**Why this priority**: The awkward onboarding was the second most common
complaint. An empty screen with no next step is where people stop.

**Independent Test**: Reach each of the four states — empty workspace, project
without a map, loading, failure — and confirm that each names the situation and
presents one obvious action.

**Acceptance Scenarios**:

1. **Given** the workspace has no projects, **When** the application opens,
   **Then** it explains what a project is and offers the action that adds one.
2. **Given** the person chooses a location for a new project, **When** the
   project is added, **Then** it appears in the navigation rail with the maps it
   contains listed.
3. **Given** a project is open but has no map, **When** the person views it,
   **Then** the empty map area explains what a map is and offers the action that
   creates one.
4. **Given** a map takes longer than one second to load, **When** the person is
   waiting, **Then** a loading indicator is shown and controls that need data are
   visibly unavailable rather than silently inert.
5. **Given** a map fails to load, **When** the failure is shown, **Then** the
   message says what failed in plain language and offers a retry.

---

### User Story 6 - Editing without leaving the map (Priority: P6)

A person selects a waypoint and edits its text in the inspector, or opens a tour
for editing and reorders stops there, without a dialog taking over the screen
and hiding the map they are reasoning about.

**Why this priority**: Editing through modal dialogs hides the thing being
reasoned about and adds two extra actions to every edit.

**Independent Test**: Edit a waypoint's description and reorder two stops
entirely from the side surfaces, with the map continuously visible.

**Acceptance Scenarios**:

1. **Given** a waypoint is selected, **When** the person edits its description,
   **Then** the edit happens in the inspector with the map still visible.
2. **Given** a tour is open, **When** the person changes the order of two stops,
   **Then** the change is reflected in the tour dock at once, without closing
   any surface.
3. **Given** an edit has been saved automatically, **When** the person
   presses Escape or leaves the field, **Then** the edit is kept.
4. **Given** several changes have been made, **When** the person steps back
   through them and then forward again, **Then** the map passes through exactly
   the states it passed through on the way back.
5. **Given** the person has stepped back, **When** they make a new change,
   **Then** the changes they stepped back over are no longer reachable.

---

### Edge Cases

- A workspace with zero projects, and a workspace with fifty.
- A project whose folder was moved or deleted, and a project whose folder
  exists but holds no map.
- A map with no waypoints, and a map with no tours.
- A map larger than the supported size of 250 waypoints and 40 tours.
- Project, map, tour and waypoint names that are very long or empty.
- The inspector open at the narrowest supported width.
- The system theme changing while the application is open.
- A loading or failing map, and a map that becomes available after failing.
- A person steps back further than the history retains; the oldest changes are
  no longer reversible and the control reflects that.
- A person steps back and then makes a new change, abandoning the changes that
  were ahead.
- A person chooses a location that already belongs to a project, that holds no
  maps, or that cannot be read.
- A person abandons the location picker without choosing anything.
- A project with several maps, and a project with none.
- Keyboard-only use: focus order through rail, dock and inspector, visible focus
  on every control, and Escape closing the topmost surface first.
- Screen-reader use: every icon-only control has an accessible name, and state
  changes are announced.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST present the workspace, the map, the
  inspector and the tour dock as distinct regions of one screen.
- **FR-002**: Each piece of information about the current tour MUST appear in
  exactly one region.
- **FR-003**: Every control the application displays MUST perform an action; a
  control that is unavailable MUST be shown as unavailable, not silently inert.
- **FR-004**: The application MUST offer light, dark and follow-the-system
  themes, and MUST remember an explicit choice across restarts.
- **FR-005**: Every surface, text, border, icon and state colour MUST resolve
  from one shared visual definition per theme, so that no element is left on the
  opposite theme's colour.
- **FR-006**: Text MUST meet WCAG AA contrast in both themes.
- **FR-007**: The application MUST show every project in the workspace and, for
  each, the maps it contains.
- **FR-008**: Selecting a map MUST open it in the same window without a reload.
- **FR-009**: The application MUST remember, per project, the last map, tour and
  stop that were open, and restore them on return.
- **FR-010**: A project whose location is no longer available MUST remain listed,
  MUST be marked as unavailable, and MUST open read-only.
- **FR-011**: The application MUST allow the person to point an unavailable
  project at a new location.
- **FR-012**: The application MUST rearrange itself at the wide, medium and
  narrow width bands, keeping every control reachable at the narrowest band.
- **FR-013**: The application MUST NOT require horizontal scrolling outside the
  map canvas at any supported width.
- **FR-014**: Every empty, loading and failure state MUST name the situation and
  offer exactly one primary next action.
- **FR-015**: Waypoint and tour text MUST be editable from the side surfaces
  with the map still visible, and MUST be stored automatically once the person
  pauses, without an explicit save action.
- **FR-016**: The application MUST be fully operable from the keyboard, with
  visible focus and with Escape dismissing the topmost surface.
- **FR-017**: Every icon-only control MUST have an accessible name.
- **FR-018**: The application MUST keep a running history of the changes made
  in the current session and MUST let the person step back and forward through
  it, restoring the exact state each step produced.
- **FR-019**: Stepping back and stepping forward MUST each be available from a
  visible control and from the platform's standard undo and redo shortcuts.
- **FR-020**: The history MUST cover every change the interface can make:
  adding, editing, moving and deleting waypoints, links, tours and stops, and
  reordering stops.
- **FR-021**: Stepping back MUST be reversible: after stepping back over any
  number of changes, the person MUST be able to step forward over the same
  changes in the same order.
- **FR-022**: Making a new change after stepping back MUST discard the changes
  that were stepped back over.
- **FR-023**: The history MUST NOT outlive the session; a restart begins with an
  empty history.
- **FR-024**: Panning, zooming, selecting a waypoint, dragging a waypoint and
  filtering MUST remain smooth on a map holding up to 250 waypoints and 40
  tours.
- **FR-025**: A map larger than the supported size MUST remain usable and MUST
  be reported as exceeding the supported size, rather than degrading silently.
- **FR-026**: The application MUST let the person add a project by choosing its
  location, and the project MUST appear in the navigation rail once added.
- **FR-027**: The application MUST let the person create an empty map inside a
  project, and the new map MUST open at once.
- **FR-028**: Adding a project MUST NOT require the person to leave the
  application or to copy a path from a terminal.
- **FR-029**: On launch, the application MUST reopen the project, map, tour and
  stop that were open when it was last closed.

### Key Entities

- **Workspace**: The person's collection of projects. Has zero or more
  projects; one is active at a time.
- **Project**: A place on the person's machine holding one or more maps. Has a
  name, a location, an availability state and a remembered view state. Enters
  the workspace when the person chooses its location.
- **Map**: The waypoints, links and tours belonging to one project. Has a name;
  a project has zero or more; a new map starts empty.
- **Tour view state**: The map, tour and stop last open in a project, restored
  on return and kept across restarts.
- **Theme preference**: Either an explicit theme or "follow the system".
- **Change history**: The ordered states the current map passed through during
  the session, with a position marker. Stepping back moves the marker towards
  the beginning, stepping forward moves it towards the end.
- **Surface state**: One of empty, loading, ready or failed, for a workspace, a
  project or a map.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A person can reach any project's map from launch in at most two
  actions.
- **SC-002**: A review of every screen finds zero controls that do nothing and
  zero actions exposed in more than one place.
- **SC-003**: In both themes, 100% of text/border pairs meet WCAG AA contrast;
  a check of all screens finds no element on the opposite theme's colour.
- **SC-004**: At 360 pixels width every control is reachable and no content is
  clipped, verified on all three zones and all four states.
- **SC-005**: A first-time person edits one waypoint and one tour stop in under
  90 seconds without documentation.
- **SC-006**: Switching between two projects three times restores every
  remembered map, tour and stop in 100% of attempts.
- **SC-007**: Every empty, loading and failure state shows exactly one primary
  action, verified on all four states.
- **SC-008**: A keyboard-only pass reaches every control on every screen, with
  visible focus throughout.
- **SC-009**: A scripted sequence of twenty changes — creates, edits, deletes
  and reorders — is stepped back to the beginning and forward to the end, and
  every intermediate state matches the state recorded on the way in, in 100% of
  attempts.
- **SC-010**: On a map with 250 waypoints and 40 tours, panning, zooming,
  selecting a waypoint, dragging a waypoint and typing in search each show a
  visible change within 100 milliseconds, with no visible stall.
- **SC-011**: Closing and reopening the application three times returns to the
  same project, map, tour and stop every time, in 100% of attempts.
- **SC-012**: A person starting with an empty workspace adds a project and sees
  one of its maps in under 30 seconds, without opening a terminal or documentation.

## Assumptions

- The person is working alone on their own machine; no accounts, no sharing and
  no concurrent editors.
- Change history is per session and per map: it covers what the person changed
  since opening the application and is not stored alongside the map.
- A supported map holds at most 250 waypoints and 40 tours. Larger maps are
  beyond the guarantee in SC-010; the interface must stay usable and say so.
- This feature covers the shell: navigation, theme, responsiveness, states and
  editing surfaces. Discovering projects from disk, reading and writing map
  files, the command line tool and agent access are separate features that plug
  into this shell.
- The shell does not scan the machine for projects on its own: a project enters
  the workspace when the person chooses its location, or when another feature
  registers it. The shell must behave correctly for empty, partial and failing
  input.
- The shell lists projects and maps, adds a project by location, and creates an
  empty map. Reading and writing what a map contains — its waypoints, links and
  tours — belongs to a separate feature that consumes this shell.
- The visual language is rebuilt rather than preserved; the map remains the
  centre of the screen and the existing concept of waypoints, links and tours is
  unchanged.
- Project constraints on the component library and on design-token discipline
  come from the project constitution and are not restated here.
- Existing content and terminology (waypoint, tour, stop, map, full map) are
  retained; no new domain vocabulary is introduced.
