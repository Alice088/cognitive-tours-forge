# Data Model: One command that opens a repository's map

**Feature**: `012-ctour-cli` | **Date**: 2026-11-16

Nothing new is persisted beyond what `010` and `011` already store. The command reads two existing stores, creates one folder, and keeps everything else in memory for the lifetime of a run.

## ResolvedTarget

The result of turning what the person typed into the folder that will be registered.

| Field       | Type                         | Rules                                                                                                     |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `requested` | string                       | As typed, before any resolution                                                                           |
| `root`      | absolute path                | `realpath` of the repository root, or of the requested folder when it is not inside a repository (FR-022) |
| `source`    | `'repository'` \| `'folder'` | Which of the two rules applied; reported by `--json` and used by tests                                    |
| `mapDir`    | absolute path                | `root/.ctour`                                                                                             |
| `mapFile`   | string \| null               | The single `*.tour.json` already present in `mapDir`, if any                                              |

Validation, in this order, and the reason reported by each failure (FR-007, FR-009, FR-021):

1. The requested path exists and is a directory.
2. It is not the person's home directory — its `.ctour` would be the workspace root.
3. It resolves inside the person's home directory.
4. It is readable, and writable when a map is about to be created.

## ProjectEntry

Unchanged from `010`, defined in `app/lib/workspace/registry.ts`.

| Field     | Type          | Rules                                                                 |
| --------- | ------------- | --------------------------------------------------------------------- |
| `id`      | string        | Slug of the folder name, made unique with a numeric suffix when taken |
| `path`    | absolute path | The repository root, never a subdirectory (FR-022)                    |
| `name`    | string        | Folder name at registration time                                      |
| `addedAt` | ISO timestamp | When first registered                                                 |

Identity rule: a project is identified by its resolved path. Registering an existing path again succeeds without changing any field (FR-004); registering a different path that produces the same `id` gets a suffixed id and leaves the existing entry untouched (D7).

## Workspace

`~/.ctour/workspace.json`, `CTOUR_HOME` relocates it. Two read modes:

- **Recovering read** — used by `init` and `serve`: a file that cannot be parsed is renamed to `workspace.json.corrupt-<stamp>` and an empty workspace is returned, and the command prints that it happened.
- **Plain read** — used by `status` and `doctor`: the file is parsed and never modified; a failure is reported as a problem (FR-024).

## MapFile

Unchanged from `011`: `version`, `project`, `waypoints`, `edges`, `tours`. One addition to its location contract: the folder is `.ctour/`, and the file name is `<slug>.tour.json` produced by the existing `mapFileName`. The only writer stays `writeMap` (temporary file + rename).

## StatusRow

One line of `ctour status`.

| Field       | Type                                                  | Source                                            |
| ----------- | ----------------------------------------------------- | ------------------------------------------------- |
| `name`      | string                                                | Workspace entry                                   |
| `id`        | string                                                | Workspace entry                                   |
| `path`      | absolute path                                         | Workspace entry                                   |
| `state`     | `'ok'` \| `'missing'` \| `'unreadable'` \| `'no-map'` | Folder stat, then map read                        |
| `maps`      | number                                                | Count of `*.tour.json` in `.ctour/`               |
| `waypoints` | number                                                | Sum over maps, only when every map read succeeded |
| `tours`     | number                                                | Sum over maps, only when every map read succeeded |
| `problem`   | string \| null                                        | One sentence when `state` is not `ok`             |

Counting rule: a project with one unreadable map reports `unreadable` and `null` counts rather than a partial total (FR-015, SC-005).

## DiagnosticReport

The whole of `ctour doctor`.

| Field    | Type    | Rules                                            |
| -------- | ------- | ------------------------------------------------ |
| `checks` | Check[] | One entry per thing looked at, in a stable order |
| `ok`     | boolean | True only when every check passed                |

Check:

| Field    | Type           | Rules                                                                                          |
| -------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `id`     | string         | Stable identifier: `workspace`, `project-folder`, `project-map`, `leftover-tours`, `map-write` |
| `target` | string         | The path involved, always present                                                              |
| `ok`     | boolean        | Outcome                                                                                        |
| `reason` | string \| null | Why it failed, when known                                                                      |
| `fix`    | string \| null | The command a person can run; never executed                                                   |

Checks performed, in order (FR-016, FR-024): the workspace file parses; each registered project folder exists and is readable; each `.ctour/` is present and every map in it reads strictly; a leftover `.tours/` folder is reported once per project; `.ctour/` is writable.

## ServeSession

In-memory only, one per run.

| Field   | Type           | Rules                                                                 |
| ------- | -------------- | --------------------------------------------------------------------- |
| `port`  | number         | First free port in 4317…4346 (D5)                                     |
| `host`  | string         | Always `127.0.0.1`                                                    |
| `url`   | string         | `http://127.0.0.1:<port>` plus the map path when a project is open    |
| `child` | process handle | The standalone server, killed on interrupt within one second (FR-013) |
| `ready` | boolean        | Set only after `GET /api/workspace` answers 200                       |

## Exit codes

| Code | Meaning                                                                                                        | Used by                                         |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 0    | Success, no problems                                                                                           | all                                             |
| 1    | Problems found, nothing changed                                                                                | `doctor`, `status` with an unreadable workspace |
| 2    | Usage error: unknown command, unknown flag, missing argument                                                   | all                                             |
| 3    | Environment refusal: not a directory, outside home, home itself, not writable, workspace damaged beyond repair | `init`, `serve`                                 |
| 4    | No free address in the probed range                                                                            | `init`, `serve`                                 |

Codes are part of the contract in `contracts/cli.md`; no command uses a code outside this table.
