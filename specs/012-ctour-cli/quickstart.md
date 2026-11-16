# Quickstart: One command that opens a repository's map

**Feature**: `012-ctour-cli` | **Date**: 2026-11-16

Runnable validation for the requirements in [spec.md](./spec.md). Each scenario names what to do, what to see, and the requirement it proves. Behaviour details live in [contracts/cli.md](./contracts/cli.md) and shapes in [data-model.md](./data-model.md).

## Prerequisites

```bash
npm install
npm run build          # next build with output: standalone
npm run build:cli      # esbuild bundle to dist/cli.mjs
```

Throughout, use a throwaway workspace so the real one is untouched:

```bash
export CTOUR_HOME="$(mktemp -d)"
export DEMO="$(mktemp -d)/demo-repo"
mkdir -p "$DEMO/src" && cd "$DEMO" && git init -q
alias ctour="node /path/to/cognitive-tours-forge/dist/cli.mjs"
```

## 1. One command from nothing (FR-001, FR-002, FR-003, FR-005, SC-001)

```bash
time ctour init
```

Expect: `.ctour/demo-repo.tour.json` created, five lines of output, the address printed last, the interface answering that address in the browser on an empty canvas. Under one minute from nothing at all, and no second command.

## 2. Nothing changes on a second run (FR-004, SC-002)

```bash
find .ctour -type f | sort | xargs sha256sum > /tmp/before.txt
ctour init &          # stop it with Ctrl+C after the address appears
sha256sum -c /tmp/before.txt
```

Expect: every line reports `OK`; the workspace holds one entry for this folder.

## 3. Serve writes nothing (FR-010)

```bash
find . -newer /tmp/before.txt -type f
ctour serve
```

Expect: the first command prints nothing; `serve` prints the address without creating or registering anything.

## 4. The map is adopted as written (FR-008)

```bash
printf '{"version":1,"project":{"name":"demo","createdAt":"2026-01-01T00:00:00.000Z"},"waypoints":[],"edges":[],"tours":[]}' > .ctour/hand-made.tour.json
sha256sum .ctour/hand-made.tour.json
ctour init
sha256sum .ctour/hand-made.tour.json
```

Expect: identical hashes; the interface opens `hand-made.tour.json`, not a newly created file.

## 5. A busy address is not a failure (FR-011, SC-004)

```bash
ctour serve &          # occupies 4317
ctour serve            # in a second terminal
```

Expect: the second run prints a different port and opens normally; both stay up.

## 6. Interrupt returns the terminal (FR-013, SC-007)

```bash
time ctour serve       # Ctrl+C once
```

Expect: control back in under a second, exit status 0, the map unchanged on disk.

## 7. Status shows every project and marks the broken ones (FR-014, FR-015, SC-005)

```bash
mkdir -p /tmp/second && ctour init /tmp/second >/dev/null 2>&1   # register a second project
mv /tmp/second /tmp/second-moved
ctour status
ctour status --json | head -c 400
```

Expect: two rows, the moved project marked `missing` with dashes for the counts, exit status 0. Under two seconds.

## 8. Doctor names what is wrong and fixes nothing (FR-016, FR-017, FR-024, SC-006)

```bash
printf 'not json' > .ctour/broken.tour.json
mkdir .tours
ctour doctor; echo "exit=$?"
ctour doctor --json
```

Expect: a `FAIL` for the broken map with a `fix:` line, a `FAIL` for the leftover `.tours/` folder, exit status 1, and both files still present afterwards.

## 9. Refusals (FR-006, FR-007, FR-009, FR-021)

```bash
ctour init /etc                      # exit 3: outside home
ctour init "$HOME"                   # exit 3: the home directory itself
ctour init "$DEMO/package.json"      # exit 3: not a directory
chmod a-w .ctour && ctour init; chmod u+w .ctour   # exit 3: not writable
ctour nonsense                       # exit 2: usage, with the command list
```

Expect the documented codes, one readable sentence each, and no partial files.

## 10. A subdirectory is still the repository (FR-022)

```bash
cd src && ctour init
```

Expect: `.ctour/` at the repository root, no `.ctour/` under `src/`, one workspace entry, the address pointing at the same project.

## 11. The workspace screen instead of an error (FR-025)

```bash
cd /tmp/empty-folder && ctour serve
```

Expect: the interface opens on the workspace screen, the terminal says this folder is not a project yet, nothing is created.

## 12. Help, version, unknown command (FR-018, SC-008)

```bash
ctour --help
ctour --version
ctour nope; echo "exit=$?"
```

Expect: one screen each, one line for the version, exit 2 for the unknown command with the valid list.

## 13. A named project, and output through a pipe (FR-012, FR-019)

```bash
ctour serve demo-repo
ctour status | cat
TERM=dumb ctour status
ctour status --json | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["projects"]))'
```

Expect: the named project opens even when the shell is elsewhere; the table survives `cat` and `TERM=dumb` unchanged and readable; the JSON parses.

## Automated coverage

| Scenario group                                                          | Where                                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Target resolution, refusals, exit codes, status and doctor shapes       | `tests/cli/*.test.ts` (node environment)                                                |
| Port probing, readiness poll, interrupt timing                          | `tests/cli/*.test.ts` with a stubbed child                                              |
| Real spawn, real address, real browser, real interrupt, idempotent tree | `tests/acceptance/cli.spec.ts`                                                          |
| Map folder rename                                                       | existing `tests/unit/map-file.test.ts`, `tests/unit/sync-*`, `tests/acceptance/sync-*`  |
| No outbound request in the command sources (FR-020)                     | `tests/cli/no-network.test.ts` — source scan, as `tests/unit/sync-local.test.ts`        |
| Only `.ctour/` and the workspace are written (FR-023)                   | `tests/acceptance/cli.spec.ts` — repository tree compared before and after each command |

```bash
npx vitest run          # unit + cli projects
npx playwright test     # acceptance, including cli.spec.ts
```
