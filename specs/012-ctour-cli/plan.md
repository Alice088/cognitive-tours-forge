# Implementation Plan: One command that opens a repository's map

**Branch**: `012-ctour-cli` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-ctour-cli/spec.md`

## Summary

Ship the application as an installable command. `ctour init` resolves the enclosing repository, creates `.ctour/` with one map, registers the project in the machine-local workspace, then serves the existing Next.js interface on loopback and prints the address that opens that map. `ctour serve` repeats the serving half without touching any file. `ctour status` and `ctour doctor` read the workspace and the map files and print plain, pipe-safe reports with meaningful exit codes. The map folder is renamed from `.tours/` to `.ctour/` in the same change, so one name covers both the repository artefact and the machine-local workspace.

The technical shape: one published package that contains a bundled ESM command and the Next.js standalone build output; the command spawns the standalone server as a child process with `PORT`, `HOSTNAME=127.0.0.1` and the inherited `CTOUR_HOME`, waits for the workspace route to answer, and forwards the interrupt signal. All workspace and map-file logic is imported from the modules the web application already uses, so the command and the interface cannot disagree about the format.

## Technical Context

**Language/Version**: TypeScript 5.9 (no `any`, strict), Node.js >= 20 runtime (developed on 22.22.3), ESM command bundle

**Primary Dependencies**: Next.js 16.2.6 (`output: 'standalone'`), React 19, Zustand/Zundo, shadcn/ui on Tailwind 4; new dev dependency: `esbuild` for the command bundle; no new runtime dependency

**Storage**: files only — `.ctour/<slug>.tour.json` per project, `~/.ctour/workspace.json` (machine-local, `CTOUR_HOME` relocates it), `~/.ctour/cache/<project>/` read-only fallback

**Testing**: Vitest 5 with two projects (`unit`: jsdom, `tests/unit`; `cli`: node, `tests/cli`), Playwright 1.60 acceptance (`tests/acceptance`, production build, workers=1)

**Target Platform**: macOS, Linux and WSL desktop; loopback only; published to the public package registry

**Project Type**: single package — a terminal command plus the local web application it starts

**Performance Goals**: interface reachable at the printed address within two seconds of the command starting; `status` under two seconds for six projects; interrupt returns the terminal within one second

**Constraints**: no network access at runtime (install-time only), listen on `127.0.0.1` only, no interactive prompts, no colour carrying meaning, no comments in code, minimal diffs, English product output

**Scale/Scope**: one machine, up to ~50 registered projects, maps already capped at 250 waypoints and 40 tours

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                                                                             | Gate                                                                                                            | Result                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| I. Local First (NON-NEGOTIABLE)                                                                                       | The command must not contact anything at runtime; the server binds loopback only; no telemetry, no update check | PASS — `HOSTNAME=127.0.0.1`, no HTTP client in the command, FR-020; only the package install touches the network        |
| II. Map Lives With the Code                                                                                           | The map is created inside the repository at its root, committed with the code, and never rewritten by a command | PASS — FR-002, FR-004, FR-008, FR-022; the map is ordinary text in `.ctour/` at the repository root                     |
| III. One Command to Start                                                                                             | One command after install takes a repository to a working interface                                             | PASS — `init` creates, registers and serves; `serve` repeats the serving half                                           |
| IV. Agent Access Through MCP                                                                                          | Agent access arrives with the MCP server, not by a side channel                                                 | PASS — no command writes agent configuration or installs skills (FR-023); the shape is left ready for 013               |
| V. Understanding Stays With the Person                                                                                | Nothing decides on the person's behalf; diagnostics do not repair silently                                      | PASS — `doctor` reports only (FR-024), `init` never overwrites or reformats a map                                       |
| VI. Interface Is the Product                                                                                          | The terminal output is the first interface and must be exact and readable                                       | PASS — address printed, one screen of help, pipe-safe output (FR-005, FR-018, FR-019)                                   |
| Additional: Node 20+, package `ctour`, strict TS, no comments, README order, dead code deleted in the same change     | Enforced in every task                                                                                          | PASS — `engines.node >= 20`, package renamed to `ctour`, `.tours/` removed from code, tests and docs in the same change |
| Development workflow: tests every change, `TEST_RESULTS.md` newest-first, plan before write, each phase a working app | Enforced by task order                                                                                          | PASS — tests precede implementation inside each story; each phase leaves a runnable command                             |

No violations, so Complexity Tracking is empty except for the one justified cross-feature edit recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/012-ctour-cli/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   └── map-folder.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks output
```

### Source Code (repository root)

```text
cli/
├── index.ts             # argument parsing, command dispatch, exit codes
├── commands/
│   ├── init.ts          # resolve target, create .ctour/, register, then serve
│   ├── serve.ts         # resolve project, start server, print address, forward signals
│   ├── status.ts        # workspace table, --json
│   └── doctor.ts        # checks, report, exit status
└── lib/
    ├── target.ts        # repository-root resolution and writability checks
    ├── port.ts          # free-port probing (4317..4346)
    ├── server.ts        # spawn/monitor the standalone server, readiness poll
    ├── output.ts        # table rendering, padding, one-line messages
    └── report.ts        # DiagnosticReport and StatusRow shapes for text and --json

app/lib/workspace/       # reused, not duplicated
├── map-file.ts          # toursDir() renamed to .ctour, map creation stays here
├── registry.ts          # workspace file
└── service.ts           # addProject/createMap reused by the command

scripts/
└── pack-standalone.mjs  # copies public and .next/static into .next/standalone, builds dist/

tests/
├── cli/                 # node-environment vitest: target, port, status, doctor, exit codes
├── unit/                # existing
└── acceptance/          # existing + cli.spec.ts (spawn, navigate, interrupt)

dist/                    # build output, gitignored, shipped in the package
```

**Structure Decision**: The repository stays one package. The application is already at the root and the command needs its workspace modules, so a second package would either duplicate the map format or require workspace plumbing for no gain. The command sources live in `cli/`, are bundled by esbuild into `dist/cli.mjs`, and the package publishes `dist/` plus the standalone build. `next start` keeps working alongside standalone output (verified: `next/dist/cli/next-start.js` has no standalone guard), so the Playwright harness is unchanged.

## Phase 0 — Research

See [research.md](./research.md) for D1–D14: package shape, standalone spawn, port probing and readiness, repository-root resolution, idempotent registration, reuse of workspace modules, the `.tours` → `.ctour` rename surface, command output and exit codes, `--json`, test split, publish checks.

## Phase 1 — Design

- [data-model.md](./data-model.md): resolved target, status row, diagnostic report, serve session, project entry and map file as already defined.
- [contracts/cli.md](./contracts/cli.md): commands, flags, output shapes, exit codes, guarantees.
- [contracts/map-folder.md](./contracts/map-folder.md): `.ctour/` naming, what `init` may create, leftover `.tours/`, what the web application must do to follow the rename.
- [quickstart.md](./quickstart.md): runnable scenarios that prove FR-001…FR-025 and SC-001…SC-008.

## Post-design Constitution Check

Re-evaluated after the contracts and data model were written:

| Gate                                | Re-check                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local First                         | The server child receives `127.0.0.1` explicitly; the command has no outbound request path, including no version check (D9)                                        |
| Map Lives With the Code             | `.ctour/` is created only at the repository root; `init` is byte-idempotent on an existing map; the folder is committed, not ignored (D8, contracts/map-folder.md) |
| One Command to Start                | `init` = resolve + create + register + serve, one printed address (D1, D6)                                                                                         |
| Agent Access Through MCP            | No agent file is written or read by any command in this feature (contracts/cli.md, "Guarantees")                                                                   |
| Understanding Stays With the Person | `doctor` is read-only and names the fixing command; `init` adopts an existing map as it is (D7, D10)                                                               |
| Interface Is the Product            | Output is plain text, no colour dependency, exact address, `--json` for scripts (D9, D10)                                                                          |

## Complexity Tracking

| Violation                                                                                       | Why Needed                                                                                                                                                                   | Simpler Alternative Rejected Because                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `.tours` → `.ctour` rename edits code, tests and documentation delivered by `010` and `011` | The clarification made `.ctour/` the single map folder; keeping `.tours/` for the web application and `.ctour/` for the command would mean two folder names for one artefact | A compatibility reader for `.tours/` would keep a second format alive for a product with no published installation, and the constitution requires dead code to be deleted in the change that makes it dead |
