# Architecture

How Cognitive Tours is put together: the three regions of state, the four regions
of the screen, and the decisions behind the reading surface, the map format, live
file sync, the offline copy, exchange, the agent protocol and editing.

The idea and the product are in the [README](../README.md); how to build, run and
test it is in [DEVELOPING.md](DEVELOPING.md).

## The three regions of state

Three regions of state, each with exactly one owner.

| State                    | Lives in                            | Survives              |
| ------------------------ | ----------------------------------- | --------------------- |
| Workspace registry       | `~/.ctour/workspace.json`           | restarts, per machine |
| Map document             | `<project>/.ctour/<name>.tour.json` | restarts, git, clones |
| Selection, history, drag | the running application             | the session           |

The registry is machine-local on purpose: which projects you have open is a fact
about your machine, not about the repository. The map is the opposite — it belongs
to the code.

### The screen

Four regions, each the single home of its content: the navigation rail (projects
and their maps), the map canvas, the inspector (the selected waypoint or the tour
being edited), and the tour dock (the current tour, its position, its controls). A
fact that appears in two regions is a defect, not a convenience.

Width bands: at 1280 px and wider all four are visible, with a 240 px rail and a
320 px inspector; between 768 and 1279 px the rail is 56 px of icons whose labels
appear on hover or focus and the inspector stays docked at 300 px; below 768 px
the rail and inspector become drawers over the canvas and the dock becomes a
single scrollable row.

### Reading a tour

The narration a tour author writes is the reason the tour exists, so it has a
surface of its own. `app/components/shell/TourReading.tsx` renders one stop as a
fixed-width card inside the map canvas: the stop's position, the waypoint's label
and type, the narration in full, and the waypoint's description underneath as the
detail it is. The card opens by itself when a tour is selected and follows every
step; dismissing it holds for the rest of the work on that tour, because the
dismissal is keyed by the map file and the tour id rather than stored as a flag
that has to be reset. Whole tour turns the same component into a full-height panel
beside the map, which shrinks and stays visible.

The card never covers the focused stop: `pickCorner` in `app/lib/tour-reading.ts`
prefers the bottom-left corner and moves to the nearest free one when the stop
would fall under it. Nothing pans or zooms the map to make room. The derivation —
narration trimmed, whitespace counted as absent, `Stop 3 of 7` — is pure and
unit-tested, so the component only renders what it is given.

While a tour is read, the left and right arrows step the walk and nothing else:
`MapCanvas` consults `onTourArrow` before its own waypoint navigation. With no
tour selected the arrows keep the behaviour they always had.

The two map actions — "Save a copy" and "Export all maps" — are part of the
canvas's top row, to the right of the search field, and collapse into one overflow
menu below 768 px. Nothing floats over the map: `AppShell` still has exactly four
regions, and a test walks the element at the map's top-right corner to prove no
control sits there.

### Design tokens

Every colour is a semantic custom property in `app/globals.css`, defined once for
light and once for dark: surfaces (`background`, `card`, `rail`, `dock`,
`canvas`), interaction (`primary`, `accent`, `destructive`, `ring`, `input`), the
ten waypoint types, and three states. Components use `bg-canvas`,
`text-waypoint-goal-foreground`; a literal `bg-gray-100` fails lint. A unit test
reads the stylesheet and fails if any text pair drops below WCAG AA, so the themes
cannot silently rot.

### Reading and writing the map

`app/lib/workspace/map-file.ts` owns the format. Reads validate and normalise, and
never rewrite the file they just read. Writes serialise with a fixed key order,
sort collections by id, keep tour stop order exactly as authored, write a
temporary file and rename it over the target. A crash mid-save cannot truncate a
map, and adding one waypoint produces a one-line diff.

### Following the file while it is open

The server watches the project's `.ctour/` folder, never the map file itself:
every save renames a temporary file over the target, which replaces the inode and
silently kills a watcher attached to the file. A change is read, parsed and
normalised, and compared with the canonical text last delivered; equal text
produces no event, which is also why the application's own saves do not echo back
— the write records the same normalised text a read will produce, so clearing a
field cannot make the application's own save look like an outside one. The browser
receives events over one local stream per open map, so nothing leaves the machine.
A comparison loop runs every two seconds alongside the watcher rather than only
after a watch error: some network mounts and container volumes accept a watch and
then report nothing, and a silent watcher would stop the map from following the
file at all.

When the file changes under unsaved typing the map-level notice says what changed
and offers two actions: reload the file's version, which restarts the history and
says so, or keep mine, which writes the open document over the file without a
second notice. A save refused only because the file's timestamp moved — a
formatter, `git checkout` of the same branch — is retried without a notice when
the two documents say the same thing.

Reads for sync are strict. The load surface repairs a map it partly understands;
while a map is open, a document whose repair would drop a waypoint, a link, a stop
or a file path is refused, and the message names what would be lost. A deleted
file is never recreated by an autosave: the notice offers to write it back, and
typing continues on the copy in memory until that choice is made. When the map
cannot be read at all, the same notice offers to write the map over the file.

### When the folder is not there any more

Every successful read and write also refreshes a copy of the map in
`~/.ctour/cache/<project>/`. If the project folder is renamed, moved or deleted,
the project stays in the rail, marked, and opening a map serves the last copy saved
on this machine, read only: every editing control is disabled and the only action
is to choose a new location for the project. The cache is a fallback, not a source
of truth — nothing is ever read from it while the folder is reachable.

### Server routes exist because the browser cannot touch the disk

`app/api/workspace/*` and `app/api/maps/*` are the only code that reads or writes
files. They validate that every path resolves inside the project root before any
filesystem call. Nothing is fetched over the network; the application is a local
server the browser talks to.

### What travels and what stays

A map is a file, but it is only a file while it stays in `.ctour/`. Export writes a
copy into a folder the person picks; it copies the bytes and never parses them, so
what leaves is what the project holds, including a hand-edited layout the reader
would otherwise reformat. An existing file is never replaced — the copy takes the
next free name and says which one it used.

An import is previewed before anything is written: the name the map will get, the
counts it holds, and the entries this product cannot represent. Those entries are
written away only when the person confirms a screen that states how many there
are, and a refusal leaves the folder identical. The write itself creates the file
exclusively, so a name taken in the meantime gets a suffix instead of an overwrite.

What stays behind is the machine: the registry at `~/.ctour/workspace.json`, the
project ids, and the last known copies under `~/.ctour/cache/`. `ctour workspace
export` packs the names, the recorded folders, the last view and those cached maps
into one JSON file; `ctour workspace import` matches each project to a folder — the
recorded one, the one you name with `--project`, or none at all — and never decides
silently. A project folder always beats a travelled copy, and nothing is added
twice.

### How the agent reaches the map

`ctour mcp` speaks a newline-delimited protocol on standard input and output and
offers nine capabilities: list the projects, read one map, and change the map —
add, change and remove a waypoint, link and unlink two waypoints, create a tour and
set its stops. The layer is written in `cli/mcp/` and calls the same map-file
modules the interface uses, so the agent and the person cannot disagree about the
format.

A read returns a state token, the first sixteen hex characters of the sha256 of the
file bytes. Every change sends that token back. A mismatch whose content is
identical after normalisation is reported as "nothing changed"; any other mismatch
is refused and carries the current map, so the agent re-reads instead of
overwriting a newer edit.

There is no channel between the protocol server and the running interface: the
agent writes the file, and the interface notices it as an outside change, exactly
as it notices an editor (see 011). With the interface closed, everything still
works; the interface is a view of the folder, not a requirement.

The instructions an agent needs — read, change, read back, the ten waypoint types,
what a refusal means — travel in the protocol's own handshake, from
`cli/mcp/instructions.ts`, so no per-agent skill file can drift away from the
product.

`ctour mcp install` finds the agents on the machine (Claude Code, Cursor, Gemini
CLI, Codex, pi), adds the entry to the agent's own configuration, and leaves every
other byte of that file alone; running it twice writes nothing. `ctour doctor`
reports whether each detected agent is connected and whether the command it points
at still exists.

### Editing

One zustand store per open map, wrapped in temporal history limited to fifty steps
and scoped to the document — selection and loading flags are not edits and never
enter the history. A text field commits to the store when the person pauses or
leaves the field, so one edit is one undo step. A waypoint is moved by dragging it
on the canvas and one drag is one undo step. Links and tours are created from the
inspector and the tour dock, so every change the interface can make is also a
change the history can step back through. The store is watched by an autosave that
writes 800 ms after the last change and reports pending, saved or failed in the
dock. Saves are serialised, so a burst of changes cannot put two writes in flight
at once. A save that would overwrite a file changed on disk is refused with a 409
and shown in the same map-level notice as an outside change, with the same two
actions; any other failure names the reason and offers one retry without losing the
text. Loading a map is not an edit, so opening one no longer writes it back.
