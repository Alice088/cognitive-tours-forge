# Tasks: Live Map Sync

**Input**: Design documents from `/specs/011-file-sync/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required — the constitution makes a shipped change carry tests, and every task below that changes behaviour names its test file.

**Organization**: One phase per user story, in priority order. Each phase leaves a working application.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `US1`…`US5`, matching the user stories in `spec.md`
- Every task names the exact file it creates or changes

## Path Conventions

Single Next.js application: `app/` for product code, `tests/unit/` and `tests/acceptance/` for tests, `specs/011-file-sync/` for this feature's documents.

---

## Phase 1: Setup

**Purpose**: The shared vocabulary of the feature — event shapes both sides compile against, fixture helpers that write to the map from a test, and a test environment that can watch a real directory.

- [x] T001 Create `app/lib/workspace/sync-events.ts` with `MapChangedEvent`, `MapUnreadableEvent`, `MapGoneEvent`, `MapsChangedEvent`, `SyncEvent`, the `SyncEventKind` union and `parseSyncEvent(raw: string): SyncEvent | null`, shaped exactly as `contracts/sync-events.md`
- [x] T002 [P] Add fixture helpers to `tests/acceptance/fixtures.ts`: `mapPathFor(file: string): string`, `writeRawMap(text: string): void`, `mutateMapFile(change: (document: MapDocument) => MapDocument): void`, `deleteMapFile(filter: string): void` (node `fs`, no HTTP)
- [x] T003 Add `test.environmentMatchGlobs` to `vitest.config.mts` mapping `tests/unit/sync*.test.ts` to `node` so directory watching is not run under jsdom

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The channel. One watcher per project folder, canonical comparison, own-write suppression, the event stream, and the write-path record that makes an own save silent.

**⚠️ CRITICAL**: No user story can be tested until this phase is complete.

- [x] T004 [P] Write `tests/unit/sync-events.test.ts`: `parseSyncEvent` accepts each of the four payloads, returns `null` for malformed JSON and for an unknown `type`
- [x] T005 [P] Write `tests/unit/sync-watch.test.ts` against a real `fs.mkdtemp` folder: a write delivers one `map-changed` with the normalised document and `mtimeMs`; identical content delivers nothing; five writes inside the debounce window deliver one event with the final content; a write whose canonical text equals the recorded own write delivers nothing; a missing file delivers one `map-gone`; invalid JSON delivers one `map-unreadable` and one more only after the file becomes readable and invalid again; `close()` on the last subscription stops the watcher and a later write delivers nothing
- [x] T006 Create `app/lib/workspace/sync.ts`: registry on `globalThis` keyed by project id holding one watch handle and its subscriptions; `subscribe({ projectId, root, file, emit })` and `subscribeList({ projectId, root, emit })`; 120 ms debounce; per-subscription `deliveredText` and `fileState`; comparison via `normalizeDocument` + `serializeDocument`; `fs.watch` on `path.join(root, '.tours')`; closes the handle with the last subscription
- [x] T007 Add `recordOwnWrite`, `ownWriteFor` and `stopAllSyncWatchers()` to `app/lib/workspace/sync.ts`, and make T005's own-write and close assertions pass
- [x] T008 Create `app/api/maps/[projectId]/[mapFile]/events/route.ts` per `contracts/sync-events.md`: `400 invalid-name` for a `mapFile` that fails the map-file pattern, `404 unknown-project`, `200 text/event-stream` with `retry: 1000`, one `data:` frame per event, `: ping` every 25 s, subscription closed on `request.signal` abort
- [x] T009 Record every successful save in `app/api/maps/[projectId]/[mapFile]/route.ts` by calling `recordOwnWrite(projectId, file, serializeDocument(body.document), result.mtimeMs)` after `writeMap` and before the response
- [x] T010 Add to `tests/acceptance/sync.spec.ts` a `openMap()` helper and one smoke test: opening the fixture map opens a stream and the page receives a `: ping`-free 200 without errors

**Checkpoint**: a change written to the fixture map reaches an open page; an own save does not.

---

## Phase 3: User Story 1 — A change made outside the application appears in it (P1) 🎯 MVP

**Goal**: An agent, an editor or a script writes the map file; the open map shows the new content within a second, without a reload, keeping the person where they were.

**Independent Test**: With the fixture map open and `t-1` at step 0 selected, change a waypoint label with `fs.writeFileSync`; the new label appears within one second, the selection, tour and step are unchanged, and no notice appears.

### Tests for User Story 1

- [x] T011 [P] [US1] Write `tests/acceptance/sync-outside.spec.ts`: an outside change appears within one second, the selected waypoint stays selected, the open tour and step are unchanged, and no notice appears (FR-001, FR-002, SC-001)
- [x] T012 [P] [US1] Extend `tests/acceptance/sync-outside.spec.ts`: rewriting the file with identical content changes nothing; five changes in one second settle into the final state with no intermediate rendering (FR-011, FR-012, SC-008)
- [x] T013 [P] [US1] Write `tests/acceptance/sync-rail.spec.ts`: copying the map to `second.tour.json` makes `second` appear in the rail within one second and removing it makes it disappear, with no reload (FR-013, SC-006)
- [x] T014 [P] [US1] Write `tests/unit/map-store-external.test.ts`: `applyExternal` keeps `selectedWaypointId`, `activeTourId` and `step` when they still exist, clears the selection when the waypoint is gone, keeps the tour and step when the tour survives, and never touches history

### Implementation for User Story 1

- [x] T015 [US1] Add `applyExternal({ document, report, mtimeMs })` to `app/lib/store/map-store.ts` per T014
- [x] T016 [US1] Create `app/lib/workspace/use-map-sync.ts`: one `EventSource` per open map, `parseSyncEvent` on `message`, callbacks `onChanged`, `onUnreadable`, `onGone`, `onListChanged`; opens nothing when `readOnly`; closes on unmount; on `visibilitychange` to visible fetches `/api/maps/{projectId}/{mapFile}` once and hands the result to `onChanged`
- [x] T017 [US1] Wire the hook into `app/components/shell/MapWorkspace.tsx`: on `map-changed` with nothing unsaved call `applyExternal`, and announce the update in the existing live region without moving focus (FR-017)
- [x] T018 [US1] Wire `maps-changed` to `refresh()` from `useWorkspace` in `app/components/shell/MapWorkspace.tsx` so the rail follows the folder, and keep the current map open when its own file is the one that changed
- [x] T019 [US1] Run `tests/acceptance/sync-outside.spec.ts`, `tests/acceptance/sync-rail.spec.ts` and `tests/unit/map-store-external.test.ts`, and fix what fails

**Checkpoint**: US1 works alone — the map follows the disk and the rail follows `.tours/`.

---

## Phase 4: User Story 2 — The application's own saves do not echo back (P2)

**Goal**: Saving is invisible to sync: no notice, no reload, no flicker, and undo keeps every step.

**Independent Test**: Type in a waypoint description, wait for the 800 ms autosave, then undo twenty times; no notice ever appears, the map never reloads, and each undo restores a state the person produced.

### Tests for User Story 2

- [x] T020 [P] [US2] Write `tests/acceptance/sync-own.spec.ts`: typing a label and waiting for the save shows no notice, no reload, and the caret stays where it was (FR-003, FR-020)
- [x] T021 [P] [US2] Extend `tests/acceptance/sync-own.spec.ts`: twenty edits then twenty undos all succeed; the count of change notices is zero (SC-002)
- [x] T022 [P] [US2] Write `tests/unit/sync-own-write.test.ts`: after `recordOwnWrite`, the event produced by that write is suppressed and `deliveredText` advances; an external change made immediately afterwards is still delivered; the own-write record is replaced, not accumulated, per file

### Implementation for User Story 2

- [x] T023 [US2] Make the autosave path in `app/components/shell/MapWorkspace.tsx` treat the save in flight as "nothing changed": an event equal to the saved document updates `mtimeMs` only, and a second save scheduled during a burst sends the newest document once (FR-020)
- [x] T024 [US2] Confirm the 409 race path cannot fire for an own write: `expectedMtimeMs` comes from the last save result or the last applied external change in `app/components/shell/MapWorkspace.tsx`
- [x] T025 [US2] Run `tests/acceptance/sync-own.spec.ts` and `tests/unit/sync-own-write.test.ts`, and fix what fails

**Checkpoint**: US1 and US2 both hold — the map follows the disk and never reacts to itself.

---

## Phase 5: User Story 3 — Neither side is lost when both changed (P3)

**Goal**: When the file changes while the person has unsaved typing, one notice names what changed and offers exactly two actions; taking the file's version restarts history and says so; keeping the person's version writes it and raises no further notice.

**Independent Test**: Type into a waypoint field, change the same map from another process, and see one notice naming the changed waypoint; Reload shows the file's version and announces the history restart; Keep mine writes the typed text and the notice disappears for good.

### Tests for User Story 3

- [x] T026 [P] [US3] Write `tests/unit/diff.test.ts`: added, removed and changed waypoints, links and tours are counted; at most three names per kind are returned in document order; identical documents produce an empty summary; a moved stop counts as a tour change
- [x] T027 [P] [US3] Write `tests/acceptance/sync-conflict.spec.ts`: with unsaved typing and an outside change, exactly one notice appears, it names the changed waypoint, and the typed text is still in the field (FR-004, FR-005, FR-018, SC-003)
- [x] T028 [P] [US3] Extend `tests/acceptance/sync-conflict.spec.ts`: Reload applies the file's version, says the history restarted, and undoing afterwards does not return to a version the file never held (FR-006)
- [x] T029 [P] [US3] Extend `tests/acceptance/sync-conflict.spec.ts`: Keep mine writes the person's document, no second notice follows, and the file on disk contains the typed text (FR-007)
- [x] T030 [P] [US3] Extend `tests/acceptance/sync-conflict.spec.ts`: a change that lands while a save is in flight produces one notice, not two, and the same two actions (FR-019)

### Implementation for User Story 3

- [x] T031 [US3] Create `app/lib/workspace/diff.ts` with `summariseChange(before: MapDocument, after: MapDocument): ChangeSummary` and the `DiffBucket` shape from `data-model.md`
- [x] T032 [US3] Create `app/components/shell/MapNotice.tsx`: one notice, priority read-only → unreadable → outside change → save failure → oversized; props carry the text and at most two shadcn `Button` actions; existing banners move out of `MapWorkspace.tsx` in the same change
- [x] T033 [US3] Add a `clearHistory()` action to `app/lib/store/map-store.ts` using the temporal store handle, and call it only from the reload action
- [x] T034 [US3] Add the pending outside change to `app/components/shell/MapWorkspace.tsx`: hold the incoming document, show `MapNotice` with `summariseChange`, keep typing untouched, and replace the notice rather than stacking (FR-019)
- [x] T035 [US3] Implement both actions in `app/components/shell/MapWorkspace.tsx`: Reload applies the held document, clears history, adopts its `mtimeMs`, and announces the restart; Keep mine writes the current document immediately and dismisses the notice (FR-007)
- [x] T036 [US3] Route the existing `stale-document` failure into the same notice kind so the two paths cannot both be visible (contract `map-file-errors.md`)
- [x] T037 [US3] Run `tests/unit/diff.test.ts` and `tests/acceptance/sync-conflict.spec.ts`, and fix what fails

**Checkpoint**: US1–US3 hold — the map follows the disk, ignores itself, and asks rather than losing work.

---

## Phase 6: User Story 4 — It still works where change notifications do not (P4)

**Goal**: On a filesystem that reports nothing, the same updates arrive within two seconds, and an idle map stays idle.

**Independent Test**: With the poll mechanism forced and a 20 ms comparison interval, write the file and see one `map-changed` within the interval budget; after the last subscription closes, no timer remains.

### Tests for User Story 4

- [x] T038 [P] [US4] Write `tests/unit/sync-poll.test.ts`: with a watcher that throws, the subscription reports changes by comparison; a change is delivered once, not on every tick; two consecutive changes collapse in the same way the watcher collapses them; the handle's `mode` is `poll` and never returns to `watch` (FR-001 slow path, FR-016, SC-005)
- [x] T039 [P] [US4] Extend `tests/unit/sync-poll.test.ts`: after `close()` the interval is cleared — no pending timers under fake timers, which is what keeps ten idle minutes free of load (SC-009)
- [x] T040 [P] [US4] Extend `tests/acceptance/sync-outside.spec.ts`: after `page.evaluate` on `visibilitychange` (hidden, then visible) exactly one reconcile request is made and no notice appears for a change made while hidden (FR-016)

### Implementation for User Story 4

- [x] T041 [US4] Add the comparison loop to `app/lib/workspace/sync.ts`: `pollMs` default 2000, injectable for tests, started only while a subscription exists, cleared on the last close, and chosen when `fs.watch` throws or is unavailable
- [x] T042 [US4] Handle a `null` filename from `fs.watch` in `app/lib/workspace/sync.ts` by re-reading each subscription's own file, so an event without a name can neither be missed nor doubled
- [x] T043 [US4] Run `tests/unit/sync-poll.test.ts` and the visibility test in `tests/acceptance/sync-outside.spec.ts`, and fix what fails

**Checkpoint**: US4 holds on a filesystem with no notifications, and the fast path is unaffected.

---

## Phase 7: User Story 5 — A file that cannot be read is not applied (P5)

**Goal**: Invalid, half-written or deleted content never reaches the map; the person sees the file and the reason, and can write their version back.

**Independent Test**: Write `<<<<<<< HEAD` into the map file; the map stays on screen, one notice names the file and the reason, nothing is saved, and restoring a valid file applies it and clears the notice.

### Tests for User Story 5

- [x] T044 [P] [US5] Write `tests/acceptance/sync-invalid.spec.ts`: merge markers, an empty file and truncated JSON each leave the map on screen with one notice naming the file and the reason (FR-008, SC-004)
- [x] T045 [P] [US5] Extend `tests/acceptance/sync-invalid.spec.ts`: restoring a valid document applies it and the notice disappears; no save is issued while the file was invalid (FR-009)
- [x] T046 [P] [US5] Extend `tests/acceptance/sync-invalid.spec.ts`: deleting the file keeps the document, offers to write it back, writes it back on request, and never sends an empty document (FR-010)
- [x] T047 [P] [US5] Write `tests/unit/sync-invalid.test.ts`: the server reports `map-unreadable` once per invalid document, `map-changed` once after recovery, and `map-gone` once per absence, never for a subscription that delivered nothing

### Implementation for User Story 5

- [x] T048 [US5] Add the `map-unreadable` and `map-gone` transitions to `app/lib/workspace/sync.ts` using `MapFileError` codes, and make T047 pass
- [x] T049 [US5] Handle both events in `app/lib/workspace/use-map-sync.ts` and `app/components/shell/MapWorkspace.tsx`: invalid content is never applied, the document is untouched, and the notice carries the file name and the reason
- [x] T050 [US5] Add the write-back action for a deleted file in `app/components/shell/MapWorkspace.tsx`, saving with `expectedMtimeMs: null` so the missing file is not treated as a stale one
- [x] T051 [US5] Run `tests/unit/sync-invalid.test.ts` and `tests/acceptance/sync-invalid.spec.ts`, and fix what fails

**Checkpoint**: all five stories hold independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T052 [P] Write `tests/acceptance/sync-readonly.spec.ts`: a read-only map opens no stream, and relinking the project makes sync start without a reload (FR-014)
- [x] T053 [P] Write `tests/unit/sync-local.test.ts`: the sync module imports nothing that performs a network request and the event payload contains no field outside `sync-events.ts` (FR-015)
- [x] T054 [P] Update `README.md` architecture section with the watch, the comparison rule and the two notice actions
- [x] T055 [P] Write `docs/adr/010-live-file-sync.md`: directory watch over file watch, canonical-text suppression, browser-owned conflict decision, poll fallback, with the alternatives from `research.md`
- [x] T056 Remove what this feature made dead: the banners left in `app/components/shell/MapWorkspace.tsx`, any duplicated reload or retry control, and unused exports found by `tsc --noEmit`
- [x] T057 Run `npm run test:unit` and `npm run test:e2e`, then record both in `TEST_RESULTS.md` with the command, branch and per-test durations from the JSON reporters
- [x] T058 Run `npm run typecheck`, `npm run lint` and `npm run build` from `package.json`, and fix anything that is not clean
- [x] T059 Walk `quickstart.md` scenarios 1–8 by hand where no test covers them, and correct the document where reality differs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on T001 and T003 — blocks every user story
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 (needs the hook and the apply path)
- **US3 (Phase 5)**: depends on US1 (needs the channel) and shares `MapWorkspace.tsx` with US2
- **US4 (Phase 6)**: depends on Foundational only; can be built before US3 if a filesystem without notifications is the user's priority
- **US5 (Phase 7)**: depends on Foundational and US1; independent of US2–US4
- **Polish (Phase 8)**: depends on all desired stories

### User Story Dependencies

- **US1 (P1)**: the only story with no story dependency
- **US2 (P2)**: needs US1's hook and apply path to observe that a save does not echo
- **US3 (P3)**: needs US1's channel; shares `MapWorkspace.tsx` with US2, so it follows it
- **US4 (P4)**: needs only the channel; its own file is `sync.ts`, so it can run beside US3 given care in that file
- **US5 (P5)**: needs the channel and the apply path; touches `MapWorkspace.tsx`, so it follows US3

### Within Each Story

- Tests first, failing, then implementation
- Server module before the hook; hook before the component
- `diff.ts` before the notice that uses it

### Parallel Opportunities

- T001, T002, T003 — different files
- T004, T005 — different test files
- T011, T012 share one file (sequential); T013 and T014 are different files and can run beside them
- T026, T027, T028, T029, T030 — five different files
- T038, T039 share one file; T040 is another file
- T044, T045, T046 share one file; T047 is separate
- T052, T053, T054, T055 — four different files

---

## Parallel Example: User Story 3

```bash
Task: "Write tests/unit/diff.test.ts"
Task: "Write tests/acceptance/sync-conflict.spec.ts"
Task: "Create app/lib/workspace/diff.ts"
```

The first two run beside each other; the third follows the summary rules the tests pin down.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1, then Phase 2 — the channel exists and a change reaches an open page
2. Phase 3 — the page applies it without losing the person's place, and the rail follows the folder
3. Stop and validate: an agent writes a waypoint and the person sees it appear. That is the half of the local-first promise `011` exists for.

### Incremental Delivery

1. US1 → the map follows the disk
2. US2 → saving stops looking like an outside change, which is the defect naive file watching produces
3. US3 → two writers, one choice, nothing lost
4. US4 → the same product on an awkward filesystem
5. US5 → malformed and missing files stop being able to destroy work

### Notes

- **T003** needed no configuration change: Vitest 5 removed `environmentMatchGlobs`, and the suite already runs `node:fs` under jsdom (checked with a real directory watch before writing the watcher tests).
- **T010** asserts the stream response is `text/event-stream` and that opening a map shows no notice.
- **T030** lives in `tests/acceptance/sync-conflict.spec.ts` as one notice during an in-flight save; the two actions are the same two buttons.
- **T036** is the stale-document branch of `MapNotice`: the same sentence and the same two actions as an outside change, so the two can never both be visible.
- **T056** also made `listMaps` internal, and moved the canonical serialiser to `app/lib/workspace/serialize.ts` so the browser can compare text without importing `node:fs`.
- **Watch registry** is keyed by project and root: a relinked project left an entry pointed at the old folder, and later streams silently watched a path that no longer existed. Found by the acceptance suite, fixed in `app/lib/workspace/sync.ts`.
- **Loading a map is not an edit**: the load path no longer schedules an autosave, so opening a map cannot write it back or recreate a file deleted a moment earlier.
- Extra tests written along the way: `tests/unit/sync-events.test.ts`, `tests/unit/sync-own-write.test.ts`, `tests/unit/sync-local.test.ts`, `tests/acceptance/sync-readonly.spec.ts`.
- **Follow-up after the audit**: the comparison loop now always runs, sync reads are strict (a document that would drop anything is refused), own writes are recorded in canonical form, a numbered save against a missing file is refused, a `409` with no real difference is retried once, an unreadable map offers "Keep mine", and a stricter notice order means a newer situation replaces an older one. Tests: `tests/unit/map-file.test.ts` (strict, canonical), `tests/unit/sync-watch.test.ts` (own write), `tests/unit/sync-poll.test.ts` (silent watcher), `tests/acceptance/sync-own.spec.ts` (cleared field), `tests/acceptance/sync-outside.spec.ts` (rewrite then edit), `tests/acceptance/sync-invalid.spec.ts` (lossy file, keep mine, typing after deletion).
