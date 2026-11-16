# Tasks: Maps in and out

**Input**: Design documents from `/specs/014-map-import-export/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the constitution requires every change to ship with a test run, and `research.md` D19 fixes the three layers.

**Organization**: one phase per user story, in priority order. US1 and US2 are both P1 but independent: US1 only writes copies elsewhere, US2 only writes into `.ctour/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different file, no dependency on an earlier unfinished task
- **[Story]**: US1 / US2 / US3 / US4
- Every task names the exact file it touches

---

## Phase 1: Setup

**Purpose**: the vocabulary the rest of the feature imports, so no refusal code is invented twice.

- [x] T001 Create `app/lib/workspace/exchange.ts` with `ExchangeError`, `ImportRefusalCode`, `ExchangeCode`, the one-sentence refusal table from `contracts/exchange-api.md`, and the `ImportPreview`, `ImportResult`, `ExportResult`, `FolderPreview`, `FolderResult` types from `data-model.md`
- [x] T002 [P] Add `assertInsideHome(path: string): string` to `app/lib/fs/safe-path.ts` — resolves, checks against `$HOME` with the existing `isWithinHome`, returns the real path or throws `ExchangeError('outside-home')`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the four primitives every story uses. No story can start until these compile and their tests pass.

**⚠️ CRITICAL**: US1–US4 all depend on this phase.

- [x] T003 [P] Add `writeMapIfAbsent(projectRoot: string, file: string, document: MapDocument): Promise<string | null>` to `app/lib/workspace/map-file.ts` — serialise, write `<target>.tmp`, `fs.link` to the target, unlink the temporary, return `null` on `EEXIST` (D4); the target still goes through `mapPath`
- [x] T004 In `app/lib/workspace/exchange.ts` add `freeName(file: string, taken: string[]): string | null` (`-2` … `-100`, else `null`, D3), `freeCopyName(folder: string, file: string): Promise<string>` (D8), `copyOut(source: string, destinationFolder: string): Promise<{ file: string; path: string; replacedName: string | null }>` (byte copy, no parse, D7) and `previewPath(path: string, projectRoot: string): Promise<ImportPreview>` built on `readMap` + `normalizeDocument`
- [x] T005 [P] Add `mode` to `browse` in `app/lib/workspace/service.ts` and `GET /api/workspace/browse?mode=files` in `app/api/workspace/browse/route.ts` — `entries` gain `kind: 'folder' | 'file'` and `size` for `*.json` files that do not start with a dot; absent or `folders` keeps today's response exactly
- [x] T006 Extend `app/components/shell/FolderBrowser.tsx` with a `mode: 'folders' | 'files'` prop — files are listed, selectable, and a file selection is reported through `onChooseFile`, folders keep `onChoose` and the up-navigation
- [x] T007 Extend `app/lib/workspace/use-workspace.ts` with `previewMap(path|folder, projectId)`, `exportMaps({ projectId, mapFile?, all?, folder })` and `importMaps({ projectId, path?, folder?, acceptLosses? })` over the existing `requestJson`, surfacing `detail` from the error envelope as counts

**Checkpoint**: `exchange.ts`, `map-file.ts`, `service.ts`, the browse route, the browser and the client hooks are in place; every story is now independent.

---

## Phase 3: User Story 1 — Take a map out of a project as one file (Priority: P1) 🎯 MVP

**Goal**: save a copy of the open map into a folder the person chooses, byte-identical to what the project holds, refusing when the project write fails.

**Independent Test**: open a map, save a copy, and compare the file with `.ctour/<name>.tour.json` — `cmp` says identical; the copy after an unsaved edit contains the edit.

- [x] T008 [US1] Write `tests/unit/exchange.test.ts` first: `copyOut` writes the exact bytes including hand-formatting, never replaces an existing file, reports the name it used; `freeCopyName` walks `-2`, `-3`. Run it and see it fail
- [x] T009 [US1] Write the US1 scenarios in `tests/acceptance/exchange.spec.ts`: a copy of the seeded map, a copy taken while an edit is pending, a second copy into the same folder, and the announcement text. Run it and see it fail
- [x] T010 [US1] Implement the single-map branch of `POST /api/exchange/export` in `app/api/exchange/export/route.ts` per `contracts/exchange-api.md` — `projectId` + `mapFile` + `folder`, `source: 'project' | 'last-known'`, `target-not-folder` (409), `outside-home` (403), `unknown-project` / `unknown-map` (404)
- [x] T011 [US1] Create `app/components/shell/ExportDialog.tsx` — shadcn `Dialog` over `FolderBrowser`, a destination line, a confirm button, and the list of names that will be written; no colour literals, tokens only
- [x] T012 [P] [US1] Create `app/components/shell/MapActions.tsx` — an action bar in the canvas top-right with one control, "Save a copy", collapsing to an icon button below `md`, `aria-label` on the icon form
- [x] T013 [US1] Wire `MapActions` and `ExportDialog` into `app/components/shell/MapWorkspace.tsx` — flush the pending save before calling the route (FR-002), announce `Saved main.tour.json to …`, and append ` (last known version)` when `source === 'last-known'` (FR-005)
- [x] T014 [US1] Implement FR-003 in `app/components/shell/MapWorkspace.tsx`: when the pending save fails, refuse the copy with the write's own sentence and leave the project untouched — no file, no partial write

**Checkpoint**: US1 works alone. A map can leave a project and arrive intact on a machine where this feature does not exist.

---

## Phase 4: User Story 2 — Put a map file into a project (Priority: P1)

**Goal**: choose a file from `$HOME`, read the preview the server produced, confirm, and get a new map in `.ctour/` that the rail lists and the screen opens.

**Independent Test**: import a file whose name is taken; the preview says `main-2`, the old `main` is byte-identical afterwards, and the new map shows the counts the preview promised.

- [x] T015 [US2] Extend `tests/unit/exchange.test.ts` with naming and refusal cases: `mapFileName` of `Q3 Roadmap.tour.json` is `q3-roadmap.tour.json`; a name with no alphanumerics is `name-unusable`; `writeMapIfAbsent` leaves an existing file untouched and returns `null`; the retry picks `-2` after an `EEXIST`; every refusal leaves the folder listing unchanged. Run and see it fail
- [x] T016 [US2] Add the US2 scenarios to `tests/acceptance/exchange.spec.ts`: import and open, taken name, lossy confirmation (cancel writes nothing), not-a-map refusal, unreachable project refused, rail lists the map. Run and see it fail
- [x] T017 [US2] Implement the single-file form of `GET /api/exchange/preview` in `app/api/exchange/preview/route.ts` — `path` + `projectId`, returns the preview or a 200 preview carrying `refusal`, `403 outside-home`, `400 invalid-request`
- [x] T018 [US2] Implement the single-file form of `POST /api/exchange/import` in `app/api/exchange/import/route.ts` — `losses-not-accepted` (409) carrying the counts in `detail`, `project-unavailable` (409) before any write, `name-exhausted` (409), and `normalizeDocument` → `validateDocument` → `writeMapIfAbsent` → `writeCachedMap` in that order (FR-014, FR-027)
- [x] T019 [US2] Create `app/components/shell/ImportDialog.tsx` — file mode of `FolderBrowser`, a preview block naming the map and its counts, a checkbox that is the explicit confirmation when any entry cannot be represented (FR-013), the `tooBig` statement (FR-017), and a refusal state that offers no confirm
- [x] T020 [US2] Add "Bring in maps" to `app/components/shell/ProjectGroup.tsx` beside the existing "Create a map", opening `ImportDialog` for that project
- [x] T021 [P] [US2] Add the same entry point to `app/components/shell/ProjectHome.tsx` so a project with no maps can receive one
- [x] T022 [US2] On success in `app/components/shell/ImportDialog.tsx`: announce `Imported q3-roadmap: 8 waypoints, 3 links, 2 tours.`, refresh the workspace snapshot, and `router.push` to the new map so it opens without a reload (FR-015, FR-016)

**Checkpoint**: US1 and US2 both work; a copy taken in US1 imports through US2 and reports the same counts.

---

## Phase 5: User Story 3 — Carry this machine's workspace to another machine (Priority: P2)

**Goal**: one file carries the projects, the last view and the last known maps; bringing it in matches folders explicitly and adds nothing twice.

**Independent Test**: export from a temporary `CTOUR_HOME` with six maps, import into an empty one, and see the same projects, the same map count and the same last opened map.

- [x] T023 [P] [US3] Create `app/lib/workspace/bundle.ts` — `buildBundle(home)`, `parseBundle(text)` with `bundle-missing | bundle-unreadable | bundle-not-json | bundle-shape | bundle-version`, `planImport(bundle, { projects, skip }, home)` implementing D12's six-step order, `applyPlan` writing through `registerProject` / `relinkProject` / `writeCachedMap` / `writeLastView`, and `serializeBundle` with the fixed key order of `data-model.md`
- [x] T024 [US3] Write `tests/unit/bundle.test.ts` against `bundle.ts`: round trip preserves names, paths and maps; `lastView` becomes a name at export and back; version 2 refused with the workspace untouched; plan order for `add` / `already-added` / `relink` / `already-added` on a second run / `missing-folder` / `skipped` / ignored flag; a travelled map is written to the cache only when the folder lacks it; the last view is withheld when its map is absent. Run and see it fail
- [x] T025 [US3] Create `cli/commands/workspace.ts` — `exportWorkspace({ file, home, userHome })` and `importWorkspace({ file, projects, skip, home, userHome })` returning the report shapes, with the atomic write and the two-space serialisation of `contracts/workspace-command.md`
- [x] T026 [US3] Extend `cli/lib/run.ts` — `workspace` in `COMMANDS`, `workspace export|import` dispatch, `--project <name>=<folder>` (repeatable), `--skip <name>` (repeatable), `--json`, and the `HELP` block for both subcommands and exit codes 0/1/2/3
- [x] T027 [P] [US3] Extend `cli/lib/report.ts` with `workspaceExported` and `workspaceImported` renderers — one line per project, the rerun hint on its own line for a missing folder, the summary line, and the `last view` line including `kept: …`
- [x] T028 [US3] Write `tests/cli/workspace.test.ts` through `main()` with `Overrides`: export then import into an empty home, import twice for idempotency, a moved folder reported with exit 1 and fixed by `--project`, `--skip` honoured, a non-bundle file exit 3, `--json` shapes, and a destination outside `$HOME` refused. Run and see it fail
- [x] T029 [US3] Write `tests/acceptance/workspace-bundle.spec.ts` — spawn the real `dist/cli.mjs workspace export` against a seeded temporary `CTOUR_HOME`, import into an empty one, start the server with the second home, and assert the rail lists the projects and the last view opens

**Checkpoint**: a workspace moves by hand, and nothing in it was invented on the way.

---

## Phase 6: User Story 4 — Move a project's maps together (Priority: P3)

**Goal**: export every map of a project into one folder, and bring a folder of maps in, skipping names that are taken and naming every skip.

**Independent Test**: export four maps, import them into a project that already holds one of the four — five maps, one reported skip, nothing replaced.

- [x] T030 [US4] Add the `all: true` branch to `app/api/exchange/export/route.ts` — iterate the project's map files, add cache-only maps when the folder is unreachable, a failing map becomes a `skipped` entry and the rest proceed (D9)
- [x] T031 [US4] Add the folder form to `GET /api/exchange/preview` in `app/api/exchange/preview/route.ts` — `folder` + `projectId`, one entry per `*.json` file, `refused` separated, subfolders not descended
- [x] T032 [US4] Add the folder form to `POST /api/exchange/import` in `app/api/exchange/import/route.ts` — each entry through the single-map path, a taken name produces the next free name and a `skipped` sentence, entries never abort each other (FR-025, FR-026)
- [x] T033 [US4] Extend `app/components/shell/ExportDialog.tsx` with an `all` mode that lists every map name that will be written and the names it had to change
- [x] T034 [US4] Extend `app/components/shell/ImportDialog.tsx` with a folder mode that shows one row per entry, the skipped ones by name with their sentence, and a single confirm for the rest
- [x] T035 [US4] Add "Export all maps" to `app/components/shell/MapActions.tsx`, reaching the same dialog with `all`, so the set has exactly one place next to the single copy
- [x] T036 [US4] Add the US4 scenarios to `tests/acceptance/exchange.spec.ts`: four maps out with four identical files, three in and one skip, a non-map file in the folder reported by name with the others still added

**Checkpoint**: every story is independently functional; the set path is the single-map path iterated, not a second implementation.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T037 [P] Write `docs/adr/012-map-exchange.md` — the eight decisions that shape the feature: server-side copy into a chosen folder, byte copy, exclusive create, losses confirmed not assumed, the command for the machine, names not ids, folder beats bundle, paths inside `$HOME`
- [x] T038 [P] Update `README.md` — one business paragraph on why a map must be able to leave and return, a "What travels and what stays" section under architecture, `ctour workspace export|import` in the command list, and two troubleshooting rows (a refused import, a missing folder after a move)
- [x] T039 [P] Extend `specs/012-ctour-cli/contracts/cli.md` with the `workspace` command group and its exit codes, and `specs/013-mcp-agent-access/contracts/mcp-tools.md` with the sentence that import and `read_map` share `normalizeDocument` and no tool changed
- [x] T040 Add the isolation scan from `quickstart.md` scenario 15 to `tests/unit/exchange.test.ts` — `app/lib/workspace/exchange.ts` and `bundle.ts` contain no `fetch`, `http`, `https` or `net`
- [ ] T041 Run the whole suite — `npx vitest run`, `npx playwright test` — and record the run at the top of `TEST_RESULTS.md` with the per-test durations, the command, the branch and the totals
- [x] T042 Run `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check` on touched files, `npm run build:all` from `package.json`, and `npm pack --dry-run`; confirm `dist/cli.mjs` is present and executable and the file count in the pack listing moves only by the new sources
- [ ] T043 Walk `quickstart.md` end to end against the production build and correct either `specs/014-map-import-export/quickstart.md` or the behaviour where they disagree — no scenario may stay aspirational

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 → Phase 2**: T004 needs T001's types; T002 is independent of both.
- **Phase 2 → Phases 3–6**: blocked, no exceptions.
- **Phases 3 and 4** (both P1) are independent of each other and can run in parallel; US1 shares `exchange.ts` with US2 only through reads.
- **Phase 5** depends on Phase 2 only — `bundle.ts` is a separate module and `cli/commands/workspace.ts` is a separate file.
- **Phase 6** depends on US1 (T010), US2 (T017, T018) and T019/T011 for the dialogs; it is an extension of those routes, not a new stack.
- **Phase 7** depends on every story that ships.

### Story completion order

```text
Setup (T001–T002)
      │
Foundational (T003–T007)
      ├───────────────┬────────────────┬──────────────────┐
      ▼               ▼                ▼                  ▼
   US1 (T008–T014)  US2 (T015–T022)  US3 (T023–T029)   (US4 waits)
      │               │                                   │
      └───────┬───────┘                                   │
              ▼                                           │
          US4 (T030–T036) ◀───────────────────────────────┘
              │
              ▼
      Polish (T037–T043)
```

### Within each story

- Tests first, run and seen failing.
- Module before route, route before dialog, dialog before wiring.
- A story is finished only when its acceptance scenarios pass in the production build.

### Parallel opportunities

- T002 beside T001.
- T003 and T005 beside T004 (three different files).
- US1 and US2 phases can be staffed at the same time (T008–T014 vs T015–T022, disjoint files except `exchange.spec.ts` and `exchange.test.ts` — those two files stay with one owner).
- T023 (bundle module) may run beside the whole US1/US2 work.
- T037, T038, T039 are three different documents.

### Parallel Example: end of Phase 2

```text
Task: "T003 [P] writeMapIfAbsent in app/lib/workspace/map-file.ts"
Task: "T005 [P] browse mode=files in app/lib/workspace/service.ts + app/api/workspace/browse/route.ts"
Task: "T004 freeName + copyOut + previewPath in app/lib/workspace/exchange.ts"
```

### Parallel Example: User Story 3

```text
Task: "T023 [P] [US3] app/lib/workspace/bundle.ts"
Task: "T025 [US3] cli/commands/workspace.ts"
Task: "T027 [P] [US3] cli/lib/report.ts renderers"
```

---

## Implementation Strategy

### MVP first

1. Phase 1 + Phase 2.
2. Phase 3 (US1). **Stop and validate**: save a copy, `cmp` it, take a copy with a pending edit.
3. Ship. A map that can leave is already the missing half of "the map is a file".

### Incremental delivery

1. US1 → a map leaves the project intact.
2. US2 → a map arrives, previewed and never overwriting. With US1 this closes the round trip; `SC-002` becomes testable.
3. US3 → the machine moves.
4. US4 → the set moves; at this point four maps cost one action.
5. Polish → the ADR, the README, the contract rows, the recorded run.

### Stop points

- After US1: FR-001 … FR-006 verified alone.
- After US2: FR-007 … FR-017 verified alone; nothing in US1 regressed.
- After US3: FR-018 … FR-023 verified with the real binary.
- After US4: FR-024 … FR-026; FR-027 … FR-029 asserted across all four.
- After Polish: `quickstart.md` walked, `TEST_RESULTS.md` recorded.

---

## Notes

- `[P]` means a different file and no unfinished dependency — `exchange.ts` and `exchange.test.ts` are single-owner files by design.
- Every refusal sentence lives in one table in `exchange.ts`; a route may not invent its own.
- No task adds a dependency, changes the map format or its version, or touches `cli/mcp/`.
- Nothing in this feature deletes a file.

## Notes

- **T005** — `browse(target, mode)` gained the mode as a second parameter rather than
  an options object; the response keeps `name`/`isProject` and adds `kind`, so an
  existing caller reads the same fields.
- **T004/T018** — the copy and import orchestration lives in
  `app/lib/workspace/exchange.ts` (`exportMaps`, `importOne`, `importFolder`), so the
  two routes only parse a body and map errors. `handleError` learned `ExchangeError`
  and `HomePathError`.
- **T015** — unknown waypoint types are dropped on import through
  `normalizeDocument(raw, { dropUnknownTypes: true })`. The interface keeps
  substituting `Open Question`; an import states the loss and asks first. This is
  what makes "8 waypoints in, 6 out" true.
- **T019** — the loss confirmation is a native checkbox with a token-based accent
  rather than a new `ui/checkbox.tsx` primitive: one control did not justify a file.
- **T025** — the import report is built in `cli/commands/workspace.ts` from
  `BundleResult`; `lastView` and `lastViewNote` are separate fields so the line can
  say either the restored view or `kept: …`.
- **T032** — a folder import skips a file whose derived name is already in the
  project (`<file> is already in this project.`) instead of suffixing it; a single
  import still suffixes. That is the difference between FR-025 and FR-009.
- **T033/T034** — both dialogs reset their own state in the `onOpenChange` wrapper,
  not in an effect: `react-hooks/set-state-in-effect` rejects the effect form.
- **T041 — not done as written.** The full `npx playwright test` was interrupted by
  the user; only `exchange.spec.ts` (12) and `workspace-bundle.spec.ts` (5) ran, on
  top of a complete `npx vitest run` (35 files / 320 tests). `TEST_RESULTS.md` records
  exactly that and says what did not run. The other acceptance specs have not been
  re-run since `FolderBrowser.tsx` and `browse` changed.
- **T043 — not done.** `quickstart.md` was not walked by hand; its scenarios are
  covered by the tests above but the guide itself is unverified.
