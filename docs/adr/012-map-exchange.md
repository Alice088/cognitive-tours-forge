# 012 — Maps in and out

The map lives in `.ctour/`, which is what makes it versioned with the code. It is
also what makes it trapped: the only way out was a file manager, and the only way
in was to trust whatever JSON arrived. This ADR records the decisions that opened
both directions without weakening the invariant that a map is a file.

## D1 — The copy is written by the server into a folder the person chooses

A browser save-as (`Blob` + anchor) needs no server and was rejected: the
destination is invisible to the page, a whole project cannot be exported without
one dialog per map, and no test can assert what landed on disk. A server write
gives one visible destination, one action for a set, and a `cmp` in a test.

The interface still asks the server, so the folder is chosen through the same
browser the "add project" flow already uses (`GET /api/workspace/browse`).

## D2 — Import is by path, not by upload

`<input type="file">` and drag-and-drop hand the page a `File` with no path, so
the file would have to be copied somewhere before it could be read, and the
preview and the write would no longer read the same bytes. The route takes an
absolute path inside `$HOME`, and the folder browser lists `*.json` files so the
person picks a real file rather than typing a path.

## D3 — The name comes from the file name, and steps aside when taken

`mapFileName(basename)` already enforces `^[a-z0-9][a-z0-9-]*\.tour\.json$`. A base
name with no alphanumerics is refused (`name-unusable`) rather than invented,
because a map called `map-2` because the person's file was `???` is a puzzle, not
a name. A taken name becomes `-2`, `-3`, up to `-100`, and the preview lists the
names it rejected, so `main-2` is explainable.

## D4 — Import creates the file exclusively

`rename` replaces silently, and `open('wx')` can expose a half-written file to the
011 watcher. Import writes `<target>.tmp-<pid>-<time>`, then `fs.link` onto the
target and unlinks the temporary. `EEXIST` means the name was taken between
preview and write: the next free name is computed again, three times, then
`name-exhausted`. This is the only reason an import can never lose an existing
map.

## D5 — Losses are counted by the reader that writes, and confirmed with numbers

The preview and the write call the same `normalizeDocument`, so the numbers the
person confirms are the numbers that decide the write. When any counter is above
zero the import refuses with `losses-not-accepted` unless `acceptLosses` is true,
and the refusal carries the counts in `detail` — a second confirmation cannot show
different numbers from the first.

Unknown waypoint types are dropped on import (`normalizeDocument(..., {
dropUnknownTypes: true })`): the interface substitutes `Open Question`, but an
import is a moment to decide, not to quietly re-type someone's map.

## D6 — An oversized map is imported, not refused

Above 250 waypoints or 40 tours the product already warns that it is beyond what
it is built for. Refusing the import would strand a map that opens fine. The
preview says `tooBig`, the write proceeds, the notice appears on the map.

## D7 — Export copies bytes

No parse, no re-serialisation. A map the person hand-edited keeps its layout, and
content the reader would drop travels in the copy because the copy never looks at
it. When the project folder is unreachable the source is the last known copy
under `~/.ctour/cache/<projectId>/`, and the result says `last-known`.

## D8 — Export never replaces

The destination is a folder, so a file with that name may be somebody's earlier
snapshot. The copy takes the next free name and reports it in `skipped`. Contrast
with `ctour workspace export`, which replaces the file the person named on the
command line: there the destination is a file they chose, not a folder they
pointed at.

## D9 — A set is the single-file path iterated

`all: true` and the folder import loop the single-map functions. A map that fails
becomes a `skipped` entry with its sentence and the rest proceed, so one broken
file cannot abort a move. Importing a folder skips a file whose derived name is
already in the project (that is what "already there" means for a set), while a
single import suffixes instead — the person chose one file and expects it to
arrive.

## D10 — The workspace bundle is one versioned JSON with names, not ids

`version`, `exportedAt`, `projects`, `lastView`, `maps`, in that order, two-space
indent, so two exports differ only in `exportedAt`. Projects are recorded by name
and path; ids are minted on the importing machine with `uniqueId`, which is the
only way a bundle can arrive where `atlas` is already taken. Maps are keyed
`"<project>/<file>"` and stored verbatim: a bundle is a carrier, not a validator.

## D11 — The bundle is a command, not a screen

It runs on a machine whose interface is not running, and it has to be scriptable:
`ctour workspace export|import`, decisions as flags (`--project name=folder`,
`--skip name`), never a terminal prompt. The interface keeps the per-map work,
where a preview is worth showing.

## D12 — Missing folders are left out, never guessed

Per project, in order: `--skip`, then already registered at the recorded folder,
then add at the recorded folder, then the folder named by `--project`, then the
recorded folder with the unusable flag reported as ignored, then `missing-folder`
with the exact command to rerun. Nothing is created and nothing is deleted; a
project that cannot be matched stays out and is named.

## D13 — The folder always beats the bundle

A travelled copy is written to the cache only when the project folder does not
hold that file and the cache does not already have it. If the folder is there, it
is the truth; a cache entry would only be a stale shadow of it.

## D14 — The last view is restored only when it can be opened

Restored when its project ended up registered and the map is in the folder or in
the cache. Otherwise the current last view is kept and the line says
`kept: atlas/main.tour.json is not in that project`, so the person is not sent to
a map that does not exist.

## D15 — Every path is checked against `$HOME` before any read or write

`assertInsideHome` on both sides of every operation, and the destination folder
must already exist — the product never creates a folder to write into. A refusal
is a sentence naming the file and the reason, and it happens before the first
write, so a refusal leaves the folder byte-identical.

## D16 — One place per action

The map carries one action bar (`MapActions`) with "Save a copy" and "Export all
maps"; the rail and the empty project carry one entry point, "Bring in maps".
Duplicated controls were a stated dislike, and the set case is the single case
reached differently, not a second screen.
