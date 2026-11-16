# Phase 1 Data Model: Application Shell

Three storage levels, each with one owner:

| Level              | Lives in                            | Owned by                     | Survives               |
| ------------------ | ----------------------------------- | ---------------------------- | ---------------------- |
| Workspace registry | `~/.ctour/workspace.json`           | the application, per machine | restarts               |
| Map document       | `<project>/.tours/<name>.tour.json` | the project repository       | restarts, git, cloning |
| Session state      | memory, plus a stored view tuple    | the running application      | the session only       |

## 1. Workspace registry (`~/.ctour/workspace.json`)

```jsonc
{
  "version": 1,
  "projects": [
    {
      "id": "cognitive-tours-forge",
      "path": "/home/ada/code/cognitive-tours-forge",
      "name": "cognitive-tours-forge",
      "addedAt": "2026-11-16T09:12:00.000Z",
    },
  ],
  "lastView": {
    "projectId": "cognitive-tours-forge",
    "mapFile": "main.tour.json",
    "tourId": "t-1",
    "step": 2,
  },
}
```

Rules:

- `id`: slug of the directory name, made unique by appending `-2`, `-3` when a
  collision occurs. Immutable once assigned, so a stored `lastView` keeps
  pointing at the same project after a rename.
- `path`: absolute, normalised, no trailing separator. Re-validated on every
  read; it is the only field that may change outside the application.
- `name`: display name, defaults to the directory's base name; editable.
- `lastView`: optional. `step` is zero-based; clamped to the tour's stop count
  on restore.
- Written atomically (temporary file plus rename) for the same reason as a map.
- A registry that fails to parse is not overwritten. It is renamed to
  `workspace.json.corrupt-<timestamp>` and an empty registry starts, with the
  loss reported in the interface.

## 2. Map document (`<project>/.tours/<name>.tour.json`)

```jsonc
{
  "version": 1,
  "project": { "name": "cognitive-tours-forge", "createdAt": "2026-11-16T09:12:00.000Z" },
  "waypoints": [
    {
      "id": "w-need-understand",
      "label": "Understanding is the deliverable",
      "type": "User Need",
      "description": "...",
      "notes": "...",
      "file": "README.md",
      "position": { "x": 120, "y": 80 },
    },
  ],
  "edges": [{ "id": "e-1", "source": "w-a", "target": "w-b", "label": "requires" }],
  "tours": [
    {
      "id": "t-1",
      "name": "Why this exists",
      "description": "...",
      "author": "ada",
      "updatedAt": "2026-11-16T09:12:00.000Z",
      "stops": [{ "waypointId": "w-need-understand", "narrative": "..." }],
    },
  ],
}
```

Rules and validation:

| Field                        | Rule                                              | Violation                                                            |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `version`                    | Integer, currently `1`                            | Unreadable; the interface offers no write                            |
| `waypoints[].id`             | `w-` prefix, unique within the document, stable   | Rejected on load with the offending id                               |
| `waypoints[].type`           | One of the ten known types                        | Unknown types load as `Open Question` and are flagged, never dropped |
| `waypoints[].file`           | Repo-relative POSIX path; no leading `/`, no `..` | Ignored, with a warning, when absolute                               |
| `waypoints[].position`       | Finite numbers                                    | `NaN` or missing becomes `{0,0}`                                     |
| `edges[].source` / `target`  | Must name existing waypoints                      | Edge is dropped and counted in the load report                       |
| `tours[].stops[].waypointId` | Must name an existing waypoint                    | Stop is dropped and counted                                          |
| `tours[].stops`              | Order is meaningful; the array is not sorted      | Preserved exactly as authored                                        |
| Collections                  | Serialised sorted by `id`, except `stops`         | Enforced on write                                                    |

Create-map result: a document with `version: 1`, a `project` block and three
empty arrays. The file name is `<slug>.tour.json`, slug derived from the display
name, uniqueness enforced against the directory listing.

## 3. Session state

### Map store (one instance per open map)

```ts
interface MapState {
  document: MapDocument | null;
  status: 'empty' | 'loading' | 'ready' | 'failed';
  failure: { message: string; retryable: boolean } | null;
  selectedWaypointId: string | null;
  saveStatus: 'idle' | 'pending' | 'saved' | 'failed';
}
```

Temporal scope (`partialize`): `document` only. Selection, status and save state
are excluded — they are not edits.

### History entry

| Attribute      | Rule                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Granularity    | One entry per committed change: a field edit committed on pause, a drag committed on drop, a create, a delete, a reorder |
| Limit          | 50 entries; the oldest is dropped past the limit                                                                         |
| Position       | A cursor between entries; stepping back moves it left, forward moves it right                                            |
| Branch discard | A new change while the cursor is not at the end discards everything to its right                                         |
| Scope          | Per map, per session; cleared when another map opens and never persisted                                                 |

### View tuple (`lastView`)

`projectId`, `mapFile`, `tourId`, `step`. Written on every navigation. On launch
it is applied as a redirect; a value that no longer resolves (renamed file,
deleted tour) degrades one level at a time — stop, then tour, then map — and
never blocks the launch.

## 4. Entities and relationships

```text
Workspace 1 ── n Project 1 ── n Map 1 ── n Tour 1 ── n Stop ──> 1 Waypoint
                              └── n Waypoint 1 ── n Edge ──> 2 Waypoint
```

| Entity    | Identity                    | Lifecycle                                                                |
| --------- | --------------------------- | ------------------------------------------------------------------------ |
| Workspace | one per machine             | created on first launch                                                  |
| Project   | `id` slug, immutable        | added by choosing a location; removed explicitly; may become unavailable |
| Map       | file name inside `.tours/`  | created empty, renamed with the file, removed with the file              |
| Tour      | `id` in the document        | created, renamed, reordered, deleted                                     |
| Waypoint  | `id` in the document        | created, edited, moved, deleted                                          |
| Edge      | `id` in the document        | created, relabelled, deleted                                             |
| Stop      | position in `tours[].stops` | created, reordered, deleted                                              |

## 5. State transitions

### Project availability

```text
unavailable ──(location resolves)──> ready
   ready      ──(directory missing)──> unavailable
unavailable ──(person picks a new location)──> ready
```

- `unavailable` is a display state, not a deletion. The project keeps its
  registry entry and opens read-only from the last cached document.
- `ready` requires the directory to exist and be readable. An unreadable
  directory is `unavailable`, not `failed`.

### Surface state

```text
loading ──> ready
loading ──> failed
failed  ──(retry)──> loading
empty   ──(create map)──> ready
```

Each surface (workspace, project, map) resolves independently: a workspace can
be `ready` while one project is `unavailable` and another map is `failed`.

### Map document

```text
absent ──(create)──> empty document ──(load)──> loaded
loaded ──(edit)──> dirty ──(autosave pause)──> saving ──> saved
                                              └──(failure)──> save failed ──(retry)──> saving
```

A `save failed` state keeps the person's text in the store and shows one action:
retry. It never discards the edit.

## 6. Where each spec requirement is modelled

| Requirement            | Modelled as                                               |
| ---------------------- | --------------------------------------------------------- |
| FR-004, FR-005, FR-006 | token set per theme, contrast pairs in `tokens.ts`        |
| FR-007, FR-008, FR-009 | registry `projects`, `.tours/` listing, `lastView`        |
| FR-010, FR-011         | project `availability` and its transitions                |
| FR-018 to FR-023       | history entry and its rules                               |
| FR-024, FR-025         | load report (counts of dropped edges and stops, map size) |
| FR-026, FR-027         | `POST /api/workspace`, `POST /api/workspace/[id]/maps`    |
| FR-029                 | `lastView` and the launch redirect                        |
