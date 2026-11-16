# Contract: the `ctour` command

**Feature**: `012-ctour-cli` | **Date**: 2026-11-16

Everything a person or a script may rely on. Behaviour is specified in `spec.md`; this file fixes the surface.

## Synopsis

```
ctour init [folder] [--port <n>]
ctour serve [project] [--port <n>]
ctour status [--json]
ctour doctor [--json]
ctour --help
ctour --version
```

| Command     | Arguments                                      | Effect                                                                                                                                        |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`      | optional folder, default the current directory | Resolve the repository root, create `.ctour/` with one map when none exists, register the project, serve the interface, print the map address |
| `serve`     | optional project id or path                    | Serve the interface; open that project, or the workspace screen when the folder named is not a project (FR-025)                               |
| `status`    | none                                           | Print one row per registered project                                                                                                          |
| `doctor`    | none                                           | Print one check per line, exit non-zero when anything failed                                                                                  |
| `--help`    | none                                           | Print the command list and exit 0                                                                                                             |
| `--version` | none                                           | Print one line with the version and exit 0                                                                                                    |

`--port` names the first port to try. It does not change the probing range: a busy port still falls through to the next free one (FR-011).

## Output

`init`, after the server answers:

```
ctour 0.1.0
project  cognitive-tours-forge
folder   /home/me/code/cognitive-tours-forge
map      .ctour/cognitive-tours-forge.tour.json
serving  http://127.0.0.1:4317
open     http://127.0.0.1:4317/p/cognitive-tours-forge/cognitive-tours-forge.tour.json
```

Rules: one `key value` pair per line, the address alone on the last line, nothing printed before the server answers, nothing printed after the interrupt except the fact of stopping. On a second run, no line differs except a `unchanged` line replacing `map` when the map already existed.

`status`, stdout:

```
NAME                      STATE      MAPS  WAYPOINTS  TOURS  PATH
cognitive-tours-forge     ok            1         24      3  /home/me/code/cognitive-tours-forge
acme-api                  missing       -          -      -  /home/me/code/acme-api
```

Column widths follow the widest value. `-` means "not counted". An unreadable map prints `unreadable` and dashes. An empty workspace prints exactly `no projects yet` followed by `run ctour init in a project folder`.

`doctor`, stdout:

```
ok    workspace        /home/me/.ctour/workspace.json
ok    project-folder   /home/me/code/cognitive-tours-forge
FAIL  project-map      /home/me/code/acme-api/.ctour/main.tour.json would lose 1 waypoint
      fix: edit the file, or remove it and run ctour init again
```

`FAIL` lines are four characters wide like `ok` padded. Every failing check prints a `fix:` line naming a command or an action; `doctor` never performs it (FR-024).

`--json` shape for `status`:

```json
{
  "version": 1,
  "projects": [
    {
      "id": "...",
      "name": "...",
      "path": "...",
      "state": "ok",
      "maps": 1,
      "waypoints": 24,
      "tours": 3,
      "problem": null
    }
  ]
}
```

`--json` shape for `doctor`:

```json
{
  "version": 1,
  "ok": false,
  "checks": [{ "id": "project-map", "target": "...", "ok": false, "reason": "...", "fix": "..." }]
}
```

Both are one JSON document and nothing else on stdout. Human diagnostics for a failed run go to stderr.

## Exit codes

| Code | Meaning                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| 0    | Success                                                                                                             |
| 1    | Problems found (`doctor`), or the workspace cannot be read (`status`)                                               |
| 2    | Usage error: unknown command, unknown flag, missing argument, unknown project                                       |
| 3    | Environment refusal: not a directory, outside home, home itself, not writable, damaged workspace for `init`/`serve` |
| 4    | No free address in the probed range                                                                                 |
| 5    | Nothing to connect: `mcp install` found no agent                                                                    |

## `workspace`

`ctour workspace export|import` carries the machine's workspace as one file and
follows the same rules as every other command: no prompts, one line per fact,
exit codes from the table above. The full contract is
`specs/014-map-import-export/contracts/workspace-command.md`.

| Exit | `workspace export`                       | `workspace import`                                       |
| ---- | ---------------------------------------- | -------------------------------------------------------- |
| 0    | written                                  | every project added or already present                   |
| 1    | —                                        | at least one project left out                            |
| 2    | usage                                    | usage                                                    |
| 3    | destination outside home or not a folder | bundle missing, unreadable, not JSON, wrong shape, newer |

## Guarantees

1. **No prompts.** No command reads from stdin, waits for confirmation, or animates. Every run finishes or serves (FR-019).
2. **No hidden writes.** A command writes only: `.ctour/` and one map inside the repository it was pointed at, and the workspace file. `serve`, `status` and `doctor` write nothing at all, except the workspace's own recovery path, which `init`/`serve` announce on stdout (FR-023, FR-024).
3. **Nothing leaves the machine.** No command performs an outbound request; the server is spawned with `HOSTNAME=127.0.0.1` (FR-020).
4. **Idempotent.** Running `init` twice leaves every file in the repository byte-identical, and produces one workspace entry (FR-004, SC-002).
5. **An existing map is read, never rewritten.** Not reformatted, not re-serialised, not migrated (FR-008).
6. **Interrupt is bounded.** `SIGINT` or `SIGTERM` stops the child server and returns the terminal within one second, leaving the map as last saved (FR-013, SC-007).
7. **The printed address works.** It is printed only after the interface answered a request, so opening it cannot fail because the server was still starting (FR-005, SC-003).
8. **The address is stable across a run.** It does not change while the command is running, and a second command picks a different one while the first is up.
9. **No colour carries meaning.** Output is readable in a pipe with `TERM=dumb` and with no terminal attached (FR-019).
