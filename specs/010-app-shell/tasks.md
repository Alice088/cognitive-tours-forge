---
description: 'Task list for the Application Shell feature'
---

# Tasks: Application Shell

**Input**: Design documents from `/specs/010-app-shell/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included. They are not optional in this repository (`AGENTS.md` requires a recorded test run after every change), and three success criteria are only checkable by automation: SC-003 (contrast pairs), SC-009 (twenty-change undo replay), SC-010 (100 ms at 250 waypoints).

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and demonstrated on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1 … US6, from `spec.md`
- Every task names the exact file it touches

## Path Conventions

Single Next.js project at the repository root: `app/`, `app/components/`, `app/lib/`, `app/api/`, `tests/`. The plan's structure (`specs/010-app-shell/plan.md`) is authoritative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the libraries and tooling the whole feature is built on.

- [x] T001 Add runtime dependencies `zustand`, `zundo`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge` and dev dependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` to `package.json`, and add the scripts `"test:unit": "vitest run"`, `"test:unit:watch": "vitest"`, `"test:e2e": "playwright test"`
- [x] T002 [P] Initialise shadcn/ui in the repository (`npx shadcn@latest init`, Tailwind 4, CSS variables) producing `components.json` and `app/lib/utils.ts` with the `cn` helper, wiring the alias `@/*` to `./app/*` in both `components.json` and `tsconfig.json`
- [x] T003 [P] Generate the shadcn/ui primitives this feature uses into `app/components/ui/`: `button`, `input`, `textarea`, `label`, `select`, `dialog`, `sheet`, `tooltip`, `badge`, `separator`, `scroll-area`, `collapsible`, `dropdown-menu`, `skeleton`, `alert`, `sonner`
- [x] T004 [P] Create `vitest.config.ts` (jsdom environment, `tests/setup.ts` importing `@testing-library/jest-dom`, `@/` alias) and `tests/setup.ts`
- [x] T005 [P] Rewrite `playwright.config.ts`: `testDir: './tests/acceptance'`, remove `globalSetup: './tests/snapshot-positions.ts'`, `webServer.command` becomes `next dev` with `env: { CTOUR_HOME: './.tmp/e2e-home' }`, keeping `reuseExistingServer: false`. Move the five existing specs from `tests/*.spec.ts` to `tests/acceptance/`, delete `tests/snapshot-positions.ts` and `tests/keep-positions.ts`, and drop `dotenv-cli` usage
- [x] T006 [P] Extend `eslint.config.mjs` with a rule that rejects literal colour utilities and raw hex values in `className` strings (`no-restricted-syntax` over `JSXAttribute[name.name='className']` and `Literal` matching `/(bg|text|border|ring|fill|stroke)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}/` and `/#[0-9a-fA-F]{3,8}\b/`)

**Checkpoint**: `npm run lint`, `npm run typecheck`, `npx vitest run` and `npx playwright test --list` all succeed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The token layer, the local storage layer and the shell skeleton every story renders into.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Define the semantic token layer in `app/globals.css` exactly as `specs/010-app-shell/contracts/ui-shell.md` §3 lists it: the surface tokens (`background`, `foreground`, `card`, `popover`, `muted`, `border`, `input`, `ring`, `primary`, `secondary`, `accent`, `destructive` and their `-foreground` pairs), the shell tokens (`canvas`, `canvas-grid`, `rail`, `rail-foreground`, `dock`, `dock-foreground`), the ten `waypoint-*` type tokens with `-foreground` pairs, and `state-new` / `state-dimmed` / `state-selected`, each defined twice (light in `:root`, dark in `.dark`) and exposed through `@theme inline`
- [x] T008 [P] Create `app/lib/theme/contrast.ts` (relative luminance and WCAG ratio) and `app/lib/theme/tokens.ts` (the enumerated text-on-surface, border and waypoint-badge pairs per theme), with `tests/unit/theme-contrast.test.ts` asserting at least 4.5:1 for body text and 3:1 for large text and borders
- [x] T009 Create `app/components/shell/ThemeProvider.tsx` (`next-themes`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`) and `app/components/shell/ThemeToggle.tsx` (light / dark / system, one icon-only control per state with an `aria-label` naming the resulting theme), then update `app/layout.tsx` to set `suppressHydrationWarning` on `<html>`, mount the provider, and keep the existing font wiring
- [x] T010 [P] Create `app/lib/workspace/types.ts` with `WorkspaceRegistry`, `ProjectRef`, `MapRef`, `MapDocument`, `Waypoint`, `Edge`, `Tour`, `Stop`, `LoadReport`, `ViewState` matching `specs/010-app-shell/data-model.md` §1–§3, including the constraint that a waypoint `id` "Starts with `w-`, unique, stable across edits" and `version` is `1`
- [x] T011 [P] Create `app/lib/fs/safe-path.ts` exposing `resolveInside(root, candidate)` and `isWithinHome(candidate)`, normalising and resolving before any filesystem call, with `tests/unit/safe-path.test.ts` covering `..` traversal, absolute input, symlink-free prefix collisions (`/a/bc` versus `/a/b`) and the filesystem root
- [x] T012 Create `app/lib/workspace/map-file.ts` implementing `contracts/map-file.md`: `readMap(projectRoot, file)` returning `{ document, report }` with normalisation (unknown type → `Open Question`, missing or non-finite position → `{ x: 0, y: 0 }`, orphaned edges and stops dropped and counted, absolute `file` dropped and counted), `writeMap(projectRoot, file, document)` validating the whole document first, confirming containment, writing `<file>.tmp` then renaming, and serialising keys in the contract's order with `waypoints`, `edges`, `tours` sorted by `id` while `stops` keeps its authored order; covered by `tests/unit/map-file.test.ts`
- [x] T013 Create `app/lib/workspace/registry.ts` reading and writing `$CTOUR_HOME/workspace.json` (default `~/.ctour/workspace.json`) atomically, assigning ids as directory basenames made unique with `-2`, `-3` suffixes, storing absolute normalised paths with no trailing separator, and recovering from unparseable content by renaming it to `workspace.json.corrupt-<timestamp>` and starting empty; covered by `tests/unit/registry.test.ts`
- [x] T014 Create `app/lib/workspace/service.ts` with `listProjects()` (availability `ready` / `unavailable` / `uninitialised`, maps listed from `.tours/` directory entries only, never parsing a document), `addProject(path)`, `createMap(projectId, name)` (slugged `<slug>.tour.json`, `.tours/` created on demand), `readViewState()` and `writeViewState(view)` per `contracts/workspace-api.md`
- [x] T015 Implement the route handlers per `contracts/workspace-api.md`: `app/api/workspace/route.ts` (GET, POST), `app/api/workspace/browse/route.ts` (GET, directories only, `isProject` when `.tours/` exists), `app/api/workspace/[projectId]/maps/route.ts` (POST), `app/api/workspace/view-state/route.ts` (GET, PUT), `app/api/maps/[projectId]/[mapFile]/route.ts` (GET returning `{ document, report }`, PUT returning `409 stale-document` when the file changed since the client's read), each returning the contract's error codes as `{ error, message, detail? }`
- [x] T016 [P] Create `app/lib/store/map-store.ts` (one store per open map via a factory, `document`, `status`, `failure`, `selectedWaypointId`, `saveStatus`) wrapped in `zundo` temporal history limited to 50 entries with `partialize` scoped to `document`, plus `app/lib/store/history.ts` (`undo`, `redo`, `canUndo`, `canRedo`, `commit`, `clearHistory`) and `app/lib/store/selectors.ts`; covered by `tests/unit/history.test.ts` asserting branch discard after stepping back, forward replay in the same order, the 50-entry limit, and that selection is never recorded
- [x] T017 [P] Create the route group: `app/(shell)/layout.tsx`, `app/(shell)/p/[projectId]/[mapFile]/page.tsx` reading `tour` and `step` from the query, and `app/page.tsx` redirecting to the stored view state or rendering the workspace-root state
- [x] T018 Create `app/components/shell/AppShell.tsx` composing the four regions from `contracts/ui-shell.md` §1 as nested CSS grid (`rail | canvas | inspector`, dock inside the canvas column), with region placeholders that keep a stable layout before content loads and expose `data-region="rail|canvas|inspector|dock"` for acceptance assertions

**Checkpoint**: Foundation ready. `npm run test:unit` green; the shell renders four empty regions in both themes.

---

## Phase 3: User Story 1 — One coherent workspace (Priority: P1) 🎯 MVP

**Goal**: Four regions, one place per piece of information, no control that does nothing.

**Independent Test**: Open the app with one project and one map; confirm the rail, the map, the inspector and the dock are each the only place their content appears, and that every control does something observable.

### Tests for User Story 1

- [x] T019 [P] [US1] Write `tests/acceptance/shell-regions.spec.ts` covering US1 scenarios 1–3: all four regions visible without scrolling or overlap, the tour name/step/next control present only in the dock, and a scan of every rendered `button`/`a`/`[role=button]` in `data-region` nodes asserting each one has a visible effect or a disabled-with-reason state

### Implementation for User Story 1

- [x] T020 [US1] Create `app/components/shell/MapCanvas.tsx` rendering `@xyflow/react` with `onlyRenderVisibleElements`, nodes and edges derived from the store document through `app/lib/store/selectors.ts`, pan/zoom/fit and a type filter derived from the ten waypoint types
- [x] T021 [P] [US1] Create `app/components/shell/WaypointNode.tsx` and `app/components/shell/EdgeLabel.tsx`, memoised, taking primitive props (`id`, `label`, `type`, `selected`), styling only from `waypoint-*` and `state-*` tokens
- [x] T022 [US1] Create `app/components/shell/TourDock.tsx` holding the current tour's name, `"Step 2 of 5"`, previous/next, edit-tour, export (existing `app/lib/tour-markdown.ts`), undo/redo and autosave status — and nothing else
- [x] T023 [US1] Create `app/components/shell/Inspector.tsx` switching between waypoint mode and tour mode from `selectedWaypointId` and the active tour, rendering its two child surfaces as separate components so a mode switch does not remount the region
- [x] T024 [US1] Create `app/components/shell/WorkspaceRail.tsx` and `app/components/shell/ProjectGroup.tsx` listing every project with its maps, reflecting the active map with `aria-current="page"`, and consuming `app/lib/workspace/use-workspace.ts` (added in T025)
- [x] T025 [US1] Add `app/lib/workspace/use-workspace.ts`: a client hook fetching `GET /api/workspace`, exposing `projects`, `lastView`, `status`, `refresh`, and a `useMapDocument(projectId, mapFile)` companion fetching `GET /api/maps/...` into the store created in T016
- [x] T026 [US1] Wire `app/(shell)/p/[projectId]/[mapFile]/page.tsx` to load the document into the store, set `status` to `loading` / `ready` / `failed`, and render the shell; a failed load renders the failure region rather than an empty canvas
- [x] T027 [US1] Delete the presentation components this phase orphans: `app/components/CognitiveToursApp.tsx`, `TourBar.tsx`, `WaypointDetail.tsx`, `WaypointForm.tsx`, `TourMarkdownView.tsx`, `ClaudeCodePanel.tsx`, `StartHere.tsx`, plus `app/lib/mock-data.ts`, `app/lib/seen.ts`, `app/lib/make-room.ts`, `app/lib/waypoint-colors.ts` once no file imports them
- [x] T028 [US1] Run `npm run test:unit`, `npx playwright test tests/acceptance/shell-regions.spec.ts`, `npm run lint`, `npm run typecheck`; record the run in `TEST_RESULTS.md` at the repository root in the required format

**Checkpoint**: US1 fully functional and independently testable. This is the MVP.

---

## Phase 4: User Story 2 — A theme correct on every surface (Priority: P2)

**Goal**: Light, dark and follow-the-system, with every surface resolved from tokens and contrast verified.

**Independent Test**: Open the app in light and dark with every panel, dialog, tooltip and badge visible; no surface keeps the opposite theme's colour; explicit choice survives reload; system changes are followed within a second.

### Tests for User Story 2

- [x] T029 [P] [US2] Write `tests/acceptance/theme.spec.ts`: dark by system, explicit light surviving reload, explicit dark surviving reload, system change applied while open, and a computed-style sweep asserting every `data-region` subtree resolves foreground and background from the active theme's tokens

### Implementation for User Story 2

- [x] T030 [US2] Audit and convert every remaining literal colour utility in `app/components/**` and `app/globals.css` to tokens; the rule from T006 must pass with zero suppressions
- [x] T031 [P] [US2] Style the React Flow surfaces from tokens in `app/globals.css` (canvas background, grid dots, edge stroke, edge label, selection outline, minimap if present) so the canvas follows the theme instead of React Flow's defaults
- [x] T032 [P] [US2] Theme the shadcn/ui primitives' variants used by the shell (dialog overlay, sheet, tooltip, badge, input, select, scroll-area) by verifying each uses token classes and adding nothing literal
- [x] T033 [US2] Run `npm run test:unit` (contrast table), `npx playwright test tests/acceptance/theme.spec.ts`, `npm run lint`; record the run in `TEST_RESULTS.md`

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Switching projects and maps from one place (Priority: P3)

**Goal**: Every project and its maps in the rail, switching restores the last map, tour and stop, unavailable projects stay listed and recoverable.

**Independent Test**: With two projects and three maps, switch between all of them repeatedly and confirm each returns to the state it was left in; rename one project directory and confirm it is marked, read-only and repointable.

### Tests for User Story 3

- [x] T034 [P] [US3] Write `tests/acceptance/navigation.spec.ts` covering US3 scenarios 1–5 and SC-006/SC-011: switching restores map/tour/stop, relaunch restores all four, an unavailable project opens read-only and can be repointed, and the rail reopens from a single always-visible control when collapsed

### Implementation for User Story 3

- [x] T035 [US3] Make navigation a route change in `app/components/shell/WorkspaceRail.tsx` and `ProjectGroup.tsx` (`/p/[projectId]/[mapFile]?tour=&step=`), updating `PUT /api/workspace/view-state` on every navigation so FR-009 and FR-029 share one mechanism
- [x] T036 [US3] Implement restore-on-launch in `app/page.tsx`: apply the stored view, degrading one level at a time (step → tour → map → workspace root) when a value no longer resolves, and never blocking the launch
- [ ] T037 [US3] Implement the unavailable project path: rail marker with a tooltip naming the missing path, read-only opening from the last cached document, and "Choose a new location" reusing the picker from T046 to call `POST /api/workspace` after removing the stale entry
- [x] T038 [US3] Implement rail collapse and reopen in `app/components/shell/AppShell.tsx` — collapsing returns the space to the canvas (grid column, not visibility), and one control that is always present reopens it
- [x] T039 [US3] Delete `app/lib/project.ts`, `app/lib/repo.ts`, `app/lib/code-folder.ts` and `app/lib/sites.ts` if no file imports them after the rail rewrite; run the unit and acceptance suites and record the run in `TEST_RESULTS.md`

**Checkpoint**: US1, US2, US3 all work independently.

---

## Phase 6: User Story 4 — Usable at any width (Priority: P4)

**Goal**: Three width bands, no horizontal scrolling outside the canvas, every control reachable at 360 px.

**Independent Test**: Open at 1440, 1024, 768 and 360 px; confirm no clipping, no unreachable control, no horizontal scroll outside the canvas.

### Tests for User Story 4

- [x] T040 [P] [US4] Write `tests/acceptance/responsive.spec.ts` running the same assertions at 1440, 1024, 768 and 360 px: region visibility per band, no horizontal overflow outside the canvas, dock controls usable, one drawer at a time, dismissing a drawer returns space to the canvas

### Implementation for User Story 4

- [x] T041 [US4] Implement the width bands in `app/components/shell/AppShell.tsx` per `contracts/ui-shell.md` §2: `>=1280px` expanded rail (240 px) and docked inspector (320 px); `768–1279px` icon-only rail (56 px) with labels on hover and focus, 300 px inspector; `<768px` rail and inspector as sheets with a persistent opener, dock fixed to a single scrollable bottom row
- [x] T042 [US4] Enforce canvas minimums in `app/components/shell/MapCanvas.tsx` and `app/globals.css`: at least 320 px wide, never horizontally scrollable, grid track sizing with `minmax(0, 1fr)` so children cannot force overflow
- [x] T043 [US4] Ensure only one drawer is open at a time in `app/components/shell/AppShell.tsx`, dismissing it restores focus to its opener; then run `tests/acceptance/responsive.spec.ts` and record the run in `TEST_RESULTS.md`

**Checkpoint**: US1–US4 all work independently.

---

## Phase 7: User Story 5 — Always knows what to do next (Priority: P5)

**Goal**: Empty, loading and failure states each name the situation and offer exactly one primary action; a project can be added and a map created without leaving the app.

**Independent Test**: Reach the empty workspace, a project without a map, a loading map and a failed map; each names the situation and shows one primary action.

### Tests for User Story 5

- [x] T044 [P] [US5] Write `tests/acceptance/states.spec.ts` covering SC-007/SC-012: empty workspace → add project → map listed, project without a map → create map → map opens, slow load shows a skeleton with data actions disabled, failure shows a plain-language message with retry, and each state exposes exactly one primary action

### Implementation for User Story 5

- [x] T045 [US5] Create `app/components/shell/states/` — `EmptyWorkspace.tsx`, `EmptyProject.tsx`, `LoadingSurface.tsx` (skeleton matching the region's shape), `FailedSurface.tsx` (message plus single retry) — each rendering one primary action and nothing else
- [x] T046 [US5] Create `app/components/shell/AddProjectDialog.tsx` on the shadcn `dialog` + `scroll-area`: a breadcrumb, a directory-only list from `GET /api/workspace/browse`, a path field the person may also type or paste, and a confirm action mapping the contract's error codes (`not-a-directory`, `not-readable`, `already-registered`, `refused-self`) to plain sentences
- [x] T047 [US5] Create `app/components/shell/CreateMapDialog.tsx` posting to `POST /api/workspace/[projectId]/maps`, mapping `invalid-name`, `name-taken` and `project-unavailable`, and opening the new map at once on `201`
- [x] T048 [US5] Announce surface state changes through one live region in `app/components/shell/AppShell.tsx` (`aria-live="polite"`), and disable data-dependent controls visibly while loading; then run the acceptance suite and record the run in `TEST_RESULTS.md`

**Checkpoint**: US1–US5 all work independently.

---

## Phase 8: User Story 6 — Editing without leaving the map (Priority: P6)

**Goal**: Edit waypoints and tours in the inspector with the map visible, autosaved, with browser-style undo and redo over every change the interface can make.

**Independent Test**: Edit a waypoint description and reorder two stops entirely from the side surfaces with the map continuously visible; then step back and forward through the changes and confirm exact state replay.

### Tests for User Story 6

- [x] T049 [P] [US6] Write `tests/acceptance/editing.spec.ts` covering US6 scenarios 1–5 and SC-009: edit persists to `.tours/*.tour.json` after the pause, Escape keeps it, a twenty-change sequence replays exactly forward after stepping back to the beginning, and a new change after stepping back discards the forward branch

### Implementation for User Story 6

- [x] T050 [US6] Create `app/components/shell/WaypointEditor.tsx` inside the inspector: label, type (select over the ten types), description, notes, repo-relative `file` path, with validation surfacing the map-file contract's messages and no modal
- [x] T051 [P] [US6] Create `app/components/shell/TourEditor.tsx` inside the inspector: name, description, stop list with reorder controls (keyboard-operable, not drag-only) and stop removal, committed to the store as one history entry per reorder
- [x] T052 [US6] Implement autosave in `app/lib/store/map-store.ts` and `app/lib/workspace/use-map-document.ts`: a debounce of 800 ms after the last change, `PUT /api/maps/...`, `saveStatus` transitions `idle → pending → saved | failed`, a failed save keeps the person's text and exposes one retry, and history is cleared only on map switch, never on save
- [x] T053 [US6] Wire undo and redo to the dock controls and to `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` and `Ctrl+Y`, scoped per map, disabled at the ends of the stack, and suspended while focus is in a text field so text undo still works there
- [x] T054 [US6] Coalesce rapid edits to one field into a single history entry (commit on pause or blur) in `app/lib/store/history.ts` and `app/lib/store/map-store.ts`, and ensure create, edit, move, delete and reorder of waypoints, edges, tours and stops each produce exactly one entry
- [x] T055 [US6] Handle `409 stale-document` in `app/lib/workspace/use-map-document.ts` and `app/components/shell/AppShell.tsx`: a non-dismissible notice naming that the map changed on disk, with exactly two actions — reload or overwrite — never resolving silently
- [x] T056 [US6] Run `tests/acceptance/editing.spec.ts` with the full unit suite and record the run in `TEST_RESULTS.md`

**Checkpoint**: All six user stories work independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance guarantees, accessibility, and removal of everything Phases 1–8 orphan.

- [x] T057 [P] Add `tests/unit/fixtures/build-map.ts` generating a map of a given waypoint and tour count, and `tests/acceptance/performance.spec.ts` measuring pan, zoom, select, drag and search keystroke against the 100 ms budget at 250 waypoints and 40 tours (SC-010)
- [x] T058 [P] Implement the oversized-map report (FR-025) in `app/lib/store/selectors.ts` and `app/components/shell/MapCanvas.tsx`: above 250 waypoints or 40 tours the map still opens and a dismissible note states that it exceeds the supported size
- [x] T059 [P] Accessibility sweep: `aria-label` on every icon-only control naming the action, visible focus ring at 3:1 in both themes, `aria-current` on the active project and map, dock step announced politely, focus order rail → dock → canvas → inspector, `Escape` closing the topmost surface, plus `tests/acceptance/keyboard.spec.ts` for SC-008
- [x] T060 Delete the orphaned server layer: `prisma/`, `prisma.config.ts`, `app/lib/db.ts`, `app/lib/db-mappers.ts`, `app/lib/edit-passcode.ts`, `app/api/data/`, `app/api/waypoints/`, `app/api/edges/`, `app/api/tours/`, `app/api/backup-nightly/`, `app/api/reset-nightly/`, `scripts/`, `backups/`, `vercel.json`; remove the dependencies `@prisma/*`, `@libsql/client`, `better-sqlite3`, `@vercel/analytics`, `@vercel/blob`, `dotenv-cli`; remove the `postinstall: prisma generate` script; delete the `@vercel/analytics` import from `app/layout.tsx`; delete the five superseded files in `tests/acceptance/` that the new specs replace
- [x] T061 [P] Update `README.md` in the fixed order — business logic, then architecture (four regions, token layer, local storage, workspace registry), then technical detail (commands, `CTOUR_HOME`, troubleshooting) — and add `docs/adr/0001-local-first-shell.md` recording why hosting, Prisma and per-team sites were removed
- [x] T062 Run `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`; confirm nothing under `app/` or `tests/` references a removed module; record the final run in `TEST_RESULTS.md`
- [x] T063 Execute `specs/010-app-shell/quickstart.md` end to end against a throwaway `CTOUR_HOME` and a throwaway project directory, and correct any drift between the guide and the built application

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies; start immediately
- **Foundational (Phase 2)**: requires Setup; **blocks every user story**
- **US1 (Phase 3)**: requires Foundational — no story dependencies
- **US2 (Phase 4)**: requires Foundational; T030 must run after US1's components exist (it audits them), so in practice after Phase 3
- **US3 (Phase 5)**: requires Foundational; touches the rail that US1 creates
- **US4 (Phase 6)**: requires Foundational and the regions from US1
- **US5 (Phase 7)**: requires Foundational; T046/T047 feed US3's T037
- **US6 (Phase 8)**: requires Foundational and US1's inspector surface
- **Polish (Phase 9)**: requires all six stories

### Within a story

Tests first (they must fail), then components, then wiring, then deletion of what the story orphans, then a recorded test run.

### Parallel opportunities

- Setup: T002–T006 in parallel (T003 requires T002)
- Foundational: T008, T010, T011, T016, T017 in parallel after their stated inputs; T012–T015 are a chain
- US1: T019 (tests) and T021 (node rendering) in parallel with T020
- US2–US6: the `[P]` test task of each phase can be written in parallel with the previous phase's final run
- Polish: T057, T058, T059, T061 in parallel

---

## Parallel Example: User Story 1

```bash
# After T018 completes, three independent files can be written at once:
Task: "Write tests/acceptance/shell-regions.spec.ts for US1 scenarios 1-3"
Task: "Create app/components/shell/WaypointNode.tsx and EdgeLabel.tsx, memoised"
Task: "Create app/components/shell/TourDock.tsx with the tour's single home"
```

---

## Implementation Strategy

### MVP first

1. Phase 1 and Phase 2 — foundation, no UI promises yet
2. Phase 3 (US1) — four regions, one place per fact, no dead controls
3. **Stop and validate**: run T019 and `quickstart.md` scenarios 1 and 3
4. Demo the shell against a real `.tours/` directory

### Incremental delivery

Each later phase is independently demonstrable: US2 dark mode, US3 project switching, US4 phone width, US5 onboarding states, US6 editing with undo. No phase leaves the application less usable than the one before it.

### Notes

- `[P]` = different files, no dependency on an incomplete task
- A task that deletes code is not a cleanup afterthought: it is what keeps the constitution's "no dead code" rule true at every commit
- Commit after each phase at minimum; the pre-commit hook runs prettier and `tsc --noEmit`
- History is per map and per session by design (FR-023); never persist it
- T037 stays open on one point: an unavailable project is marked, can be
  repointed, and refuses writes, but it does not yet open read-only from a
  cached copy of the map — that cache belongs to the import/export feature
