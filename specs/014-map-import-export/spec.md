# Feature Specification: Maps in and out

**Feature Branch**: `014-map-import-export`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "014 import/export карт и переносимость кэша."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Take a map out of a project as one file (Priority: P1)

A person wants a copy of the map they are looking at, outside the repository: to
send it to a colleague, to put it into another project, to keep it as a snapshot
before a rewrite. They choose to save a copy, and they get one file named after
the map. What leaves is exactly what the project holds — every waypoint, every
link, every tour — down to the text they typed a moment ago.

**Why this priority**: the map is already a file, but today the only way to take
it out is to find the folder in a file manager and copy it by hand, which is
where a stale copy or a broken JSON comes from. Export makes "the map is a file"
true for the person, not just for the machine.

**Independent Test**: open a map, choose to save a copy, and open the delivered
file: the same number of waypoints, links and tours, and the same words.

**Acceptance Scenarios**:

1. **Given** a map named `main` with 12 waypoints, 15 links and 3 tours, **When** the person saves a copy, **Then** one file named `main.tour.json` is delivered and reopening it elsewhere shows 12 waypoints, 15 links and 3 tours.
2. **Given** the person has typed a note and the map is not yet written to the project, **When** they save a copy, **Then** the delivered file contains the typed note and the map reports itself saved.
3. **Given** the map is shown from the last known copy because the project folder cannot be reached, **When** the person saves a copy, **Then** the copy is delivered and the product says the copy came from the last known version rather than the project.
4. **Given** the map cannot be written back to the project because the write fails, **When** the person saves a copy, **Then** the product refuses and names the reason instead of delivering a file that disagrees with the screen.

---

### User Story 2 - Put a map file into a project (Priority: P1)

A person receives a map file, or has one from another project, and wants it in
this project. They choose the file, see exactly what will be added before
anything is written — the name the map will get, how much is in it, and anything
in the file this product cannot represent — and only then confirm. The new map
appears in the navigation rail and opens.

**Why this priority**: maps travel between projects and between people, and a
file that arrives has no guarantee of matching the format. Without a preview the
person either overwrites something or silently imports a map with half its
content missing.

**Independent Test**: import a file from outside the project, and confirm that
the preview named the same counts that the opened map then shows.

**Acceptance Scenarios**:

1. **Given** a file `Q3 Roadmap.tour.json` holding 8 waypoints, **When** the person chooses it for project `atlas`, **Then** the preview names the map `q3-roadmap`, reports 8 waypoints, and confirming adds it to `.ctour/` and opens it with 8 waypoints.
2. **Given** project `atlas` already has `main`, **When** the person imports another `main`, **Then** the preview names the new map `main-2`, and after confirming the existing `main` is byte-for-byte unchanged.
3. **Given** a file with 8 waypoints of which 2 have a type this product does not know, **When** the person opens the preview, **Then** it states that 2 waypoints cannot be represented; confirming writes a map with the other 6; cancelling writes nothing at all.
4. **Given** a file that is not a map, or is not valid JSON, or declares an unsupported map version, **When** the person chooses it, **Then** the product refuses with one sentence naming the file and the reason, and nothing is written.
5. **Given** the project folder cannot be reached, **When** the person tries to import into it, **Then** the product refuses and nothing is written.
6. **Given** an imported map, **When** the person looks at the rail, **Then** the map is listed there and opens without reloading the page.

---

### User Story 3 - Carry this machine's workspace to another machine (Priority: P2)

The same person works on a laptop and a desktop, or moves to a new machine. The
maps live in the repositories, but what the machine remembers does not: which
projects were added, where they are, what was open last, and the last known copy
of every map it has seen. They take that with them in one file, and on the other
machine each project is matched to a folder — the recorded one when it exists,
otherwise the person points at a folder or leaves the project out.

**Why this priority**: after a move, the work of re-adding projects and losing
the last known copies is invisible until the day a folder is unavailable and the
map that was there is not.

**Independent Test**: export on one workspace, import into an empty one, and check
that the same projects, the same maps and the same last opened place appear.

**Acceptance Scenarios**:

1. **Given** a workspace with 3 projects and 6 maps, the last view being map `main` of project `atlas`, **When** the person takes the workspace with them, **Then** one file is delivered and the product states 3 projects and 6 maps.
2. **Given** that file, **When** it is brought into an empty workspace, **Then** 3 projects and 6 maps appear and the last view is map `main` of `atlas`.
3. **Given** one recorded folder is gone on the new machine, **When** the file is brought in, **Then** that project is listed as missing its folder, and the person can point at a folder, or leave it out, before anything is added.
4. **Given** the person leaves a project out, **When** the import finishes, **Then** the workspace holds the other two projects and mentions the one that was left out.
5. **Given** the person points a missing project at a folder that exists, **When** the import finishes, **Then** that project is added pointing at that folder and its maps are read from it, not from the copy that travelled.
6. **Given** the same file is brought in a second time, **When** the import runs, **Then** no project is added twice and the product says nothing was new.
7. **Given** a file that is not a workspace file, or was written by a newer version, **When** the person chooses it, **Then** the import is refused and the workspace is unchanged — same projects, same last view.

---

### User Story 4 - Move a project's maps together (Priority: P3)

A project holds several maps and they should all move, or be handed over as a
set. The person exports the set into a folder they choose, and brings a folder of
maps into a project at once. Maps whose names are already taken are skipped and
named, never replaced.

**Why this priority**: one map at a time is enough until a project has four, and
then the four-at-a-time case is the whole cost of the move.

**Independent Test**: export four maps, import them into a project that already
has one of the four, and check the result is five maps and one reported skip.

**Acceptance Scenarios**:

1. **Given** project `atlas` with maps `main`, `backend`, `frontend` and `risks`, **When** the person exports the project's maps into a folder, **Then** that folder holds four files with those four names, each identical to the map in the project.
2. **Given** that folder, **When** it is brought into project `beacon` which already has `main`, **Then** `backend`, `frontend` and `risks` are added, `main` is reported as already there, and `beacon` holds five maps.
3. **Given** the folder holds one file that is not a map, **When** it is brought in, **Then** that file is reported by name and the other maps are still added.

---

### Edge Cases

- A map file whose name does not fit the naming the project uses (spaces, capitals, punctuation) gets a name the project accepts, and the preview shows the resulting name before anything is written.
- A file larger than this product supports (more than 250 waypoints or more than 40 tours) is imported, and the product states that the map is beyond what it is built for — the same statement it makes when such a map is opened today.
- Two waypoints in the file share an identifier, or the file carries an absolute file path on a waypoint: the product names the count it cannot represent rather than writing a map with a different structure.
- A map is open and edited while the same file is imported under a free name: the open map is untouched and the imported map appears beside it.
- The chosen folder for a set of maps contains files whose names differ only by case on a case-insensitive disk: the second one is given the next free name and named in the report.
- The import fails while writing to the project folder: no partial map is left behind, and the folder still holds exactly the maps it held before.
- The workspace file names a project whose recorded folder is now a file, or is not writable: the project is listed as missing its folder rather than added in a state that cannot be saved.
- The person leaves the product in the middle of a set import: the maps already written stay, and the product states how many were written when it next appears.
- Exporting a project whose folder cannot be reached produces the last known copies and states, for each map, that it is the last known version.
- A workspace file names a project whose folder exists but holds different maps than the ones that travelled: the folder wins, and the copies that travelled are kept as last known copies for the maps the folder no longer holds.

## Requirements _(mandatory)_

### Functional Requirements

**Taking a map out**

- **FR-001**: People MUST be able to save a copy of the open map as a single file, named after the map.
- **FR-002**: Before a copy is delivered, any edit the person has made MUST be written to the project, so the file that leaves matches the screen.
- **FR-003**: When the map cannot be written to the project, the copy MUST NOT be delivered, and the person MUST be told why in one sentence.
- **FR-004**: A delivered copy MUST contain every waypoint, link and tour of the map, with the same text and the same positions.
- **FR-005**: A map that is shown from its last known copy MUST still be exportable, and the person MUST be told the copy came from the last known version.
- **FR-006**: Saving a copy MUST NOT change the project other than by writing the pending edit named in FR-002.

**Putting a map in**

- **FR-007**: People MUST be able to choose a map file from their home directory and bring it into a project.
- **FR-008**: Before anything is written, the product MUST show the name the map will get, the number of waypoints, links and tours it holds, and the number of entries that cannot be represented.
- **FR-009**: An import MUST never replace an existing map; when the name is taken, the product MUST use the next free name and show it in the preview.
- **FR-010**: The stored map MUST use a name the project accepts, derived from the chosen file's name, and the person MUST see the result before confirming.
- **FR-011**: A file that is unreadable, is not a map, or declares an unsupported map version MUST be refused with one sentence naming the file and the reason, and nothing MUST be written.
- **FR-012**: An import into a project whose folder cannot be reached MUST be refused, and nothing MUST be written.
- **FR-013**: Entries that cannot be represented MUST be written away only after the person confirms an explicit statement of how many will be dropped.
- **FR-014**: An imported map MUST be written inside the chosen project's map folder and nowhere else.
- **FR-015**: After an import, the map MUST be listed in the navigation rail and openable without reloading the page.
- **FR-016**: After an import the product MUST state the name the map received and how many waypoints, links and tours it holds.
- **FR-017**: A map that exceeds what the product supports MUST be importable, and the product MUST state that it is beyond what the product is built for.

**Carrying the workspace**

- **FR-018**: People MUST be able to take this machine's workspace with them as a single file: the added projects, the place last opened, and the last known copy of every map the machine has seen.
- **FR-019**: People MUST be able to bring such a file into a workspace, and for every project in it the product MUST either match the recorded folder, offer to point at another folder, or leave the project out — never decide silently.
- **FR-020**: Bringing in a workspace MUST NOT add a project that is already present at the same folder, and MUST state that nothing was new when it adds nothing.
- **FR-021**: A workspace file that is unreadable, is not a workspace file, or was written by a newer version MUST be refused, and the workspace MUST stay as it was.
- **FR-022**: A last known copy that arrives with a project whose folder could not be matched MUST be shown as read-only and MUST NOT be presented as a folder that works.
- **FR-023**: The place last opened MUST be restored when its project and map are present after the import.

**Moving a set**

- **FR-024**: People MUST be able to save all maps of one project into a folder as one file per map, keeping the names the maps have in the project.
- **FR-025**: People MUST be able to bring a folder of map files into a project, each imported by the rules of FR-007 to FR-017, with maps whose names are taken skipped by name instead of replaced.
- **FR-026**: When a set import skips or refuses a file, the product MUST name it and still bring in the others.

**Everywhere**

- **FR-027**: Nothing outside the chosen project's map folder and the machine's own workspace folder MUST be written.
- **FR-028**: Every refusal MUST be one sentence that names the file and the reason, in the language of the rest of the product.
- **FR-029**: Every operation in this feature MUST state its result in words when it finishes or refuses, so that no outcome is visible only as a missing file or a silent change.

### Key Entities

- **Map file**: one map as the project stores it — a name, a version, waypoints with positions, links between waypoints, and tours with stops. The unit that travels.
- **Map copy**: a map file delivered to the person, outside the project, with the map's own name.
- **Import preview**: what the product shows before writing — the resulting name, the counts held, the counts that cannot be represented, and the reason when a file is refused.
- **Project**: a registered folder with a map folder inside it; maps travel into and out of one project at a time.
- **Workspace file**: one file carrying every registered project, the place last opened, and the last known copy of every map this machine has seen.
- **Last known copy**: the version of a map the machine keeps; used when the project folder cannot be reached, and shown as read-only.
- **Folder match**: for a project in a workspace file, either its recorded folder, a folder the person chooses, or no folder at all.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A map with 250 waypoints, 300 links and 40 tours is saved as a copy and brought back in under 2 seconds each, and the reopened map holds all 250 waypoints, all 300 links and all 40 tours.
- **SC-002**: A map that is saved as a copy and brought back into the same project produces a map whose waypoints, links, tours and text are identical in 100% of the 250-waypoint, 300-link and 40-tour cases of SC-001.
- **SC-003**: When the preview says that N entries cannot be represented, the imported map holds exactly the rest: the difference is zero for every N from 1 to 8.
- **SC-004**: In 100% of imports into a project that already holds a map with the same name, the existing map is unchanged to the byte and the new map gets a different name.
- **SC-005**: Every refused import — wrong format, unsupported version, unreachable folder, unwritable folder — leaves the project folder identical to the byte.
- **SC-006**: A workspace with 6 projects and 20 maps is taken in one file and brought in on another machine in under a minute, with every project either matched to a folder or named as left out.
- **SC-007**: Bringing in the same workspace file twice adds zero projects the second time, and every map of the second run is still visible.
- **SC-008**: A person who has never seen the product can take a project's maps out and put them into another project in under 3 minutes without reading instructions.

## Assumptions

- Files to import are chosen from within the person's home directory, because browsing outside it is already refused everywhere else in the product.
- The product's own folder browser is used to choose files and folders; nothing about a cloud drive, an upload endpoint or a remote URL is introduced.
- A copy is written into a folder the person chooses, so the person decides where it lands and the product never picks a destination on its own.
- A workspace file and a map file are both readable JSON documents with a version; a file whose version is higher than the product supports is refused rather than guessed at.
- The map format and its version do not change in this feature; a file that is already a valid map needs no conversion.
- The last known copies keep their current meaning: they stand in only when a project folder cannot be reached, and they are never written back to a project.
- No cap is placed on how many projects a workspace may hold; a workspace file naming more projects than the person wants to review is still brought in one project at a time, each confirmed.
- Colleagues share maps by sending files, or through the repository they already share; this feature adds no server, account or permission.
- The map's own name and the project's name are the only identity a file carries; nothing is matched by content hashes across projects.
- Everything in this feature stays local: no file leaves the machine unless the person saves it somewhere themselves.
