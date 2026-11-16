# Tasks: Agent Access to the Map

**Input**: Design documents from `/specs/013-mcp-agent-access/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: included in every story. The repository requires a test run for every
change and records it in `TEST_RESULTS.md`.

**Organization**: one phase per user story, in priority order, each independently
testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task
- **[Story]**: US1…US5 from `spec.md`
- Every task names the file it touches

## Path Conventions

Repository root is the project; the command lives in `cli/`, the application in
`app/`, tests in `tests/cli` (node) and `tests/acceptance` (Playwright). The `@/`
alias resolves to the repository root, so the protocol layer imports the
application's map-file modules directly.

---

## Phase 1: Setup

**Purpose**: the two files every later phase imports.

- [x] T001 [P] Add the shared protocol test harness to `tests/cli/mcp-fixtures.ts`: temporary `HOME` and `CTOUR_HOME` under `.tmp/`, a registered project with one map built from `tests/unit/fixtures/build-map.ts`, an in-memory pair of streams driving `serve()`, a `call()` helper returning the parsed response line, and a `snapshot()` helper returning the sha256 of every file under a folder (FR-015, FR-027)
- [x] T002 [P] Create `cli/mcp/refusals.ts` with the twenty codes from `data-model.md` §Refusal, each with its one-sentence message and optional `allowed` list, plus `refusal(code, detail)` and `refusalText()` producing `code: message` followed by `Valid: …` (FR-015)

---

## Phase 2: Foundational (blocking)

**Purpose**: the framing, the tool registry and the command wiring — nothing a
story adds works without them.

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

- [x] T003 Create `cli/mcp/access.ts`: resolve a project by `id`, then `name`, then absolute folder against a non-mutating read of `registryPath(home)` through `parseRegistry` — never `readRegistryWithNotice`, which renames a damaged file — refusing `workspace-unreadable` with the path instead of repairing it (FR-027); resolve a map by file name, or the only map when there is exactly one; `stateOf(bytes)` returning `sha256(bytes).hex().slice(0, 16)`; and `readView()` returning `{ document, state, savedAt, omitted }` through `readMap` so losses are counted rather than hidden (FR-002…FR-006)
- [x] T004 Create `cli/mcp/server.ts`: read standard input line by line, parse one frame per line, answer `initialize` (protocol version echo over `2025-06-18`/`2025-03-26`/`2024-11-05`, `capabilities.tools.listChanged: false`, `serverInfo`, `instructions`), ignore `notifications/initialized`, answer `ping`, `tools/list` and `tools/call`, return `-32700`/`-32601`/`-32602`/`-32002` per `contracts/mcp-tools.md`, write every response through one writer and nothing else to standard output, exit 0 on end of input (contracts/mcp-tools.md §Transport, §Handshake)
- [x] T005 Create `cli/mcp/tools.ts`: the ordered registry of `{ name, description, inputSchema, run }`, `listTools()` in the contract's order, `callTool()` validating `arguments` against the schema with `additionalProperties: false` and returning `{ content: [{ type: 'text', text }], structuredContent, isError }`, and an `invalid-argument` outcome naming the argument and expected type (contracts/mcp-tools.md §tools/call)
- [x] T006 Create `cli/mcp/instructions.ts` with a short honest text: what the server is, that a map is read, changed and read back, and that a refusal means nothing was written; `server.ts` returns it from `initialize` (FR-026 minimal form, completed in US5)
- [x] T007 Create `cli/commands/mcp.ts` with `serve()` wiring standard streams to `cli/mcp/server.ts`, and add `mcp` to the command list in `cli/lib/run.ts` together with its help line, its refusal of `--json`, and dispatch to `serve` when no argument is given (contracts/cli.md, 012)
- [x] T008 Add `tests/cli/mcp-isolation.test.ts`: scan `cli/mcp/*.ts` and `cli/commands/mcp.ts` for network clients (`node:http`, `node:https`, `node:net`, `node:dns`, `node:tls`, `WebSocket`), for `console.log` and for `process.stdout.write` outside `cli/mcp/server.ts`, and assert that every literal URL in the directory starts with `http://127.0.0.1` (FR-028)

**Checkpoint**: `ctour mcp` starts, answers `initialize` and `ping`, and lists no tools.

---

## Phase 3: User Story 1 — The agent answers from the map (P1) 🎯 MVP

**Goal**: an agent can enumerate this machine's projects and read one map in full.

**Independent Test**: run `quickstart.md` scenarios 1–3 — two requests return every
project and every waypoint, link and tour of a map, with the same answer when the
interface was never started.

### Tests for User Story 1

> Write these first; they must fail before T011–T013.

- [x] T009 [P] [US1] Add `tests/cli/mcp-protocol.test.ts`: handshake with each of the three protocol versions and an unknown one; `notifications/initialized` answered with nothing; `ping` before `initialize` answered; a request before `initialize` gets `-32002`; a malformed line gets `-32700` with `id: null`; an unknown method gets `-32601` naming it; `tools/call` for an unknown tool gets `-32602`; `instructions` is non-empty; standard output contains only frames (contracts/mcp-tools.md)
- [x] T010 [P] [US1] Add `tests/cli/mcp-read.test.ts`: `list_projects` lists a project with its folder, maps and counts, marks a project whose folder was deleted `available: false` instead of hiding it; `read_map` returns the whole document; a project with several maps and no `map` is refused as `map-required` listing the files; an ambiguous project name is refused as `project-ambiguous` with both ids; a missing map file is `map-missing`; a truncated JSON file is `map-unreadable`; a waypoint without a label raises `omitted.waypoints` by one while the rest of the map still returns; a 250-waypoint map reads in under a second (FR-001…FR-006, SC-004, SC-006)

### Implementation for User Story 1

- [x] T011 [US1] Extend `cli/mcp/access.ts` with `listView()` returning `ProjectView[]` (folder existence checked, maps counted through `readMap`), `mapView()` returning `MapView` with `state` and `omitted` from `LoadReport`, and refusal mapping for `project-gone`, `project-ambiguous`, `map-required`, `map-missing`, `map-unreadable` (FR-001, FR-004, FR-006)
- [x] T012 [US1] Register `list_projects` in `cli/mcp/tools.ts` with an empty-object schema, a description of when to use it, and text rendering of each project with its folder and maps (FR-001)
- [x] T013 [US1] Register `read_map` in `cli/mcp/tools.ts` with `{ project, map? }`, rendering the state token, the waypoint count and the omitted counts as the first lines of the text, followed by the document (FR-002, FR-003, FR-005)

**Checkpoint**: an agent can read the machine's maps; nothing can be written yet.

---

## Phase 4: User Story 2 — The agent writes into the open map (P1)

**Goal**: seven write capabilities land in the same file the interface watches.

**Independent Test**: `quickstart.md` scenarios 4–6 and 10 — a waypoint, an update, a
deletion and a tour are written, each appears on an open screen within a second, and
`sha256sum` shows no file outside `.ctour/` changed.

### Tests for User Story 2

- [x] T014 [P] [US2] Add `tests/cli/mcp-write.test.ts`: `create_waypoint` with and without a position; `update_waypoint` changing only named fields and clearing a field sent as `null`; `delete_waypoint` returning `removed` counts for links and stops; `connect_waypoints` with and without a label; `disconnect_waypoints`; `create_tour`; `set_tour_stops` in order with narratives, and an empty list clearing the stops; every success returns a new `state`; a whole-project snapshot before and after each call differs only inside `.ctour/` (FR-007…FR-012, FR-018, FR-027)
- [x] T015 [P] [US2] Add `tests/cli/mcp-placement.test.ts`: the first waypoint lands on the grid origin; additions fill downwards then rightwards; a slot occupied by an existing waypoint is skipped; two identical reads produce the same slot; a map with waypoints scattered on the grid still yields a free slot (FR-007)
- [x] T016 [P] [US2] Add `tests/acceptance/mcp.spec.ts`: spawn the built `dist/cli.mjs mcp` with the fixture `CTOUR_HOME`, send `initialize` and `create_waypoint` over standard input, send 20 consecutive `create_waypoint` calls, open the fixture map in the browser, and expect every one of the 20 visible within one second without a reload (SC-002), then delete it through the protocol and expect it gone; with a draft edit open in the interface, an agent write shows the map-level choice and loses neither side (FR-018, FR-019, SC-002)

### Implementation for User Story 2

- [x] T017 [US2] Create `cli/mcp/placement.ts` with `freePosition(document)`: columns of 240 px from `x = 80`, rows of 160 px from `y = 80`, downwards then rightwards, the first slot at least 224 px away horizontally **or** 80 px away vertically from every existing waypoint, derived from the `w-52` node in `app/components/shell/WaypointNode.tsx` (FR-007, research D8)
- [x] T018 [US2] Extend `cli/mcp/access.ts` with the write path: `readStrict()` through `readMapStrict`, `commit(document, state)` comparing the current token with the sent one — answering `changed: false` with the new token when the normalised content is identical — and otherwise writing through `writeMap`, `changed(current, next)` comparing `canonicalText` of both, slug ids from labels with `uniqueId`, edge ids from source and target (FR-013, FR-016, FR-017)
- [x] T019 [US2] Register `create_waypoint` and `update_waypoint` in `cli/mcp/tools.ts`, deriving the id from the label, placing the waypoint through `freePosition` when no position is sent, and applying only the fields present in the request (FR-007, FR-008)
- [x] T020 [US2] Register `delete_waypoint`, `connect_waypoints` and `disconnect_waypoints` in `cli/mcp/tools.ts`, removing links and tour stops with the waypoint and counting them into `removed` (FR-009, FR-010)
- [x] T021 [US2] Register `create_tour` and `set_tour_stops` in `cli/mcp/tools.ts`, replacing the stop list wholesale and resolving each stop's waypoint by id or exact label (FR-011)

**Checkpoint**: an agent writes the map a person is looking at, and the map stays one file.

---

## Phase 5: User Story 3 — A bad write is refused, never half-applied (P1)

**Goal**: every way a write can be wrong leaves the file byte-identical and says why.

**Independent Test**: `quickstart.md` scenarios 7–9, 11 — after each malformed, stale
or out-of-range call, `sha256sum` of the map is unchanged and the refusal names the
cause and the valid values.

### Tests for User Story 3

- [x] T022 [US3] Extend `tests/cli/mcp-write.test.ts` with the refusal table from `data-model.md`: `type-unknown` listing the ten types; `label-empty`; `waypoint-unknown`; `waypoint-ambiguous` with both ids; `nothing-to-update`; `self-link`; `link-unknown`; `stop-unknown`; `stop-duplicate`; `tour-unknown`; `name-empty`; `path-outside` for `../../etc/passwd`; `map-changed` carrying the current `state` and current map when the file was edited between read and write; `unchanged` write leaving the modification time untouched; and a byte-for-byte comparison of the map file after every single refusal (FR-013…FR-016, FR-020, SC-003)

### Implementation for User Story 3

- [x] T023 [US3] Add the refusal branches to `cli/mcp/access.ts`: `type-unknown` against `WAYPOINT_TYPES`, `label-empty` on a whitespace-only label, `waypoint-unknown`/`waypoint-ambiguous` on id-or-label resolution, `path-outside` through `resolveInside` from `app/lib/fs/safe-path.ts`, `stop-unknown` and `stop-duplicate` on a stop list, `name-empty` on a tour name (FR-013, FR-015)
- [x] T024 [US3] Make `cli/mcp/tools.ts` shape every refusal into `isError: true` with `structuredContent` carrying `code`, `allowed`, and — for `map-changed` — the current `state` and the current map view, and make `nothing-to-update` the answer to an update with no fields (FR-014, FR-015)
- [x] T025 [US3] Make the write path in `cli/mcp/access.ts` fail atomically: compare tokens before writing, answer `unchanged` when they differ but the canonical text matches, refuse without touching the file otherwise, leave no `.tmp` behind on error, and confirm the finished file is what `serializeDocument` would produce (FR-014, FR-016, FR-017)

**Checkpoint**: hostile writes cannot damage a map; every refusal is readable.

---

## Phase 6: User Story 4 — One command connects the agent (P2)

**Goal**: `ctour mcp install` edits only the agent's own configuration; `ctour doctor`
reports whether the connection is live.

**Independent Test**: `quickstart.md` scenarios 12–15 — a second run leaves every file
byte-identical, other configured servers stay intact, a machine with no agent exits 5
and writes nothing, and `doctor` names the fix.

### Tests for User Story 4

- [x] T026 [P] [US4] Add `tests/cli/mcp-install.test.ts`: a JSON configuration with other servers and unrelated top-level keys is edited without disturbing any other byte (FR-022); the entry is inserted into an existing `mcpServers` object and into a file that has none; an existing entry with a different command is replaced in place; a second run is byte-identical and reports `already connected` (FR-023); a truncated file exits 3 unchanged; a TOML configuration gains the block at the end and is not appended twice; inline `mcp_servers` exits 3 naming the line; no agent detected prints both snippets, writes nothing and exits 5; the unreadable case also prints the entry and its path (FR-024); the entry's `command` is the resolved absolute path of the running executable (contracts/agent-config.md, FR-021…FR-024, SC-005)
- [x] T027 [P] [US4] Add `tests/cli/mcp-doctor.test.ts`: a connected agent with a resolvable command is `ok`; a configured command that no longer exists fails with `ctour mcp install` as the fix; an absent entry is `ok` with the hint; an unreadable configuration fails; `doctor --json` carries `agent:<name>` checks; no file changes on any run (FR-025, SC-006)

### Implementation for User Story 4

- [x] T028 [US4] Create `cli/mcp/config-text.ts`: a scanner that finds a key's value span and an object's insertion point in JSON without re-serializing, `spliceJsonEntry(text, path, value)` and `replaceJsonValue(text, path, value)` returning new text, `appendTomlBlock(text, header, entries)`, and `verify(text, before)` re-parsing and confirming every pre-existing key equals what it was before the edit (research D11, contracts/agent-config.md §Editing rules)
- [x] T029 [US4] Create `cli/mcp/agents.ts`: the four-adapter table from `contracts/agent-config.md` with `configPath` resolved against the injected `home`, `detect()`, `readConnection()`, `installInto()` using `config-text.ts`, `connectionFor()` resolving `command` to an absolute path when it exists and `ctour` otherwise, and `reportAgents()` returning one line per detected agent (FR-021…FR-025)
- [x] T030 [US4] Add `install()` to `cli/commands/mcp.ts`: detect, install into each detected agent, print the aligned report, print the restart hint, print the entry and its path when a file could not be read, return the first failure code in the order 3, 5, 0, and write nothing when no agent was detected (contracts/agent-config.md §Output, §Exit codes)
- [x] T031 [US4] Update `cli/lib/run.ts`: dispatch `mcp install` to `install()`, add exit code 5 to `exitCodeFor`, keep `mcp` out of `--json`, and refresh the `HELP` text with the `mcp` and `mcp install` lines
- [x] T032 [US4] Extend the exit-code table in `specs/012-ctour-cli/contracts/cli.md` with code 5 and its meaning, keeping 0–4 unchanged (plan.md Complexity Tracking)
- [x] T033 [US4] Add the agent checks to `cli/commands/doctor.ts`: one `agent:<name>` check per detected agent, `ok` with a hint when not connected, failing with the missing path when the configured command is gone, and nothing written on any run (FR-025)

**Checkpoint**: a person runs one command and the agent reaches the map; `doctor` says whether it still does.

---

## Phase 7: User Story 5 — The shipped instructions teach the loop (P3)

**Goal**: the text an agent receives says how to work with the map, not only what it is.

**Independent Test**: the instructions an agent receives from `initialize` name the
read-change-read-back loop, the ten waypoint types, the state token and the meaning of
a refusal, and match the file in the repository.

### Tests for User Story 5

- [x] T034 [US5] Extend `tests/cli/mcp-protocol.test.ts`: the `instructions` returned by `initialize` name the read-change-read-back loop, list all ten waypoint types from `WAYPOINT_TYPES`, explain that writes carry the state token, and state that a refusal means nothing was written (FR-026)

### Implementation for User Story 5

- [x] T035 [US5] Replace the text in `cli/mcp/instructions.ts` with the full version the tests describe, written for a model rather than a person: numbered loop, the ten types, the token rule, the refusal rule, and one instruction not to invent waypoints the person did not ask for (FR-026, research D10)

**Checkpoint**: a freshly connected agent behaves the way the map expects.

---

## Phase 8: Polish & Cross-Cutting

- [x] T036 [P] Rewrite the agent section of `README.md` in place: business framing under `## What it does today`, the protocol and instruction delivery under `## Architecture`, and `ctour mcp` / `ctour mcp install` under `## Technical detail`, keeping the fixed section order and adding no duplicate text
- [x] T037 [P] Add `docs/adr/011-agent-access.md` recording the decisions that would otherwise be re-argued: no protocol dependency, state token over file bytes, no IPC with the interface, instructions delivered in the handshake, one adapter table with byte-preserving edits, exit code 5
- [x] T038 Run `quickstart.md` scenarios 1–16 by hand against a temporary `HOME` and `CTOUR_HOME`, and record any divergence in `specs/013-mcp-agent-access/quickstart.md` rather than silently fixing it
- [x] T039 Run the full verification: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx playwright test`, `npm run build:cli`, and `npm pack --dry-run` confirming `dist/cli.mjs` carries the protocol server (FR-028, SC-001…SC-008)
- [x] T040 Record the run in `TEST_RESULTS.md` in the repository's required format, newest on top, with per-test durations from the JSON reporters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup — blocks every story
- **US1 (Phase 3)**: needs Foundational
- **US2 (Phase 4)**: needs Foundational; independent of US1 (different capabilities)
- **US3 (Phase 5)**: needs US2 (it hardens the write path US2 introduces)
- **US4 (Phase 6)**: needs Foundational only; independent of US1–US3
- **US5 (Phase 7)**: needs Foundational (the handshake) and US1 (its test file)
- **Polish (Phase 8)**: needs all stories

### Within Each Story

Tests first, then the module, then the registration. Each phase ends at a checkpoint
that can be demonstrated on its own.

### Parallel Opportunities

- T001 and T002
- T009 and T010; T014, T015 and T016; T026 and T027
- T036 and T037
- After Foundational, US4 can run beside US1/US2/US3 by a second person

## Parallel Example: User Story 2

```bash
Task: "Add write and placement tests to tests/cli/mcp-write.test.ts"
Task: "Add placement tests to tests/cli/mcp-placement.test.ts"
Task: "Add the end-to-end write test to tests/acceptance/mcp.spec.ts"
```

## Implementation Strategy

### MVP First

Setup → Foundational → US1 → validate with scenarios 1–3. That alone gives an agent
the map as context, which is the reason the feature exists.

### Incremental Delivery

1. Foundational + US1 → read-only agent (MVP)
2. US2 → the agent writes, the person watches
3. US3 → the write path can be trusted
4. US4 → the feature becomes reachable without hand-editing configuration
5. US5 → the agent uses the map the way the map intends

## Notes

- [P] means a different file with no incomplete dependency
- Tests are written first inside each story and must fail before the implementation task
- Commit per phase; each checkpoint is demonstrable
- Do not touch `app/` in this feature: the interface already handles external writes (011)

## Notes

- T001: the harness lives in `tests/cli/mcp-fixtures.ts` and is imported, not collected, because its name does not end in `.test.ts`.
- T003–T007: one module per responsibility, as planned. Two additions the plan did not name: `readProjects` reports `readable` per map so a damaged file is not shown as an empty one, and `readStrict` exists so every write path reads through `readMapStrict` and refuses a lossy file.
- T014/T022: writes and refusals share `tests/cli/mcp-write.test.ts`; the refusal half also asserts a byte-for-byte unchanged map after every single refusal.
- T016: the acceptance test checks the waypoint counter (`N of N waypoints`) inside one second because the canvas renders only visible nodes (`onlyRenderVisibleElements` in `MapCanvas.tsx`); the label is asserted separately after Fit View. Twenty writes, twenty one-second checks.
- T017: the clearance settled at 224 px horizontally or 80 px vertically, measured against the `w-52` node (208 px wide, about 74 px tall); `research.md` D8 was updated to match.
- T026/T027: the configuration-splice cases live beside the install cases in `tests/cli/mcp-install.test.ts`; `doctor` keeps its own file.
- T030: `installAgent` separates the workspace home (`CTOUR_HOME`) from the user home (`homedir()`), because the agents' configuration files live under the user's home and must not follow `CTOUR_HOME`. `main` gained a `userHome` override so tests never touch a real `~/.claude.json`.
- T032: `specs/012-ctour-cli/contracts/cli.md` gained row 5 and nothing else.
- T034/T035: the instruction text was written in full during Phase 2, because the server cannot answer `initialize` without it; US5 therefore delivers the assertions that pin its content, and the text was revised once to name the loop explicitly.
- T036/T037: README gained the agent paragraph under what it does, the protocol section under architecture and the two commands under technical detail; `docs/adr/011-agent-access.md` records the eight decisions.
- T038: scenarios 1, 2, 4, 6, 7, 9, 11, 12, 13 and 15 were also run by hand against a temporary `HOME` and `CTOUR_HOME`; 3, 5, 8, 10, 14 and 16 are covered by tests only. No divergence from `quickstart.md` was found, apart from `mcp install` printing its detected entries before the restart hint.
- `npm run build:cli` now marks `dist/cli.mjs` executable, so an agent can be pointed at an absolute path; `connectionFor()` still falls back to the bare name when the file is not executable.
