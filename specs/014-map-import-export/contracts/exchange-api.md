# Contract — exchange routes

Three routes under `/api/exchange/`, plus one extended browse mode. All of them
are local, unauthenticated for the same reason the rest of the interface is: the
server binds `127.0.0.1` and nothing outside the machine can reach it.

Error envelope is the product's existing one:

```json
{ "error": "<code>", "message": "One sentence." }
```

`message` is shown to the person verbatim. Codes are stable; sentences may be
edited for tone but never lose the file name they mention.

---

## `GET /api/exchange/preview`

Two forms, distinguished by which query parameter is present.

### Single file

```
GET /api/exchange/preview?path=/home/me/Downloads/Q3%20Roadmap.tour.json&projectId=atlas
```

**200**

```json
{
  "path": "/home/me/Downloads/Q3 Roadmap.tour.json",
  "file": "Q3 Roadmap.tour.json",
  "name": "q3-roadmap.tour.json",
  "displayName": "q3-roadmap",
  "waypoints": 8,
  "links": 6,
  "tours": 1,
  "dropped": {
    "droppedWaypoints": 0,
    "droppedEdges": 0,
    "droppedStops": 0,
    "droppedPaths": 0,
    "unknownTypes": 2
  },
  "tooBig": false,
  "taken": ["q3-roadmap.tour.json"],
  "refusal": null
}
```

**200 with a refusal** — the request was understood, the file cannot become a
map. The person still sees the sentence; nothing is written.

```json
{
  "path": "/home/me/Downloads/notes.json",
  "file": "notes.json",
  "name": null,
  "displayName": null,
  "refusal": { "code": "not-a-map", "text": "notes.json is not a map." }
}
```

**400** `invalid-request` when `path` or `projectId` is missing.

### Folder

```
GET /api/exchange/preview?folder=/home/me/old-project/.ctour&projectId=beacon
```

**200**

```json
{
  "folder": "/home/me/old-project/.ctour",
  "entries": [
    { "file": "main.tour.json", "name": "main.tour.json", "waypoints": 12, "links": 15, "tours": 3, "dropped": { … }, "tooBig": false, "taken": [], "refusal": null },
    { "file": "backend.tour.json", "name": "backend.tour.json", "waypoints": 4, "links": 2, "tours": 0, "dropped": { … }, "tooBig": false, "taken": [], "refusal": null }
  ],
  "refused": [
    { "file": "notes.json", "name": null, "refusal": { "code": "not-a-map", "text": "notes.json is not a map." } }
  ]
}
```

Only `*.json` files are listed — a folder of code must not produce a list of
refusals for every `.ts` file. Subfolders are not descended.

**Guarantees**

1. The preview writes nothing.
2. The counts come from `normalizeDocument`, the same reader that will perform
   the write.
3. `name` is free against the project's current `.ctour/` listing at the moment
   of the preview; the import re-checks and suffixes again if it is not.
4. A file whose base name yields no slug carries `name-unusable`.
5. A path outside `$HOME` is `403 outside-home`, not a preview with a refusal —
   the request is refused, not the file.

---

## `POST /api/exchange/export`

```json
{ "projectId": "atlas", "mapFile": "main.tour.json", "folder": "/home/me/copies" }
```

or, for the whole project:

```json
{ "projectId": "atlas", "all": true, "folder": "/home/me/copies" }
```

**200**

```json
{
  "source": "project",
  "written": [{ "file": "main.tour.json", "path": "/home/me/copies/main.tour.json" }],
  "skipped": []
}
```

**200, destination already holds the name**

```json
{
  "source": "project",
  "written": [{ "file": "main-2.tour.json", "path": "/home/me/copies/main-2.tour.json" }],
  "skipped": [
    { "file": "main.tour.json", "text": "main.tour.json was already in that folder, so the copy is main-2.tour.json." }
  ]
}
```

**200, project folder unreachable**

```json
{
  "source": "last-known",
  "written": [{ "file": "main.tour.json", "path": "/home/me/copies/main.tour.json" }],
  "skipped": []
}
```

**Refusals**

| Status | Code                  | When                                                             |
| ------ | --------------------- | ---------------------------------------------------------------- |
| 400    | `invalid-request`     | no `projectId`, neither `mapFile` nor `all`, or `folder` missing |
| 403    | `outside-home`        | the folder or the project is outside `$HOME`                     |
| 404    | `unknown-project`     | the project id is not registered                                 |
| 404    | `unknown-map`         | the map file is not in the project and not in the cache          |
| 409    | `target-not-folder`   | the destination does not exist or is not a folder                |
| 409    | `target-not-writable` | the destination cannot be written                                |

**Guarantees**

1. The written bytes are the bytes of the source file — no parse, no
   re-serialisation, formatting preserved exactly (D7).
2. An existing file in the destination is never replaced; the next free name is
   used and reported in `skipped` (D8).
3. With `all`, a map that cannot be copied becomes a `skipped` entry and the
   others still copy.
4. `last-known` is reported only when the project's folder could not be reached;
   a reachable folder always wins over the cache.
5. Nothing in the project folder changes.

---

## `POST /api/exchange/import`

```json
{ "projectId": "atlas", "path": "/home/me/Downloads/q3.tour.json", "acceptLosses": false }
```

or, for a folder:

```json
{ "projectId": "atlas", "folder": "/home/me/old-project/.ctour", "acceptLosses": false }
```

**200, single**

```json
{
  "added": [
    { "file": "q3-roadmap.tour.json", "displayName": "q3-roadmap", "waypoints": 8, "links": 6, "tours": 1, "dropped": { … }, "tooBig": false, "source": "file" }
  ],
  "skipped": []
}
```

**409, losses not accepted**

```json
{
  "error": "losses-not-accepted",
  "message": "q3-roadmap would lose 2 waypoints.",
  "detail": "{\"dropped\":{\"droppedWaypoints\":2,\"droppedEdges\":0,\"droppedStops\":0,\"droppedPaths\":0,\"unknownTypes\":2}}"
}
```

`detail` is a JSON string carrying the exact counts the dialog already showed, so
a second confirmation cannot show different numbers.

**200, folder**

```json
{
  "added": [{ "file": "main.tour.json", … }],
  "skipped": [
    { "file": "main.tour.json", "text": "main.tour.json is already in this project." },
    { "file": "notes.json", "text": "notes.json is not a map." }
  ]
}
```

**Refusals**

| Status | Code                  | When                                        |
| ------ | --------------------- | ------------------------------------------- |
| 400    | `invalid-request`     | no `projectId`, neither `path` nor `folder` |
| 403    | `outside-home`        | the source is outside `$HOME`               |
| 404    | `unknown-project`     | the project id is not registered            |
| 409    | `project-unavailable` | the project folder cannot be reached        |
| 409    | `losses-not-accepted` | losses exist and `acceptLosses` is false    |
| 409    | `name-exhausted`      | `-2` … `-100` are all taken                 |

A file that cannot become a map is **not** a 4xx for a single import: it returns
200 with `added: []` and one `skipped` entry carrying the sentence, because the
dialog already explained it and the person confirmed a screen that said so. This
keeps the route's failure signal for states the person could not see.

**Guarantees**

1. Nothing is written until every refusal check has passed.
2. The written name is checked again at write time; a name taken in the meantime
   gets the next free one rather than failing (D4).
3. `project-unavailable` writes nothing, including no cache entry.
4. The imported document is written through `serializeDocument` and
   `validateDocument` — the same pair the interface uses.
5. After a successful import the map is present in `.ctour/` and the list stream
   (011) announces it within one second.

---

## `GET /api/workspace/browse?mode=files`

Existing behaviour is unchanged when `mode` is absent or `folders`.

With `mode=files`, the response gains file entries:

```json
{
  "path": "/home/me/Downloads",
  "parent": "/home/me",
  "entries": [
    { "name": "atlas", "isProject": true, "kind": "folder" },
    { "name": "q3-roadmap.tour.json", "isProject": false, "kind": "file", "size": 8123 }
  ]
}
```

Files listed are those matching `*.json` and not starting with a dot. A folder
entry keeps `kind: "folder"`. The first call with no `path` starts at the home
folder, as today.
