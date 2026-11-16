# Phase 1 — Data model: Maps in and out

All shapes below are additive. `MapDocument`, `MapRef`, `ProjectSummary` and
`ViewState` keep their current meaning (`app/lib/workspace/types.ts`); the map
format and its version do not change.

---

## Entities

### MapDocument (existing, unchanged)

```ts
{
  version: 1;
  project: { name: string; createdAt?: string };
  waypoints: Waypoint[];
  edges: Edge[];
  tours: Tour[];
}
```

The unit that travels. Its file name is its name, its `version` is compared
exactly, and everything in it is relative to the project root.

### Map copy

A file written by export. Not a new type: it is the bytes of a `MapDocument`
file placed at `<destinationFolder>/<name>.tour.json`. What distinguishes it is
where it is, not what it holds.

### ImportPreview

What the dialog shows, and the only thing the person consents to.

```ts
{
  path: string;            // absolute source path inside $HOME
  file: string;            // source base name, e.g. "Q3 Roadmap.tour.json"
  name: string;            // file name it will get, e.g. "q3-roadmap.tour.json"
  displayName: string;     // "q3-roadmap"
  waypoints: number;
  links: number;
  tours: number;
  dropped: {
    droppedWaypoints: number;
    droppedEdges: number;
    droppedStops: number;
    droppedPaths: number;
    unknownTypes: number;
  };
  tooBig: boolean;         // >250 waypoints or >40 tours
  taken: string[];         // names already in the project that forced a suffix
  refusal?: { code: ImportRefusalCode; text: string };
}
```

Rules:

- `name` is `mapFileName(basename(file))`, then suffixed `-2`, `-3`, … until
  free against the project's current `.ctour/` listing. `taken` lists the names
  that were rejected on the way, so the preview can say _why_ it is `-2`.
- `displayName` is `mapDisplayName(name)`.
- `refusal` is set instead of the counts when the source cannot become a map.
  A preview with a refusal offers no confirm button.
- `dropped` mirrors `LoadReport`'s counters minus `waypointCount`; the sum of the
  five is the number the person is asked to confirm.

### ImportRefusalCode

| Code                   | When                                            | Sentence                                                      |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `outside-home`         | the path is not inside `$HOME`                  | That file is outside your home folder.                        |
| `not-found`            | nothing at that path                            | There is no file at that path.                                |
| `not-a-file`           | a folder was given to a single import           | That is a folder, not a map file.                             |
| `unreadable-file`      | the read failed                                 | That file cannot be read.                                     |
| `not-json`             | the text is not JSON                            | That file is not a map.                                       |
| `not-a-map`            | JSON, but `normalizeDocument` rejects the shape | That file is not a map.                                       |
| `map-version`          | `version` is not 1                              | That map was written in a version this product does not read. |
| `name-unusable`        | the base name yields no slug                    | That file name cannot become a map name.                      |
| `name-exhausted`       | `-2` … `-100` are all taken                     | There is no free name left for that map in this project.      |
| `project-unavailable`  | the project folder cannot be reached            | That project folder cannot be reached.                        |
| `losses-not-accepted`  | losses exist and `acceptLosses` is false        | This map would lose 2 waypoints. Confirm to write the rest.   |
| `target-exists-folder` | the destination is not a folder                 | That is not a folder.                                         |

`not-json` and `not-a-map` are separated because the person can act on them
differently: the first says the file is broken, the second says it is a
different kind of file. Both are one sentence naming the file.

### ImportResult

```ts
{
  file: string; // written file name
  displayName: string;
  waypoints: number;
  links: number;
  tours: number;
  dropped: ImportPreview['dropped'];
  tooBig: boolean;
  source: 'file';
}
```

Returned by the import route and used verbatim in the announcement:
`Imported q3-roadmap: 8 waypoints, 3 links, 2 tours.`

### FolderPreview / FolderResult

```ts
{
  folder: string;
  entries: ImportPreview[];                     // every *.json the folder holds
  refused: ImportPreview[];                     // entries whose preview carries a refusal
}
```

A set import writes each non-refused entry through the single-map path.
`FolderResult` is `{ added: ImportResult[]; skipped: { file: string; text: string }[] }`.
`skipped` holds both refusals and names taken at write time, each with the one
sentence that explains it.

### ExportRequest / ExportResult

```ts
// request to POST /api/exchange/export
{ projectId: string; mapFile?: string; all?: boolean; folder: string }

// result
{
  source: 'project' | 'last-known';
  written: { file: string; path: string }[];   // file = the name actually used
  skipped: { file: string; text: string }[];
}
```

`source` is `last-known` when the project folder could not be reached and the
copies came from `~/.ctour/cache/<projectId>/`. It travels to the announcement:
`Saved main.tour.json to ~/copies (last known version).`

### Bundle

The workspace file. One JSON document, written by the command.

```ts
{
  version: 1;
  exportedAt: string;                 // informational only
  projects: { name: string; path: string; addedAt: string }[];
  lastView: { project: string; mapFile: string; tourId: string | null; step: number } | null;
  maps: Record<string, MapDocument>;  // "<projectName>/<file>"
}
```

Rules:

- `version` is compared exactly; anything above 1 is refused (`bundle-version`)
  and anything below is read.
- `projects[].name` is the registry's `name`, not the id. Ids are rebuilt on
  import with `uniqueId`.
- `projects[].path` is the recorded absolute path on the exporting machine.
- `maps` holds the last known copies, verbatim, including documents the reader
  would drop content from — a bundle is a carrier, not a validator.
- `lastView` is `null` when the exporting machine had none.
- Key order is fixed (`version`, `exportedAt`, `projects`, `lastView`, `maps`)
  and the file is written with two-space indentation, so two exports of the same
  workspace differ only in `exportedAt`.

### BundlePlan / BundleResult

```ts
type ProjectAction = 'add' | 'already-added' | 'relink' | 'missing-folder' | 'skipped' | 'ignored-flag';

type BundlePlan = {
  projects: { name: string; action: ProjectAction; folder: string | null; text: string }[];
  mapsToCache: { project: string; file: string }[];
  lastView: { project: string; mapFile: string } | null;
};

type BundleResult = BundlePlan & {
  added: number;
  alreadyAdded: number;
  missing: number;
  skipped: number;
  mapsWritten: number;
  lastViewApplied: boolean;
};
```

Decisions inside the plan, in order, per project (D12):

1. `--skip <name>` → `skipped`.
2. recorded folder usable and already registered (by `realpath`) → `already-added`.
3. recorded folder usable → `add`.
4. `--project <name>=<folder>` usable → `relink`.
5. recorded folder usable but the flag was given → `add`, and the flag is
   reported as `ignored-flag` in a second line for that project.
6. otherwise → `missing-folder`.

"Usable" means: exists, is a directory, resolves inside `$HOME`, and is writable
(`fs.access(W_OK)`), the four conditions `cli/lib/target.ts` already applies.

### BundleRefusalCode

| Code                | When                                                            |
| ------------------- | --------------------------------------------------------------- |
| `bundle-missing`    | the file does not exist                                         |
| `bundle-unreadable` | cannot be read                                                  |
| `bundle-not-json`   | not JSON                                                        |
| `bundle-shape`      | JSON without `version`, `projects` or `maps` of the right types |
| `bundle-version`    | `version` above 1                                               |
| `outside-home`      | the destination or source path is outside `$HOME`               |
| `target-not-folder` | the export destination is not a folder                          |

---

## State and flow

**Single import** (one file):

```text
chosen path ──▶ preview ──▶ refusal? ──yes──▶ nothing written, sentence shown
                    │
                    no
                    ▼
        losses > 0 or tooBig? ──yes──▶ confirmation carries the counts
                    │                        │
                    no                       confirmed
                    ▼                        ▼
                 write (exclusive create, retry next free name)
                                      │
                          EEXIST ×3? ──yes──▶ name-exhausted, nothing written
                                      no
                                      ▼
                          cache written, rail refreshed, map opened
```

**Folder import** is the same flow per entry; entries never abort each other.

**Export** has no confirmation beyond the folder choice: it is a copy, and the
destination is a folder the person named. It reports what it wrote.

**Bundle import** is a plan then an apply: the plan is computed from the file and
the flags, printed (or returned as JSON), and applied in one pass. Applying is
idempotent — a second run recomputes the same plan and lands on `already-added`
for every project that was added the first time.

---

## Validation rules

- Every destination and source path is resolved and checked against `$HOME`
  before any read or write (`isWithinHome`, `resolveInside`).
- A written map name matches `^[a-z0-9][a-z0-9-]*\.tour\.json$` — enforced by
  `writeMapIfAbsent` through `mapPath`, not by the caller.
- A map is written only through `serializeDocument(document)` of a document that
  passed `normalizeDocument` and `validateDocument`.
- A bundle is written only through `JSON.stringify(bundle, null, 2)` and read
  only through the shape check in `parseBundle`.
- Cache entries are written only through `writeCachedMap`, which already
  restricts both the project id and the file name.
- Nothing in this feature deletes a file.

## Invariants

1. **Export changes nothing in the project.** It reads and writes elsewhere; the
   only project write in this feature is the autosave flush that precedes it.
2. **Import never replaces.** Exclusive create plus free-name retry means an
   existing map is untouched in every path, including failure.
3. **A refusal leaves the folder identical.** Every refusal is returned before
   the first write, or after a `link` that did not happen.
4. **The folder beats the bundle.** A travelled copy never overwrites a map the
   project folder holds.
5. **Ids are local.** A bundle carries names and paths; ids are minted here.
