# Contract: `.tours/*.tour.json`

The map is the artifact this product exists for. This contract is what keeps it
portable: a map written by this feature must be readable by a person, by git,
and by the agent surface added later.

## Location

```text
<project root>/
└── .tours/
    ├── main.tour.json
    ├── backend.tour.json
    └── frontend.tour.json
```

- One file per map. The file name, minus `.tour.json`, is the map's display name
  unless the document names itself otherwise.
- A repository may hold any number of maps.
- `.tours/` is created on first map creation. It is not created when a project
  is added.
- The file is committed. It is never written to a gitignored location, never to
  `~/.ctour/`, and never outside the project root.

## Shape

```jsonc
{
  "version": 1,
  "project": { "name": "cognitive-tours-forge", "createdAt": "2026-11-16T09:12:00.000Z" },
  "waypoints": [
    {
      "id": "w-need-understand",
      "label": "Understanding is the deliverable",
      "type": "User Need",
      "description": "Optional. Absent is valid.",
      "notes": "Optional.",
      "file": "app/components/CognitiveToursApp.tsx",
      "position": { "x": 120, "y": 80 },
    },
  ],
  "edges": [{ "id": "e-1", "source": "w-a", "target": "w-b", "label": "requires" }],
  "tours": [
    {
      "id": "t-1",
      "name": "Why this exists",
      "description": "",
      "author": "ada",
      "updatedAt": "2026-11-16T09:12:00.000Z",
      "stops": [{ "waypointId": "w-need-understand", "narrative": "Optional." }],
    },
  ],
}
```

Field rules:

| Field                        | Required | Rule                                                                               |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `version`                    | yes      | `1`. A document with any other value fails to load                                 |
| `project.name`               | yes      | Non-empty string                                                                   |
| `project.createdAt`          | yes      | ISO 8601, set once                                                                 |
| `waypoints[].id`             | yes      | Starts with `w-`, unique, stable across edits                                      |
| `waypoints[].label`          | yes      | Non-empty after trimming                                                           |
| `waypoints[].type`           | yes      | One of the ten known types; anything else loads as `Open Question` and is reported |
| `waypoints[].description`    | no       | Absent is valid and renders as nothing                                             |
| `waypoints[].notes`          | no       | Same                                                                               |
| `waypoints[].file`           | no       | Repo-relative POSIX path. An absolute path is dropped and reported                 |
| `waypoints[].position`       | yes      | Two finite numbers                                                                 |
| `waypoints[].size`           | no       | Two finite positive numbers. Absent means the box grows with its label             |
| `edges[].source`, `target`   | yes      | Must name existing waypoints                                                       |
| `edges[].label`              | no       | Absent is valid                                                                    |
| `tours[].name`               | yes      | Non-empty                                                                          |
| `tours[].stops[].waypointId` | yes      | Must name an existing waypoint                                                     |
| `tours[].stops[].narrative`  | no       | Absent is valid                                                                    |
| `tours[].updatedAt`          | no       | ISO 8601, rewritten on every save of that tour                                     |

## Serialisation

- Keys in the order shown above. Object keys inside a waypoint, edge, tour and
  stop follow the order shown, for a diff a person can read.
- `waypoints`, `edges` and `tours` sorted ascending by `id` on write.
- `stops` never sorted: the order is the tour.
- Two-space indentation, `\n` line endings, one trailing newline.
- `undefined` fields are omitted, not written as `null`.
- Numbers written without trailing zeros.

Result: adding one waypoint and saving twice produces one line pair in
`git diff`, not a reshuffled file.

## Write path

1. Validate the whole document. On any failure, refuse and return
   `invalid-document` naming the field. Nothing touches disk.
2. Confirm the target resolves inside the project root; refuse with
   `path-escape` otherwise.
3. Write `<file>.tmp` in the same directory.
4. `rename` over the target.
5. Stat the result and return `savedAt`.

A crash between 3 and 4 leaves the previous map intact and a stray `.tmp`, which
the next write replaces.

## Read path

1. Resolve and confirm containment (`path-escape`).
2. Read and parse (`map-unreadable` on failure).
3. Normalise: fill missing optional fields, coerce invalid positions to `{0,0}`,
   drop orphaned edges and stops, map unknown types to `Open Question`.
4. Return the document plus a report of what was dropped or coerced.

Reading never rewrites the file. A document with problems stays as the author
left it until the person edits something.

## Compatibility

- Adding an optional field is a minor change and keeps `version: 1`.
- Removing or reinterpreting a field, or changing ordering rules, requires
  `version: 2` and a reader that still opens `version: 1`.
- The agent surface added later reads and writes this same file through the same
  module; there is no second format.
