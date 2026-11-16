# Contract: Local Workspace API

Loopback-only route handlers used by the shell. No authentication, because the
application listens on localhost for one person; no endpoint accepts a path from
outside the machine.

Every response is JSON. Every failure is `{ "error": "<code>", "message":
"<plain language>", "detail"?: "<technical>" }` with the codes below. Messages
are shown to the person verbatim, so they must be sentences without jargon.

## GET `/api/workspace`

Returns the registry with availability resolved for each project.

```jsonc
{
  "projects": [
    {
      "id": "cognitive-tours-forge",
      "name": "cognitive-tours-forge",
      "path": "/home/ada/code/cognitive-tours-forge",
      "availability": "ready",
      "maps": [{ "file": "main.tour.json", "name": "main" }],
      "error": null,
    },
  ],
  "lastView": { "projectId": "cognitive-tours-forge", "mapFile": "main.tour.json", "tourId": "t-1", "step": 2 },
}
```

- `availability`: `ready` | `unavailable` | `uninitialised`.
  `uninitialised` means the directory exists but holds no `.tours/` directory.
- `maps` is empty for `unavailable`; for `uninitialised` it is empty and the
  project row offers "Create map".
- Listing maps reads directory entries only. It never parses a map document.

## POST `/api/workspace`

Adds a project. Body: `{ "path": "<absolute path>" }`.

| Outcome                                          | Status | Code                                               |
| ------------------------------------------------ | ------ | -------------------------------------------------- |
| Added                                            | `201`  | — returns the project with `availability`          |
| Path does not exist or is not a directory        | `400`  | `not-a-directory`                                  |
| Path is not readable                             | `403`  | `not-readable`                                     |
| Path already registered                          | `409`  | `already-registered`, with the existing project id |
| Path is inside the application's own source tree | `400`  | `refused-self`                                     |

Side effect: absorbs the directory into the registry. It does not create
`.tours/`; that happens on "Create map".

## GET `/api/workspace/browse?path=<absolute>`

Directory listing for the project picker.

```jsonc
{
  "path": "/home/ada/code",
  "parent": "/home/ada",
  "entries": [{ "name": "cognitive-tours-forge", "isProject": true }],
}
```

- Directories only. Files are omitted; the picker chooses a directory.
- `isProject` is true when `.tours/` exists, so the person can recognise a
  repository that already holds maps.
- `parent` is `null` at the filesystem root.
- Unreadable directories are omitted rather than reported, so one permission
  error does not stop browsing.
- Body is never returned for a path outside the person's home directory tree
  unless it is an ancestor of `$HOME`; `403 outside-home`.

## POST `/api/workspace/[projectId]/maps`

Creates an empty map. Body: `{ "name": "<display name>" }`.

| Outcome                   | Status | Code                                       |
| ------------------------- | ------ | ------------------------------------------ |
| Created                   | `201`  | — returns `{ "file": "<slug>.tour.json" }` |
| Name empty after slugging | `400`  | `invalid-name`                             |
| Name already used         | `409`  | `name-taken`                               |
| Project unavailable       | `409`  | `project-unavailable`                      |

Creates `.tours/` when absent. Writes the document described in
`contracts/map-file.md` atomically.

## GET `/api/maps/[projectId]/[mapFile]`

Returns the parsed document plus a load report.

```jsonc
{
  "document": { "...": "see data-model.md" },
  "report": { "droppedEdges": 1, "droppedStops": 0, "unknownTypes": 2, "waypointCount": 214 },
}
```

| Outcome                           | Status | Code             |
| --------------------------------- | ------ | ---------------- |
| Read                              | `200`  | —                |
| File missing                      | `404`  | `map-missing`    |
| Invalid JSON or unknown `version` | `422`  | `map-unreadable` |
| Escapes the project root          | `400`  | `path-escape`    |

A document with recoverable problems still returns `200` and reports them; only
unreadable documents fail. The interface shows recoverable problems once, as a
dismissible note, and never blocks editing.

## PUT `/api/maps/[projectId]/[mapFile]`

Replaces the document. Body: `{ "document": { ... } }`. Returns
`{ "savedAt": "<ISO>", "waypointCount": n }`.

| Outcome                                           | Status | Code                                               |
| ------------------------------------------------- | ------ | -------------------------------------------------- |
| Saved                                             | `200`  | —                                                  |
| Validation failure                                | `422`  | `invalid-document`, with `detail` naming the field |
| File changed on disk since the client's last read | `409`  | `stale-document`                                   |
| Escapes the project root                          | `400`  | `path-escape`                                      |

`stale-document` is the guard against overwriting an edit made outside the
application. The client resolves it by showing "This map changed on disk" with
two actions: reload, or overwrite. It never resolves the conflict silently.

## GET / PUT `/api/workspace/view-state`

```jsonc
{ "projectId": "cognitive-tours-forge", "mapFile": "main.tour.json", "tourId": "t-1", "step": 2 }
```

- `PUT` requires all four keys; `step` may be `0`.
- A value that no longer resolves is stored anyway and degraded at read time, so
  a temporarily missing project does not wipe the person's place.
- This endpoint writes the same `lastView` block as the registry; it does not
  rewrite the project list.

## Cross-cutting rules

- Every path argument is normalised and resolved before use; a path that
  resolves outside the project root (or outside `$HOME` for browsing) is refused
  with `path-escape` before any filesystem call.
- All writes are atomic: temporary file in the same directory, then rename.
- No endpoint performs network I/O.
