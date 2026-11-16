# Contract: the `.ctour/` folder

**Feature**: `012-ctour-cli` | **Date**: 2026-11-16

The folder that holds maps, and the only thing this feature changes about a repository.

## Path

`.ctour/` at the repository root. Not at the folder the command was run in, not in a subdirectory, not next to `package.json` unless the two coincide (FR-022).

```
<repository root>/
└── .ctour/
    ├── <slug>.tour.json
    └── <slug>.tour.json
```

`<slug>` is the existing `mapFileName()` transformation of a human name: lower case, words joined by `-`, everything else removed, suffixed `.tour.json`. `init` derives the name from the repository folder name; the interface keeps its own naming dialogue.

## The rename

`.tours/` ceases to exist. The web application, its route handlers, its file watcher, its tests and its documentation all read `.ctour/`. The folder name has exactly one definition in code (`mapDir()` in `app/lib/workspace/map-file.ts`); every other consumer calls it, including the two literals that previously sat in `sync.ts` and one in `service.ts`.

Nothing is migrated: the product has no published installation, so no repository in the world holds a `.tours/` folder this product created. A folder that does exist is reported by `doctor` and otherwise left untouched.

## What `init` may create

| Situation                           | Effect                                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `.ctour/`, no map                | Create `.ctour/`, write one empty map, register the project                                                                                                            |
| `.ctour/` with one or more maps     | Create nothing; register the project; open the first map by name order                                                                                                 |
| `.ctour/` present but empty         | Write one empty map, register the project                                                                                                                              |
| `.ctour/` is a file                 | Refuse with exit 3, naming the path                                                                                                                                    |
| `.ctour/` not writable              | Refuse with exit 3 before writing anything                                                                                                                             |
| A map exists and holds invalid JSON | Refuse nothing: `init` does not validate an existing map, it opens it and the interface shows the unreadable state (this is a load-time concern, not an init-time one) |

Every created file is written through the existing atomic path (temporary file plus rename), so an interrupted `init` leaves either no map or a complete one.

## Ownership

- The **interface** writes maps on every save, through `PUT /api/maps/...` and the same `writeMap`.
- The **command** writes a map at most once per repository, and only when the folder holds no map.
- The **person and their agent** may write the folder by any other means; the interface follows it within a second (feature `011`).
- **Nothing** writes `.ctour/` into the workspace, the cache, or any file outside the repository.

## Committed, not ignored

`.ctour/` is repository content: it belongs in the same commit as the code it explains. No `.gitignore` entry is added for it, and no command creates one. The machine-local workspace stays outside every repository, at `~/.ctour/` (relocatable with `CTOUR_HOME`) — the two use the same name deliberately: one is the map of a project, the other is the list of projects on this machine.

## Invariants the tests hold

1. After `init`, `.ctour/` contains exactly one `*.tour.json` for a repository that had none.
2. A second `init` changes no file: the tree hash before and after is identical.
3. A map written by hand is not reformatted, reordered or re-serialised by any command.
4. `serve`, `status`, `doctor` never create `.ctour/`.
5. `grep -rn '\.tours' app tests README.md docs` finds only the leftover-folder check.
