# Tasks: One command that opens a repository's map

**Input**: Design documents from `/specs/012-ctour-cli/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, contracts/map-folder.md, quickstart.md

**Tests**: Included. The constitution requires tests for every change, and each story opens with its test task.

**Organization**: Phases follow the spec's priorities; Setup and Foundational tasks block every story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]`…`[US5]`, only in story phases

## Phase 1: Setup — the package becomes installable

- [x] T001 Rename the package and declare its publish surface in `package.json`: `"name": "ctour"`, remove `"private"`, add `"description"`, `"license"`, `"engines": { "node": ">=20" }`, `"bin": { "ctour": "./dist/cli.mjs" }`, `"files": ["dist/", ".next/standalone/", "README.md", "LICENSE"]`
- [x] T002 Add the build scripts to `package.json`: `"build:web": "next build"`, `"build:cli": "esbuild cli/index.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --banner:js=#!/usr/bin/env node"`, `"build:pack": "node scripts/pack-standalone.mjs"`, `"build:all": "npm run build:web && npm run build:pack && npm run build:cli"`, `"prepublishOnly": "npm run typecheck && npm run test:unit && npm run build:all"`
- [x] T003 Install `esbuild` as a dev dependency (adds it to `package.json` and `package-lock.json`)
- [x] T004 Add `output: 'standalone'` to `next.config.ts`, leaving `devIndicators: false` unchanged
- [x] T005 Write `scripts/pack-standalone.mjs`: fail when `.next/standalone/server.js` is missing, copy `public/` to `.next/standalone/public/` and `.next/static/` to `.next/standalone/.next/static/`, print the sizes copied
- [x] T006 Add `dist/` to `.gitignore` and leave `.next/` and `node_modules/` as they are
- [x] T007 Split the test projects in `vitest.config.mts`: `projects: [{ test: { name: 'unit', environment: 'jsdom', setupFiles: ['tests/setup.ts'], include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'], alias: { '@': cwd } } }, { test: { name: 'cli', environment: 'node', include: ['tests/cli/**/*.test.ts'], alias: { '@': cwd } } }]`, keeping `passWithNoTests: false`

## Phase 2: Foundational — the folder rename and the command's building blocks

- [x] T008 Rename the map folder in `app/lib/workspace/map-file.ts`: export `mapDir(projectRoot)` returning `path.join(projectRoot, '.ctour')` and delete `toursDir`
- [x] T009 Replace both hardcoded `'.tours'` paths in `app/lib/workspace/sync.ts` (the list read and the watch target) with `mapDir()` imported from `map-file.ts`
- [x] T010 Replace the hardcoded `'.tours'` literal in `app/lib/workspace/service.ts` (`browse`) and switch its three `toursDir` calls (`createMap`, `summarise`, `loadMap`) to `mapDir`
- [x] T011 Update the user-facing copy that names the folder: `app/components/shell/AddProjectDialog.tsx`, `app/components/shell/CreateMapDialog.tsx`, `app/components/shell/states/index.tsx` — every mention reads `.ctour/` (and `.ctour/<name>.tour.json` in the create dialog)
- [x] T012 Update the path literals in `tests/acceptance/fixtures.ts` (`MAP_PATH`, `mapPathFor`, `writeSampleMap`, `ensureProject`) to `.ctour` and re-run the five depending specs: `tests/acceptance/editing.spec.ts`, `tests/acceptance/performance.spec.ts`, `tests/acceptance/shell.spec.ts`, `tests/acceptance/sync-readonly.spec.ts`
- [x] T013 Update the path literals in the five unit tests: `tests/unit/map-file.test.ts`, `tests/unit/sync-invalid.test.ts`, `tests/unit/sync-own-write.test.ts`, `tests/unit/sync-poll.test.ts`, `tests/unit/sync-watch.test.ts`
- [x] T014 Update the six documents that name the folder: `README.md`, `docs/GETTING-STARTED.md`, `docs/PRODUCT-BRIEF.md`, `docs/adr/009-local-first-shell.md`, `docs/adr/010-live-file-sync.md`; then verify `grep -rn '\.tours' app tests README.md docs` prints nothing
- [x] T015 Amend `.specify/memory/constitution.md` for the folder name: replace the `.tours/` reference with `.ctour/`, bump the version, and record the amendment in the version history
- [x] T016 Add the third parameter to `addProject` in `app/lib/workspace/service.ts`: `selfRoot: string | null = process.cwd()`, skipping the `refused-self` check when `null`, and keep the HTTP route's behaviour unchanged
- [x] T017 Add `readRegistryWithNotice(home)` to `app/lib/workspace/registry.ts` returning `{ registry, recoveredFrom: string | null }` and implement the existing `readRegistry` on top of it without changing its behaviour
- [x] T018 Write `tests/cli/target.test.ts` first: repository root found from a subdirectory, fallback to the folder when there is no `.git`, `.git` as a file, home directory refused, outside-home refused, path is a file refused, missing path refused
- [x] T019 Implement `cli/lib/target.ts`: `resolveTarget(folder, home)` returning `{ root, source, mapDir, requested }` per data-model.md, with the four validations in the documented order and one message per refusal
- [x] T020 Write `tests/cli/port.test.ts`: the first free port of 4317…4346 is returned, an occupied port is skipped, an exhausted range raises the code that maps to exit 4
- [x] T021 Implement `cli/lib/port.ts`: `findFreePort(preferred = 4317, span = 30)` binding and releasing a `net` server on `127.0.0.1`
- [x] T022 Implement `cli/lib/output.ts`: `table(rows)` padded to the widest cell, `section(pairs)` for `key value` lines, `line(text)`, and a `fail(text)` that writes to stderr
- [x] T023 Implement `cli/lib/report.ts`: the `StatusRow` and `DiagnosticReport` shapes from data-model.md with `toStatusJson(rows)` and `toDoctorJson(report)`
- [x] T024 Implement `cli/lib/server.ts`: `startServer({ port, root, env })` spawning `node .next/standalone/server.js` with `cwd` set to the standalone folder, `HOSTNAME: '127.0.0.1'`, passing `CTOUR_HOME` through, polling `GET /api/workspace` every 100 ms up to 10 s, and `stopServer(child)` sending `SIGTERM`, waiting one second, then `SIGKILL`
- [x] T025 Write `tests/cli/server.test.ts` with a stub child and a stub fetch: readiness is true only after a 200, a timeout produces the documented failure, `stopServer` resolves after the child exits
- [x] T026 Implement the dispatch in `cli/index.ts`: parse `argv` into `{ command, args, flags }`, map every failure to the exit codes in contracts/cli.md, forward `SIGINT` and `SIGTERM`, and print one line per unimplemented command with exit 2

## Phase 3: US1 — from a repository to a map in one command (P1)

**Goal**: `ctour init` creates `.ctour/` with one map at the repository root, registers the project, serves the interface, and prints the map address. Running it again changes no file.

**Independent test**: run `ctour init` in a fresh folder with a temporary `CTOUR_HOME`, open the printed address, see the empty map; run it twice and compare the tree hash.

- [x] T027 [US1] Write `tests/cli/init.test.ts` first: a map is created with `mapFileName(basename(root))`, an existing map is adopted with its bytes unchanged, a second run writes nothing, the folder is created at the repository root when called from a subdirectory, `.ctour` as a file is refused, an unwritable `.ctour` is refused before writing, `already-registered` succeeds without a duplicate entry
- [x] T028 [US1] Implement `cli/commands/init.ts`: resolve the target, validate, register through `addProject(target, home, null)` tolerating `already-registered` by real path, create `.ctour/` and write one map through `writeMap(emptyDocument(name))` when the folder holds none, then hand off to the serve step
- [x] T029 [US1] Wire `init` into `cli/index.ts`, printing the five output lines from contracts/cli.md with the map address last and the `unchanged` line when the map already existed
- [x] T030 [US1] Add the first acceptance test to `tests/acceptance/cli.spec.ts`: spawn `dist/cli.mjs init` in a temporary repository with `CTOUR_HOME` set, parse the address from stdout, `page.goto` it, expect the empty canvas and the project name in the rail
- [x] T031 [US1] Assert the byte-identical second run in `tests/acceptance/cli.spec.ts`: hash every file under the repository, run `init` again, expect identical hashes and exactly one workspace entry

## Phase 4: US2 — start the interface without re-initialising (P1)

**Goal**: `ctour serve` opens the interface on a project without writing anything, picks another address when the first is taken, and returns the terminal within a second.

**Independent test**: initialise once, run `serve` twice, confirm two addresses, no file changed, and `Ctrl+C` returns control in under a second.

- [x] T032 [US2] Write `tests/cli/serve.test.ts` first: a named project id resolves, a path argument resolves, the current folder is used when nothing is named, an unknown project exits 2, a folder that is not a project resolves to the workspace screen
- [x] T033 [US2] Write `tests/cli/serve-writes.test.ts`: `serve` and `init` both leave the registry and the repository untouched when the project is already registered — compare file hashes before and after
- [x] T034 [US2] Implement `cli/commands/serve.ts`: resolve the project (named or from the current folder), choose the address through `findFreePort`, start the server, print the address, and print the workspace-screen address when no project matches
- [x] T035 [US2] Wire `serve` into `cli/index.ts` and forward the interrupt to `stopServer` so the process exits 0 within one second
- [x] T036 [US2] Add the busy-address test to `tests/acceptance/cli.spec.ts`: start one server, start a second, expect two different printed ports and both pages loading
- [x] T037 [US2] Add the interrupt test to `tests/acceptance/cli.spec.ts`: measure the time between `SIGINT` and process exit and assert it is under one second, with the map unchanged

## Phase 5: US3 — see the state of every project (P2)

**Goal**: `ctour status` prints one row per project with counts and marks broken projects, in under two seconds, with `--json` for scripts.

**Independent test**: register three projects, delete one folder, damage one map, run `status`, check three rows and two marks.

- [x] T038 [US3] Write `tests/cli/status.test.ts` first: three fixtures produce three rows in registration order; a missing folder reports `missing` with `-` counts; a map that would lose a waypoint reports `unreadable` with no partial totals; an empty workspace prints `no projects yet` and the suggestion; `--json` matches the documented shape and parses
- [x] T039 [US3] Implement `cli/commands/status.ts`: read the registry without recovering it, stat each folder, count maps through `mapDir`, sum waypoint and tour counts only when every map read succeeded, render the table or the JSON
- [x] T040 [US3] Wire `status` into `cli/index.ts`, exiting 1 when the workspace file cannot be read and 0 otherwise
- [x] T041 [US3] Add the six-project timing assertion to `tests/cli/status.test.ts`: a fixture with six projects completes under two seconds

## Phase 6: US4 — find out why something does not work (P2)

**Goal**: `ctour doctor` checks folders, maps and the workspace, names the fixing command, exits non-zero on any problem, and modifies nothing.

**Independent test**: damage a map, move a folder, corrupt the workspace, run `doctor`; expect three named problems, three `fix:` lines, exit 1, and byte-identical files afterwards.

- [x] T042 [US4] Write `tests/cli/doctor.test.ts` first: a healthy fixture reports every check as `ok` and exits 0; a map that would lose a waypoint produces `project-map` with the file path and a `fix:` line; a moved folder produces `project-folder`; a corrupt workspace produces `workspace`, is reported once, and the file is byte-identical afterwards; a leftover `.tours/` produces `leftover-tours`; every failing case exits 1
- [x] T043 [US4] Implement `cli/commands/doctor.ts`: the five checks in the documented order, one line each, `fix:` lines under failures, `--json` shape, exit 1 on any failure, no write of any kind
- [x] T044 [US4] Wire `doctor` into `cli/index.ts` and add the safety assertion to `tests/cli/doctor.test.ts`: hashing the whole temporary home and repository before and after produces identical results

## Phase 7: US5 — install once, use it in any repository (P3)

**Goal**: help, version and unknown-command output are complete and single-screen; the tarball contains everything the command needs.

**Independent test**: install the packed tarball into a scratch folder, run `--help` and `--version` outside any repository, then `init` in a fresh folder.

- [x] T045 [US5] Write `tests/cli/dispatch.test.ts` first: `--help` lists all four commands with one line each and exits 0; `--version` prints one line and exits 0; an unknown command exits 2 with the valid list; no command reads stdin
- [x] T046 [US5] Implement the help and version text in `cli/index.ts` so T045 passes, keeping each under one screen
- [x] T047 [US5] Add `tests/cli/no-network.test.ts` scanning `cli/**/*.ts` for `http`, `https`, `fetch`, `WebSocket`, `net.connect` — only `node:net` for a listening probe is allowed — so FR-020 is enforced by a test
- [x] T048 [US5] Verify publish readiness from `scripts/pack-standalone.mjs` output: `npm pack --dry-run --json` must list `dist/cli.mjs`, `.next/standalone/server.js`, `.next/standalone/.next/static/`, `.next/standalone/public/`, `README.md`; record the check in `specs/012-ctour-cli/plan.md` under publish notes if the list differs
- [x] T049 [US5] Update `README.md` in the fixed order: an install-and-start section in the technical block at the end (one install line, `ctour init`, `ctour serve`, `ctour status`, `ctour doctor`, the `.ctour/` layout, `CTOUR_HOME`), and correct the map-location wording already in the architecture section
- [x] T050 [US5] Update `docs/GETTING-STARTED.md` to the installed-command flow, removing the clone-and-`npm run dev` path as the primary route

## Phase 8: Polish

- [x] T051 Run `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .` and fix every finding in `cli/`, `app/`, `tests/`, `scripts/pack-standalone.mjs`, `vitest.config.mts`, `next.config.ts`
- [x] T052 Run `npx vitest run` over `tests/unit/**` and `tests/cli/**`, and `npx playwright test` over `tests/acceptance/**`; fix failures without weakening assertions
- [x] T053 Record the run in `TEST_RESULTS.md`: new section on top with the date header, one row per test from the JSON reporters (unit, cli, acceptance), summary and failures blocks
- [x] T054 Add `## Notes` to `specs/012-ctour-cli/tasks.md` recording the `.tours` → `.ctour` rename list, the `addProject` third parameter, the `readRegistryWithNotice` asymmetry, and any task closed partially with the reason
- [x] T055 Verify the quickstart by hand for scenarios 1, 2, 4, 8, 10, 11 against a temporary `CTOUR_HOME` and note any divergence in `specs/012-ctour-cli/quickstart.md`

## Dependencies

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007      (setup; T003 can follow T002)
T007 → T018 → T019 → T020 → T021 → T024 → T025 → T026 (foundational building blocks)
T008 → T009, T010, T011; T012 → T013; T014 → T015     (rename; tests after fixtures)
T016, T017 → T026                                     (registration and workspace reads)
T026 → T027…T031 (US1) → T032…T037 (US2) → T038…T041 (US3) → T042…T044 (US4) → T045…T050 (US5)
T031, T037 → T052                                     (acceptance needs the built artefacts)
T051 → T052 → T053 → T054 → T055
```

Story order matters for delivery, not for isolation: US3 and US4 only read the workspace, so they can be built while US1 is still being polished. US5 needs the tarball, which needs Setup complete.

## Parallel Execution Examples

- **Setup**: T005 and T006 touch different files; T007 is independent of T004.
- **Rename**: T009, T010 and T011 are three disjoint files and can land together; T012 and T013 are disjoint test sets.
- **US3 + US4**: T039 and T043 share only `cli/lib/report.ts` (T023, already merged), so they can be written in parallel after T026.
- **US1 acceptance**: T030 and T031 are different tests in one file — sequential within the file, independent of US2 work.

## Implementation Strategy

**MVP**: Phase 1 + Phase 2 + US1 + US2. That is the product promise — one command opens a map, a second command reopens it — and it is demonstrable end to end.

**Then**: US3 (a person with several repositories needs to see them), US4 (the only support channel), US5 (installability), Polish.

**Every phase leaves a runnable command**: after Phase 2 the dispatch answers `--help`; after US1 `init` works; after US2 `serve` works; after US3 and US4 the read-only commands work; after US5 the package can be installed.

## Notes

- T026: the dispatch lives in `cli/lib/run.ts` and `cli/index.ts` is the three-line entry that calls it, because a test cannot import an entry module without executing it. `cli/index.ts` still owns the exit code through `process.exitCode`.
- T019: `resolveTarget` takes `mode: 'read' | 'write'`; the read mode skips the writability check so `serve` works on a read-only project folder.
- T022/T023: no dedicated test files; the table, pair and JSON renderers are covered through `tests/cli/dispatch.test.ts` and `tests/cli/status.test.ts`.
- T028: `init` registers before creating the map, as planned; `already-registered` is matched by `realpath` against `listProjects`, so a symlinked path cannot produce a second entry.
- T029: `init` prints `ctour <version>` first and `unchanged .ctour/<file>` instead of `map` when the file already existed, which is the second line of the contract's output block.
- T033: the "serve writes nothing" assertion lives in `tests/cli/serve.test.ts` (`writes nothing`) rather than a separate file, because it needs the same fixtures.
- T034: `serve` announces the workspace-recovery move too, matching the guarantee in `contracts/cli.md`; only `init` and `serve` can recover, `status` and `doctor` never touch the file.
- T036/T037: both live in `tests/acceptance/cli.spec.ts`, which builds `dist/cli.mjs` and packs the standalone assets in `beforeAll` because the Playwright web server only runs `next build && next start`.
- T041: the six-project timing assertion is inside `tests/cli/status.test.ts`.
- T044: the safety assertion hashes the whole sandbox in `changes nothing on any run`.
- T047: `tests/cli/no-network.test.ts` also asserts that every literal URL in `cli/` starts with `http://127.0.0.1`, which covers the readiness poll.
- T048: `npm pack --dry-run` reports 1282 files, 51.0 MB unpacked, with `dist/cli.mjs`, `.next/standalone/server.js`, 35 static and 4 public files present. No change to `plan.md` was needed.
- T055: quickstart scenarios 1, 2, 4, 8, 10 and 11 were exercised by hand against a temporary `CTOUR_HOME`; no divergence found. Scenario 1 picked port 4318 because 4317 was busy, which is the documented behaviour.
- Rename surface: `toursDir()` became `mapDir()` in `map-file.ts`; `sync.ts` (two literals) and `service.ts` (one literal) now call it, so the folder name has one definition.
