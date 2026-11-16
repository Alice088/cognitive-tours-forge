# Feature Specification: Live Map Sync

**Feature Branch**: `011-file-sync`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "011 — синхронизация карты с файлом на диске" (the open map and the file on disk follow each other)

## Clarifications

### Session 2026-11-16

- Q: When the file on disk changes while the person has unsaved changes, should the application choose for them or ask? → A: Ask, in the same notice area the other map-level messages use, with reload and keep-mine as the two choices and the differing fields named.
- Q: What happens to undo history when the map is replaced from disk? → A: The history starts again at that point: the replaced document is a new starting state, and the notice says so before the person accepts the reload.
- Q: Should the map list in the navigation rail follow the folder too? → A: Yes: a map file created, renamed or deleted outside the application appears or disappears in the rail without a reload.
- Q: How quickly must an outside change become visible? → A: Within one second where the filesystem reports changes, and within two seconds where it does not.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A change made outside the application appears in it (Priority: P1)

A person has a map open and changes the file from somewhere else: a text
editor, `git checkout` to another branch, a script, or an AI agent writing
waypoints into `.tours/`. Within a second the map on screen shows what the file
now says, without a reload, and without losing the person's place — the same
waypoint stays selected, the same tour and stop stay open.

**Why this priority**: A local-first product keeps its source of truth on disk.
If the application only reads the file at load time, every other tool that
touches the map is invisible until a reload, and the map stops being the shared
artifact the whole design rests on.

**Independent Test**: Open a map, change one waypoint's label in the file with
another program, and confirm the canvas shows the new label without a reload and
without losing the selection.

**Acceptance Scenarios**:

1. **Given** a map is open and unmodified, **When** another program changes a
   waypoint's label in the file, **Then** the canvas shows the new label within
   one second, with no reload and no notice.
2. **Given** a map is open with a waypoint selected and a tour at a step,
   **When** the file gains a new waypoint, **Then** the selection, tour and step
   are unchanged and the new waypoint is visible.
3. **Given** a map is open, **When** the file is rewritten with identical
   content, **Then** nothing on screen changes and no notice appears.
4. **Given** a map is open, **When** the file gains several changes in quick
   succession, **Then** the application settles on the final state and the
   person sees no intermediate states.
5. **Given** a waypoint that was selected, **When** an outside change removes
   it, **Then** the selection falls back to no selection, the tour stays open
   and a short message says the waypoint is gone.

---

### User Story 2 - The application's own saves do not echo back (Priority: P2)

The person edits in the application, the change is written to the file, and the
application does not treat its own write as an outside change: no notice, no
second load, no reset of undo history, no visible flicker.

**Why this priority**: Naive file watching makes every save look like a
conflict. Without this story the feature makes editing worse than it is today.

**Independent Test**: Make twenty edits with the application and confirm that
the map never reloads, no notice appears, and undo still steps back through all
twenty.

**Acceptance Scenarios**:

1. **Given** the person edits a waypoint, **When** the save completes, **Then**
   no notice appears and no reload happens.
2. **Given** the person made several edits in a row, **When** the last one is
   saved, **Then** the undo history still holds every one of them.
3. **Given** a save is in flight, **When** the file changes on disk before the
   save lands, **Then** the person is offered the choice from User Story 3
   rather than having either side overwritten silently.

---

### User Story 3 - Neither side is lost when both changed (Priority: P3)

The person has edited a waypoint and, before the save lands, the file changes on
disk. The application does not pick a winner. It says that the file changed
outside the application, names what changed, and offers two ways out: take the
file's version, or keep the person's and write it over the file.

**Why this priority**: Silently discarding an outside change makes the product
unsafe for the agent collaboration it exists for; silently discarding the
person's typing is worse. The choice is the feature.

**Independent Test**: Edit a waypoint in the application, change the same
waypoint in the file before the save lands, and confirm both versions can be
reached and neither is destroyed without the person choosing.

**Acceptance Scenarios**:

1. **Given** unsaved edits exist, **When** the file changes on disk, **Then** a
   notice names the situation and offers exactly two actions: reload from disk
   and keep mine.
2. **Given** the notice is showing, **When** the person chooses to reload,
   **Then** the file's version is shown, the history starts again, and the
   person is told the history restarted.
3. **Given** the notice is showing, **When** the person keeps their version,
   **Then** their version is written to the file and the outside change is
   overwritten only after that explicit choice.
4. **Given** the notice is showing, **When** the person continues typing,
   **Then** the notice stays and their text is not replaced.
5. **Given** the person keeps their version, **When** the write lands, **Then**
   no further notice appears for that write.

---

### User Story 4 - It still works where change notifications do not (Priority: P4)

The project folder is on a network drive, in a container mount, or on a
filesystem that reports no changes. The map still follows the file, only a
little later, and the person is never told about a mechanism they cannot see.

**Why this priority**: A silent failure on an unusual filesystem would make the
feature look broken and would hide outside changes exactly where a team is most
likely to share a folder.

**Independent Test**: Point the application at a project on a filesystem that
reports no changes, edit the file from outside, and confirm the map updates
within two seconds.

**Acceptance Scenarios**:

1. **Given** a project whose filesystem reports no changes, **When** the file
   changes outside the application, **Then** the map updates within two seconds.
2. **Given** the same project, **When** nothing changes for ten minutes,
   **Then** the application stays idle and reports no errors.
3. **Given** the connection that carries changes is interrupted, **When** it
   returns, **Then** the application reconciles once and shows the current file.

---

### User Story 5 - A file that cannot be read is not applied (Priority: P5)

Another program writes something that is not a valid map: a half-written file, a
merge conflict marker, an empty file. The application does not blank the canvas
or crash. It keeps showing the map the person was working on and says the file
on disk cannot be read, so the person can go and fix it.

**Why this priority**: The failure mode is rare but destructive: applying an
empty document would let the next save overwrite a real map with nothing.

**Independent Test**: Replace the file with an invalid document while a map is
open, and confirm the map stays on screen, the message names the file, and
saving is not offered until the file is fixed or the person chooses their own
version.

**Acceptance Scenarios**:

1. **Given** a map is open, **When** the file is replaced with content that is
   not a valid map, **Then** the map stays on screen and a message names the
   file and the reason.
2. **Given** that message is showing, **When** the file is fixed and valid
   again, **Then** the application applies it and the message disappears.
3. **Given** a map is open, **When** the file is deleted outside the
   application, **Then** the person is offered to write the map back to disk or
   to leave it, and nothing is lost by waiting.

---

### Edge Cases

- The file is deleted and recreated with the same name in quick succession.
- Two outside writes land within the same second, changing different parts of
  the document.
- A map file is added, renamed or removed inside `.tours/` while the rail is
  visible.
- The file's modification time does not change although its content does.
- The map is open read-only, because the project folder is unavailable or the
  copy came from the local cache.
- An outside change arrives while a notice from an earlier change is still
  showing.
- An outside change makes the map exceed the supported size.
- The project folder disappears while its map is open.
- The application is opened fresh after changes were made while it was closed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST make a change made to the open map file by
  another program visible in the open map without a reload, within one second
  where the filesystem reports changes and within two seconds where it does not.
- **FR-002**: An update that arrives without the person's involvement MUST
  preserve the selection, the open tour and the current stop whenever those
  still exist in the updated map.
- **FR-003**: The application MUST NOT treat its own writes as outside changes:
  an own write MUST NOT reload the map, reset the history, show a notice or
  cause a visible flicker.
- **FR-004**: When the file changes while the person has changes not yet written,
  the application MUST NOT discard either side: it MUST name the situation and
  offer exactly two actions, take the file's version or keep the person's.
- **FR-005**: The notice describing an outside change MUST name what changed
  before the person chooses.
- **FR-006**: Taking the file's version MUST start the history again at the
  version from disk, and MUST say so before and after the choice.
- **FR-007**: Keeping the person's version MUST write it to the file, and MUST
  NOT raise a further notice for that write.
- **FR-008**: Content that is not a valid map MUST NOT be applied: the
  application MUST keep the map it is showing and MUST name the file and the
  reason it cannot be read.
- **FR-009**: Once the file is valid again, its content MUST be applied and the
  message MUST disappear.
- **FR-010**: A map file that disappears MUST NOT be treated as empty content;
  the person MUST be offered to write the map back or to leave it as it is.
- **FR-011**: Several outside changes arriving in quick succession MUST collapse
  into one update of the document, showing the final state and no intermediate
  state.
- **FR-012**: A change that leaves the file's content identical MUST cause no
  update and no notice.
- **FR-013**: The navigation rail MUST follow the project's `.tours/` folder: a
  map file created, renamed or removed outside the application MUST appear or
  disappear without a reload, within one second where the filesystem reports
  changes and within two seconds where it does not.
- **FR-014**: Sync MUST be suspended for a map that is open read-only, and MUST
  resume if the map becomes writable while open.
- **FR-015**: The mechanism MUST NOT send the map or any part of it anywhere: all
  comparison and transfer stays inside the machine, between the local server and
  the browser.
- **FR-016**: When the channel that carries changes is interrupted and later
  resumes, the application MUST reconcile exactly once and MUST NOT show a
  notice for an update the person never could have missed.
- **FR-017**: An applied outside change MUST be announced to assistive
  technology without moving focus.
- **FR-018**: An outside change MUST NOT be able to remove a waypoint, link,
  tour or stop that the person created in the same moment without the person
  seeing the notice from FR-004.
- **FR-019**: The application MUST NOT show more than one map-level notice at a
  time; a newer situation MUST replace an older one rather than stacking.
- **FR-020**: Sync MUST NOT change the autosave contract: edits are still
  written once, after the person pauses.

### Key Entities

- **Outside change**: A difference between the map file on disk and the document
  the application holds, not produced by the application itself. Has a moment, a
  set of affected waypoints, links, tours and stops, and one of three outcomes:
  applied, offered as a choice, or refused as unreadable.
- **Watched map**: The one map file the application currently follows, together
  with the last content it read or wrote, which is what an outside change is
  compared against.
- **Sync channel**: The connection between the local server, which is the only
  party that touches the disk, and the browser, which carries change
  notifications one way.
- **Map-level notice**: One message about the state of the open map — the
  existing stale-file, save-failure, oversized and read-only messages, plus the
  outside-change choice. Only one is shown at a time.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Twenty outside changes, made one at a time while the map is open,
  each appear on screen within one second, in 100% of attempts, with no reload.
- **SC-002**: Twenty edits made inside the application produce zero notices,
  zero reloads and twenty undoable steps, in 100% of attempts.
- **SC-003**: In ten scenarios where the file and the person both changed, no
  version is lost without an explicit choice, in 100% of attempts; after the
  choice the surviving version is exactly the one chosen.
- **SC-004**: Ten outside writes of unreadable content leave the open map
  unchanged and produce a message naming the file, in 100% of attempts, and no
  empty map is written back to disk.
- **SC-005**: On a filesystem that reports no changes, an outside edit appears
  within two seconds, in 100% of attempts.
- **SC-006**: A map file added or removed inside `.tours/` appears or disappears
  in the rail within one second, in 100% of attempts.
- **SC-007**: No network traffic leaves the machine while a map is open: the
  only connections observed are to the local server.
- **SC-008**: A person looking at the screen while five outside changes land in
  one second sees one settled map, not a sequence of partial ones.
- **SC-009**: Ten minutes with no changes on either side produce no visible
  activity, no error and no measurable growth in load or memory.
- **SC-010**: Every outside change that is applied is announced in the live
  region, and the person's focus stays where it was, in 100% of attempts.

## Assumptions

- One person at a time works on a map: no two browsers editing the same file,
  and no collaboration features. Concurrent writing is possible — that is what
  the conflict path is for — but not simultaneous editing by two people.
- The file on disk is the source of truth. The application never claims a
  version is correct because it holds it in memory.
- "Outside" means any writer that is not this application in this window: an
  editor, a git operation, a script, an agent, another tool.
- Filesystems that report changes do so unreliably; the guarantee has two
  speeds, and the slower one is the contract on unusual filesystems, not an
  error state.
- The mechanism that carries changes between the local server and the browser
  is a local connection, and the constitution forbids sending map content
  anywhere else.
- Reading and writing the map file, the shell's regions, the command line tool
  and agent access are separate features; this one changes when and how the open
  map is refreshed, and adds no new editing surface.
- Maps stay within the supported size of 250 waypoints and 40 tours; an outside
  change that exceeds it is reported the same way an oversized map is today.
