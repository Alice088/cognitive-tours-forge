# Contract — `ctour workspace`

Two subcommands that carry the machine's workspace as one file. They follow the
`ctour` conventions from 012: no prompts, one line per fact, exit codes 0–5, the
same help style.

```
ctour workspace export [file] [--json]
ctour workspace import <file> [--project <name>=<folder>]… [--skip <name>]… [--json]
```

`export` with no `file` writes `ctour-workspace.json` in the current folder.

---

## `ctour workspace export`

Writes one JSON document (shape in `data-model.md` § Bundle).

```
$ ctour workspace export ~/move/workspace.json
ctour 0.1.0
wrote /home/me/move/workspace.json
3 projects, 6 maps, last view atlas/main.tour.json
```

With `--json`:

```json
{
  "path": "/home/me/move/workspace.json",
  "projects": 3,
  "maps": 6,
  "lastView": "atlas/main.tour.json"
}
```

**Behaviour**

1. The workspace is read with `readRegistryWithNotice`; a damaged registry that
   was renamed is reported on the line above the result
   (`recovered from workspace.json.corrupt-…`) and the export still proceeds with
   an empty list, because a bundle of what is left is better than no bundle.
2. Every map the machine has a last known copy of is included verbatim from
   `~/.ctour/cache/<projectId>/`. A project with no cached maps contributes no
   `maps` entries.
3. The file is written atomically (temporary then rename) and with two-space
   indentation.
4. An existing destination file is replaced: this is the person's own file, named
   by them, in a command they typed. (Contrast with map export, where the
   destination is a folder and the product adds rather than replaces.)
5. The destination folder must exist; it is not created.

**Exit codes**

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| 0    | written                                                                   |
| 2    | usage: too many arguments, unknown flag, missing `--project` value        |
| 3    | the destination is outside `$HOME`, is not a folder, or cannot be written |

---

## `ctour workspace import`

```
$ ctour workspace import ~/move/workspace.json
ctour 0.1.0
added      atlas      /home/me/atlas        4 maps
added      beacon     /home/me/beacon       2 maps
skipped    zenith     no folder at /Users/old/zenith
                      rerun with --project zenith=/path/to/zenith
last view  atlas/main.tour.json
2 projects added, 6 maps copied, 1 left out
```

Exit code `1` when at least one project was left out (missing folder or
`--skip`), `0` when every project was added or already present, `2` for usage,
`3` for a bundle that cannot be read or was written by a newer version.

With `--json`:

```json
{
  "added": 2,
  "alreadyAdded": 0,
  "missing": 1,
  "skipped": 0,
  "mapsWritten": 6,
  "lastViewApplied": true,
  "projects": [
    { "name": "atlas", "action": "add", "folder": "/home/me/atlas", "text": "added, 4 maps" },
    { "name": "beacon", "action": "add", "folder": "/home/me/beacon", "text": "added, 2 maps" },
    { "name": "zenith", "action": "missing-folder", "folder": null, "text": "no folder at /Users/old/zenith" }
  ]
}
```

**Decisions** (from `research.md` D12, applied in this order)

1. `--skip zenith` → `skipped`, nothing written for it.
2. recorded folder usable and already registered → `already-added`.
3. recorded folder usable → `add`.
4. `--project zenith=/home/me/zenith` usable → `relink`.
5. recorded folder usable but a flag was given → `add`, and a second line reports
   the flag as ignored.
6. otherwise → `missing-folder`, with the rerun hint on the next line.

"Usable" = exists, is a directory, resolves inside `$HOME`, is writable — the
four checks `cli/lib/target.ts` already applies.

**Maps**

- A travelled map is written to the cache **only when the project folder does not
  hold that file**. The folder always wins (D13).
- Cached maps appear read-only in the interface until the folder is found, which
  is the existing behaviour of an unavailable project.
- `mapsWritten` counts cache entries actually written.

**Last view**

Restored when its project ended up registered and the map file exists in the
folder or in the cache. Otherwise the current last view is kept and the line
says so:

```
last view  kept: atlas/main.tour.json is not in that project
```

**Idempotency**

Running the same import twice: the second run reports every project as
`already-added`, `mapsWritten: 0`, and exits 0.

**Exit codes**

| Code | Meaning                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 0    | every project added or already present                                                                   |
| 1    | at least one project left out                                                                            |
| 2    | usage                                                                                                    |
| 3    | bundle missing / unreadable / not JSON / wrong shape / version above 1, or a destination outside `$HOME` |

---

## Guarantees

1. **No prompts.** Decisions are flags; nothing reads from the terminal.
2. **Nothing is deleted.** Import adds projects and cache entries; it never
   removes a project or overwrites a map.
3. **IDs are minted locally.** A bundle carries names and paths; project ids are
   produced with `uniqueId` on import, so an id collision with an existing
   project cannot happen.
4. **The bundle is data, not code.** It is parsed as JSON and every field is
   type-checked before use; a `text` value is printed as data, never executed.
5. **No network.** The bundle moves by hand.
6. **`status` stays the source of truth for what the machine knows**, and it is
   what a person runs after the import to see the result through a different
   surface.
