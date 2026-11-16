# Research: One command that opens a repository's map

**Feature**: `012-ctour-cli` | **Date**: 2026-11-16

Fourteen decisions. Each records what was chosen, why, and what was rejected.

## D1 — One package, published under the name the command already has

**Decision**: The repository root becomes the published package. `package.json` keeps the application and gains `"name": "ctour"`, `private` is removed, `bin` points at `dist/cli.mjs`, `files` lists `dist/`, `.next/standalone/`, `README.md` and `LICENSE`. `engines.node` is `>=20`.

**Rationale**: The command needs the workspace modules (`map-file.ts`, `registry.ts`, `service.ts`) and the built application. A second package would either re-implement the map format or require workspace plumbing, hoisting and a build orchestrator — three new failure modes for one command. The registry name `ctour` is free: `npm view ctour` answers `404 Not found` on 2026-11-16.

**Alternatives rejected**: `packages/ctour` with npm workspaces (duplicate format or hoisting config, both extra moving parts); a separate `create-ctour` scaffolder (does not satisfy "one command" after install).

## D2 — Ship the standalone build, not a dependency on Next.js

**Decision**: Set `output: 'standalone'` in `next.config.ts`. A build script copies `public/` and `.next/static` into `.next/standalone` (the step the Next.js documentation names explicitly) and emits the command bundle. The published tarball carries `.next/standalone`, which already contains its traced `node_modules`.

**Rationale**: `server.js` in `.next/standalone` runs with `node` alone, reads `PORT` and `HOSTNAME`, and needs no package installation. Keeping `next` as a runtime dependency instead would add ~180 MB to the user's install and a second resolution step at every start.

Verified against the shipped documentation: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` — "This will create a folder at `.next/standalone` which can then be deployed on its own without installing `node_modules`", with `PORT`/`HOSTNAME` support and the `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/` step.

**Alternatives rejected**: `next start` as the runtime (needs `next` installed; also resolves the app relative to the user's project, not the package); static export (the application reads and writes the filesystem through route handlers, so it cannot be static).

## D3 — The command is bundled, so no loader is needed at runtime

**Decision**: `cli/index.ts` and its imports are bundled by esbuild into a single `dist/cli.mjs` (`--platform=node --format=esm --bundle`, shebang banner, `node:*` external). esbuild resolves the `@/` path aliases from `tsconfig.json` natively.

**Rationale**: The command imports TypeScript modules that use the `@/` alias (`map-file.ts` imports `@/app/lib/fs/safe-path`). Plain `tsc` emit would leave those aliases unresolved; a runtime loader (`tsx`) would add a dependency and ~300 ms to every invocation, which the two-second readiness goal cannot afford.

**Alternatives rejected**: `tsx` at runtime (dependency + slow start); `tsc` with alias rewriting (needs a third tool); copying the map logic into plain JavaScript (two implementations of one format, exactly what the constitution forbids).

## D4 — The command spawns the standalone server and waits for it

**Decision**: `spawn(process.execPath, [serverDir/server.js], { cwd: serverDir, env: { ...process.env, PORT, HOSTNAME: '127.0.0.1', NODE_ENV: 'production' } })`. Readiness is a poll of `GET /api/workspace` every 100 ms for up to 10 s; the address is printed only after a 200. `SIGINT`/`SIGTERM` on the parent forwards `SIGTERM` to the child, waits up to one second, then sends `SIGKILL`.

**Rationale**: `server.js` is the only supported entry point that needs no installed dependency, and `HOSTNAME=127.0.0.1` is what keeps a local-first product off the network interface — the standalone default binds all interfaces. Polling a route the interface actually uses proves the server is usable, not merely that the port is open.

**Alternatives rejected**: importing Next programmatically (requires `next` in the published package, see D2); sleeping a fixed interval instead of polling (prints an address that may not answer); letting the child inherit the default hostname (exposes the map to the local network, violating Local First).

## D5 — Ports are probed before the server starts

**Decision**: Default port 4317; the command probes 4317…4346 by binding a `net` server on `127.0.0.1` and closing it, then starts the child on the first free port. If the child still fails with `EADDRINUSE`, the next port is tried. When all 30 are busy the command exits with the environment code and a message naming the range.

**Rationale**: The chosen address must be printed before the interface is reachable, and `server.js` cannot report a port it chose itself (`PORT=0` is not echoed back). Probing plus a retry costs nothing and covers the race between probe and bind.

**Alternatives rejected**: `PORT=0` (no way to learn the port); fixed port with a hard failure (contradicts FR-011 and SC-004); a lock file in the workspace (extra state to keep consistent).

## D6 — `init` registers first, then creates the map

**Decision**: Resolve the target, validate it, then: (1) register the project, tolerating `already-registered` when the resolved path matches; (2) if `.ctour/` holds no `*.tour.json`, create the folder and write one map through the existing `writeMap` (atomic temporary + rename); (3) start the server and print the map address.

**Rationale**: If map creation fails, the project is registered with no map and the interface shows its "no maps yet" state — a coherent outcome. The reverse order would leave a map file belonging to no project, which is invisible in the interface and looks like data loss. `writeMap` already writes atomically, so a crash cannot leave a truncated map.

**Alternatives rejected**: create-then-register (orphan file on failure); writing the JSON directly in the command (a second writer of a format that already has one).

## D7 — Registration tolerates an existing entry, but not a different one

**Decision**: `addProject` gains an optional third argument for the "is this the application itself" check, defaulting to `process.cwd()` (unchanged behaviour for the HTTP route). The command passes `null`, because for a command the current directory is the target by definition. `already-registered` is treated as success only when the resolved real path equals the stored path; a different existing entry with the same name is left alone and the command uses the existing entry.

**Rationale**: The check exists so the interface cannot register the application's own folder, which is meaningful when the server's working directory is the package. For a command, `process.cwd()` equals the target, so the check would reject every legitimate run — the exact bug the plan must avoid. Real-path comparison makes the idempotency guarantee hold across symlinks and trailing slashes.

**Alternatives rejected**: calling `registerProject` directly from the command (skips the home-directory and readability checks, duplicating FR-007 in a second place); comparing raw strings (fails on symlinks, producing a second entry for one project).

## D8 — The repository root is found by walking up for `.git`

**Decision**: Resolve the target with `realpath`, then walk up until a directory contains `.git` (a directory or a file, so worktrees count). Stop at the filesystem root. If no `.git` is found, the target itself is the project. The home directory is refused before this walk.

**Rationale**: `.git` is the only marker every version-controlled folder has, and a worktree's `.git` is a file — checking for a directory only would miss it. Falling back to the target keeps the command usable in a plain folder, which is what makes the product work outside a repository.

**Alternatives rejected**: `git rev-parse --show-toplevel` (a subprocess, and wrong on a machine without git); always using the current directory (FR-022); searching for `.ctour/` upwards (would make the map location depend on itself).

## D9 — Output is plain text, with an opt-in JSON shape

**Decision**: Tables are padded with spaces to the widest cell, one row per line, no ANSI colour at all. `status` and `doctor` accept `--json` and print one JSON document with a stable shape. Help, version and unknown-command output are single screens. Messages about failures go to stderr; results go to stdout.

**Rationale**: FR-019 requires the output to survive a pipe. Colour that carries meaning fails in a pipe, and no colour at all is simpler than detecting a terminal — the product is one command whose output a person reads once. `--json` costs a few lines and makes `doctor` usable from a script, which is what a support-free product needs.

**Alternatives rejected**: colour with `NO_COLOR` handling (more states to test, no user benefit here); a table library (a dependency for `padEnd`); JSON only (unreadable for the primary audience).

## D10 — `doctor` reads the workspace without recovering it

**Decision**: `registry.ts` gains `readRegistryWithNotice(home)` returning the registry plus whether a corrupt file was moved aside; `readRegistry` keeps its current behaviour on top of it. `doctor` never calls `readRegistry` — it reads the file and calls `parseRegistry` itself, so a damaged workspace is reported and left exactly where it is. `init` and `serve` use `readRegistry` and print the recovery note when it happens.

**Rationale**: `readRegistry` renames a corrupt file to `.corrupt-<stamp>`. That is good recovery for a running interface and a violation of FR-024 for a diagnostic command. The asymmetry is deliberate and printed: `init` must be able to make a damaged workspace usable again, and it says so; `doctor` only looks.

**Alternatives rejected**: making `readRegistry` read-only everywhere (a corrupt workspace would then brick the interface, and the recovery would have to be re-implemented in the browser); a `--fix` flag on `doctor` (rejected during clarification).

## D11 — Two Vitest projects, one Playwright spec for the real thing

**Decision**: `vitest.config.mts` gains `test.projects`: `unit` (jsdom, `tests/unit/**`, existing setup file) and `cli` (node environment, `tests/cli/**`). One `npx vitest run` executes both and the JSON reporter aggregates them. A single Playwright spec, `tests/acceptance/cli.spec.ts`, spawns the built command against a temporary `CTOUR_HOME` and a temporary repository, opens the printed address with a real browser, and interrupts the process.

**Rationale**: Vitest 5 resolves per-project environments through `projects` (`TestProjectConfiguration` in the shipped types), so no `environmentMatchGlobs` is needed — that option was removed in Vitest 5 and its absence cost time in `011`. The command's terminal behaviour (exit codes, interrupt within a second, the address actually answering) can only be checked by running the real binary, and Playwright already owns the production build.

**Alternatives rejected**: running CLI tests under jsdom (no `process.exit` fidelity, no child processes); a separate `vitest.cli.config.mts` and a second command (two runs to remember, two JSON files to merge); checking the interactive behaviour by unit-testing the spawn helper only (SC-003 and SC-007 would be untested).

## D12 — The rename surface is enumerated, not discovered

**Decision**: The literal folder name appears in 6 application files — `map-file.ts` (`toursDir()`), `sync.ts` twice (list read and watch path), `service.ts` once (the browse check), and the copy of `AddProjectDialog`, `CreateMapDialog` and `states/index.tsx` — in 10 test files and in 6 documents (`README.md`, `docs/GETTING-STARTED.md`, `docs/PRODUCT-BRIEF.md`, `docs/adr/009`, `docs/adr/010`, `.specify/memory/constitution.md`). The three hardcoded paths outside `map-file.ts` are replaced with one exported `mapDir(projectRoot)` (renamed from `toursDir`), so the folder name has exactly one source. Acceptance for the rename is `grep -rn '\.tours' app tests README.md docs` returning only the leftover-folder check.

**Rationale**: Most matches of the string are `document.tours` and must not be touched, so the rename cannot be a blind substitution — but the three hardcoded `'.tours'` literals in `sync.ts` and `service.ts` are exactly the ones a blind substitution of `document.tours` would miss. Routing them through the exported function removes the class of bug rather than the instance.

**Alternatives rejected**: keeping `.tours/` for the interface and `.ctour/` for the command (two names for one artefact); a silent fallback read of `.tours/` (a second format for an unpublished product); replacing the literal in `sync.ts` only (the next rename breaks again).

## D13 — Publish readiness is verified, not published

**Decision**: The feature verifies `npm pack --dry-run` contents (command bundle, standalone server, static assets, README), `engines`, the absence of `private`, and that `prepublishOnly` runs typecheck, tests and the build. Actually pushing to the registry is out of scope and needs credentials the environment does not have.

**Rationale**: FR-001 is about installability, and the tarball is the artefact that proves it. Running `npm publish` from a test would be irreversible and unreviewable.

**Alternatives rejected**: publishing as part of the feature (irreversible, needs an account); skipping the tarball check (a missing static folder would only appear after publication).

## D14 — Module format and runtime assumptions

**Decision**: The package keeps no `"type": "module"` (the Next.js application and its configs stay as they are); the command file is explicitly `dist/cli.mjs` with a `#!/usr/bin/env node` banner and `bin` mapping. The command runs only on Node, never on a browser or a worker. `CTOUR_HOME` is passed through untouched, so a relocated workspace works identically under the command and the interface.

**Rationale**: Adding `type: module` would change how every existing config file in the repository is loaded, for the benefit of one file. An explicit `.mjs` extension needs no such change.

**Alternatives rejected**: `"type": "module"` for the whole package (a config-wide change unrelated to the feature); a `.cjs` bundle (bundled ESM output is smaller and has no interop surprises).
