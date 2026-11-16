# Phase 0 — Research: Maps in and out

Answers the open questions of `plan.md`'s Technical Context and records the
choices that shape the feature. Every decision names what was rejected.

---

## D1. A copy is written by the server into a folder the person picks

**Decision**: export is a server-side write into a folder chosen through the
existing folder browser. The person sees the destination and the name before
confirming, and the product announces the path afterwards.

**Rationale**: the server is the only writer in this product (010); a copy that
the browser drops into an invisible `Downloads` folder leaves the person with no
way to say where their own file goes, and no way to export a set of maps without
one save dialog per map. The chosen folder is also testable end to end: the
acceptance test asserts a file on disk, not a browser event.

**Alternatives considered**: `Blob` + anchor download (destination invisible, no
set export, no place to report); writing into the project folder and telling the
person to move it (exactly the manual step this feature removes).

**Spec amendment**: the Assumption "a copy is delivered through the browser's
own file-saving" was replaced by "a copy is written into a folder the person
chooses" so the spec and the design agree. Nothing else in the spec changed.

---

## D2. Import chooses a source by path, not by browser file input

**Decision**: the folder browser gains a mode that lists `.json` files next to
folders; `GET /api/workspace/browse?mode=files` returns both. Import takes a
path.

**Rationale**: the preview must be produced by the same reader that will write
the map (`normalizeDocument`), which lives on the server and needs the path. A
file input hands the browser's bytes to the client, and the client would then
have to be trusted for the counts it displays.

**Alternatives considered**: `<input type="file">` (the server never sees the
path, and the preview would be computed client-side); drag and drop (same);
paste-the-JSON (a different feature — text, not a file).

---

## D3. The imported name comes from the file name and never collides

**Decision**: the candidate name is `mapFileName(basename)` — lowercased, runs
of anything but letters and digits collapsed to `-`, `.tour.json` appended. A
file whose name yields an empty slug is refused (`name-unusable`). A taken name
becomes `<slug>-2`, then `-3`, up to `-100`; beyond that the import is refused
(`name-exhausted`). The preview shows the name that will be used.

**Rationale**: the map's file name is its name everywhere else in the product
(the rail, the route, the state token), so import must end in a name the project
accepts, and the person must see it before anything is written.

**Alternatives considered**: keeping the original name verbatim (breaks the
`^[a-z0-9][a-z0-9-]*\.tour\.json$` rule the reader enforces); asking for a name
in the dialog (a second decision where the file name already carries one, and
the preview would then be a second step).

---

## D4. Import creates the file exclusively, never by rename-over

**Decision**: `writeMapIfAbsent` writes the serialised map to `<target>.tmp`,
then `fs.link(tmp, target)` and unlinks the temporary. `EEXIST` from `link`
means the name was taken between the preview and the write; the caller retries
with the next free name, up to three times, and otherwise refuses.

**Rationale**: `writeMap` ends in `rename`, which replaces silently. Rename
cannot express "create only if absent" — `link` can, atomically, within one
folder. The retry covers the window between preview and write, which is real:
an agent or an editor can create a file in that second.

**Alternatives considered**: `fs.open(target, 'wx')` then write (the file is
visible half-written, which Principle II forbids); checking `exists` then
renaming (a race, and it is the race that produces lost maps).

---

## D5. Losses are counted in the preview and confirmed before writing

**Decision**: the preview returns `{ waypoints, links, tours, dropped:
{droppedWaypoints, droppedEdges, droppedStops, droppedPaths, unknownTypes} }`
from `normalizeDocument`. When every counter is zero, confirm is one click. When
any counter is above zero, the route requires `acceptLosses: true` and otherwise
refuses with `losses-not-accepted` carrying the same counts.

**Rationale**: the reader already knows exactly what it cannot represent (011
added the tallies for the sync path), and 013 already decided that reads report
losses while writes refuse them. Import is a write, so it refuses by default —
but the source is untouched, so a person who understands the numbers may
proceed.

**Alternatives considered**: always refuse a lossy file (a legacy map could
never be brought in, and the person has no other way); write silently and warn
afterwards (a map with silently missing waypoints is the exact failure this
feature exists to prevent).

---

## D6. A map beyond the supported size is imported and named

**Decision**: more than 250 waypoints or more than 40 tours is not a refusal.
The preview and the result state that the map is larger than the product is
built for, the same sentence the interface already uses when such a map is
opened (`MapWorkspace`'s oversized notice).

**Rationale**: refusing a valid map because it is big would make the product
unable to accept its own past. The person already meets this state on open.

---

## D7. Export copies bytes; it never re-serialises

**Decision**: the export route resolves the source — the project file when the
folder is reachable, the last known copy otherwise — and copies those bytes to
the destination. It does not parse, normalise or reformat.

**Rationale**: SC-002 asks that what leaves is what lives in the project, and a
byte copy is the only way to promise that for a file that was hand-edited,
reformatted or written by another tool. It also makes export independent of the
reader: a map with content the reader drops can still be copied out intact.

**Alternatives considered**: serialising the document the client sends (loses
anything the reader drops, and trusts the client); re-reading through
`readMap` then serialising (normalises away formatting the person may rely on).

Consequence: the route needs the _source path_, not the document. When the
project is unavailable, the cached copy's text is copied instead, and the result
carries `source: 'last-known'` so the person is told.

---

## D8. Export never silently replaces a file in the destination folder

**Decision**: if `<destination>/<file>` exists, the export writes
`<name>-2.tour.json`, then `-3`, and reports the name it used. Nothing is
deleted, nothing is replaced.

**Rationale**: the destination is outside the product's control; the only safe
default in a folder the product does not own is to add, never to replace. The
report names what happened, so no one has to discover it.

**Alternatives considered**: refusing when the target exists (the person would
have to clear their Downloads folder by hand); asking per file (a dialog per file
in a set export).

---

## D9. Set export and set import reuse the single-map paths

**Decision**: exporting a project's maps iterates the map files of `.ctour/`
(plus cache-only maps when the folder is unreachable) through the same copy
function; importing a folder iterates `*.json` files through the same preview and
the same write. A file in the folder that fails becomes a named entry in
`skipped`, and the rest still proceed.

**Rationale**: one code path means a set cannot behave differently from a single
map, and the report shape is the same, so the interface renders one component.

**Alternatives considered**: a zip-like container (a new format, a new reader, a
new failure mode); a separate implementation for sets (two bugs for every fix).

---

## D10. A workspace file is one JSON document, versioned, keyed by project name

**Decision**:

```json
{
  "version": 1,
  "exportedAt": "2026-11-16T12:00:00.000Z",
  "projects": [{ "name": "atlas", "path": "/home/me/atlas", "addedAt": "…" }],
  "lastView": { "projectId": "atlas", "mapFile": "main.tour.json", "tourId": null, "step": 0 },
  "maps": { "atlas/main.tour.json": { "version": 1, "project": {}, "waypoints": [], "edges": [], "tours": [] } }
}
```

`lastView.projectId` is translated to `lastView.project` (a name) at export and
back at import. A file whose `version` is above 1 is refused
(`bundle-version`); `exportedAt` is informational and never affects import.

**Rationale**: names are meaningful on another machine, ids are not — project ids
are slugs of a path, and a path is exactly what changes when the machine does.
Keys of the form `<project>/<file>` survive a subfolder change and keep the file
name visible when someone opens the file in an editor.

**Alternatives considered**: keying by id (meaningless elsewhere, and two ids can
hold the same name); a directory of files (no single artefact to carry, no place
for the last view); including the viewport and selection (not part of what the
spec's FR-018 names, and it would make a bundle change on every pan).

---

## D11. The workspace file is handled by the command, not the interface

**Decision**: `ctour workspace export [path]` and `ctour workspace import <path>`
with `--project <name>=<folder>` (repeatable) and `--skip <name>` (repeatable).

**Rationale**: the artefact is about the machine, not a project, and it must be
producible on a machine whose interface is not running — which is the situation
on the machine being left. The command already owns `status` and `doctor`, the
two commands that describe what this machine knows.

**Alternatives considered**: a settings screen in the interface (there is no
machine-level screen, and creating one for one action contradicts "one obvious
place"); doing it inside `ctour init` (a side effect nobody asked for).

---

## D12. Missing folders are left out, never guessed

**Decision**: for each project in the bundle, in this order:

1. `--skip <name>` → left out, reported as skipped by the person.
2. The recorded folder exists, is a directory inside `$HOME`, is writable, and
   is already registered → `already-added`, nothing written.
3. The recorded folder is usable → registered as it is.
4. `--project <name>=<folder>` was given and that folder is usable →
   registered pointing there.
5. Otherwise → `missing-folder`, left out, with the exact command to rerun.

A `--project` flag for a project whose recorded folder works is ignored and
reported as ignored, so the flag cannot create a second entry for one project.

**Rationale**: FR-019 requires that the product never decides a match silently.
Ordering the flag after the recorded folder keeps the same-machine case
frictionless, and reporting the ignored flag keeps the person from believing
their choice was applied.

**Alternatives considered**: matching by folder name (a guess); inheriting ids
from the bundle (ids are this machine's identity, and a duplicate id would
collide with an existing project).

---

## D13. Travelled maps become last known copies; the folder always wins

**Decision**: after each project is registered, its `maps` entries are written
with `writeCachedMap` **only when the project folder does not hold that file**.
A map present in the folder is never overwritten by a travelled copy.

**Rationale**: the cache exists to stand in when a folder cannot be reached
(010, 011). A travelled copy that replaced the folder's map would make the
bundle a stale shadow of the repository — the opposite of "the file is the
source of truth".

---

## D14. The last view is restored only when it can be opened

**Decision**: `lastView` is applied when the project was added (or already
present) and the map file exists in the folder or in the cache; otherwise the
current last view is kept and the result says so. A project that was skipped
cannot contribute a last view.

**Rationale**: FR-023 says "when its project and map are present". Pointing the
machine at a file that is not there would produce the failure the person sees on
the first launch after the move.

---

## D15. Every path in this feature is checked against `$HOME`

**Decision**: the destination folder, the source file and the source folder all
go through `isWithinHome` and `resolveInside` before any read or write. A path
outside `$HOME` is refused with `outside-home`, the sentence 010 already uses.
The product never creates the destination folder; it must exist.

**Rationale**: the browser is the only way into the disk in this product, and it
is already limited to `$HOME` (010's `browse`). A server route that accepted any
path would be a hole the interface was built to close.

**Alternatives considered**: allowing `/tmp` (a second exception to explain and
test); creating the destination folder (the person picked it; a typo would then
create a folder instead of reporting it).

---

## D16. One action bar on the map, one entry point in the rail

**Decision**: the map's own action bar (top-right of the canvas, `MapActions`)
holds "Save a copy" and "Export all maps". The rail's project row gains "Bring
in maps" beside the existing "Create a map", and `ProjectHome` shows the same
button so a project with no maps can still receive one.

**Rationale**: Principle VI — every action has exactly one obvious place. Export
belongs to the map that is on screen; import belongs to the project that will
receive it. Both are reachable at phone widths because the rail and the dock are
already drawers there, and the action bar collapses to icon buttons below `md`.

**Alternatives considered**: both actions in the rail (export would have to
guess which map); a modal settings page (a second place for the same thing).

---

## D17. The preview is a route, not a client-side parse

**Decision**: `GET /api/exchange/preview?path=…&projectId=…` returns the
candidate name, the counts, the losses, the size statement and the free-name
resolution; `GET /api/exchange/preview?folder=…&projectId=…` returns one entry
per `*.json` file for a set import. The dialog renders that, and only that.

**Rationale**: the numbers a person confirms must come from the same reader that
performs the write. It also makes the preview testable without a browser.

---

## D18. No new dependency, no build change

**Decision**: dialogs from the existing shadcn `Dialog`, the existing
`FolderBrowser`, the existing `Button`/`Input`/`Label`; the command group is one
more module imported from `cli/index.ts`, so esbuild picks it up; no
`package.json` change beyond nothing.

**Rationale**: an archive library (for a zip container) or a schema validator
(`zod`) were the two candidates, and both are avoidable: the bundle is JSON and
the map reader already validates.

---

## D19. Tests follow the existing three layers

**Decision**:

- `tests/unit/exchange.test.ts` — naming, free names, `writeMapIfAbsent`
  exclusivity and the retry, byte-copy equality, the lossy confirmation gate,
  refusals leave the folder unchanged.
- `tests/unit/bundle.test.ts` — shape, version refusal, plan ordering, folder
  matching with and without flags, cache writes only when the folder lacks the
  file, last-view restore.
- `tests/cli/workspace.test.ts` — `workspace export` / `import` through
  `main()`, exit codes 0 / 1 / 2 / 3, idempotency on a second run, `--json`.
- `tests/acceptance/exchange.spec.ts` — save a copy of a 250-waypoint map and
  read it back; bring in a file whose name is taken and see `-2`; the lossy
  confirmation; a non-map file refused with nothing written; a folder import
  with one skip.
- `tests/acceptance/workspace-bundle.spec.ts` — export from a temporary
  `CTOUR_HOME` with the real binary, import into an empty one, check the rail of
  a freshly started server shows the projects and the last open map.

**Rationale**: the layers already exist and the acceptance suite already spawns
the real binary; the performance goal of SC-001 is asserted where it is
perceivable — in an acceptance test, with the file on disk.
