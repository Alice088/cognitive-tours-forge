# Implementation Plan: Application Shell

**Branch**: `010-app-shell` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-app-shell/spec.md`

## Summary

Replace the three-panel prototype with a local-first application shell: a
navigation rail holding projects and their maps, the map canvas at the centre, a
contextual inspector on the right and a single tour dock, all built from
shadcn/ui primitives on a semantic design-token layer with working light, dark
and system themes. Edits autosave into `.tours/*.tour.json` with browser-style
undo and redo, the workspace is a registry of project locations that the person
manages from inside the application, and everything the shell replaces is
deleted rather than left behind.

Two findings changed the scope stated in the spec, and both are recorded in
Complexity Tracking: the shell cannot be a working application without reading
map files to draw them, and FR-015 (autosave) cannot be honoured without writing
them. Reading and writing `.tours/*.tour.json` therefore belong to this feature.

## Technical Context

**Language/Version**: TypeScript 5 with `strict`, Node.js 20+ (22 used locally)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind 4,
shadcn/ui on Radix primitives, `lucide-react`, `@xyflow/react` 12, `zustand`
with a temporal (undo/redo) middleware, `next-themes`

**Storage**: `.tours/*.tour.json` inside each project repository, written
atomically; `~/.ctour/workspace.json` for the project registry and the last
opened view; no database, no remote service

**Testing**: Vitest + Testing Library for units (history, registry, tokens,
contrast); Playwright for acceptance, running against an isolated workspace
directory

**Target Platform**: Local application in a browser on localhost, macOS and
Linux, Node 20+

**Project Type**: Web application (single Next.js project, server routes used
for local filesystem access)

**Performance Goals**: panning, zooming, selecting, dragging and filtering
respond within 100 ms on a map of 250 waypoints and 40 tours (SC-010)

**Constraints**: No hosted deployment, no accounts, no network storage; the
interface must be operable at 360 px width; text must meet WCAG AA contrast in
both themes; no comments in code

**Scale/Scope**: Up to 50 projects, each with up to 3 maps; 250 waypoints and
40 tours per map; four surface states per surface (empty, loading, ready,
failed)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                   | Gate                                                                                                                                             | Status                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| I. Local First (NON-NEGOTIABLE)                             | No hosting, accounts, passcode or remote storage introduced; all durable state on local disk; all network calls stay on loopback                 | PASS                                            |
| II. The Map Lives With the Code                             | Shell reads and writes `.tours/*.tour.json`; writes atomic; collections sorted; stored paths repo-relative; one repository may hold several maps | PASS                                            |
| III. One Command to Start                                   | FR-028: adding a project happens inside the application, never by copying a path from a terminal                                                 | PASS                                            |
| IV. Agent Access Through MCP                                | Not touched by this feature; no agent surface added, none bypassed                                                                               | PASS                                            |
| V. Understanding Stays With the Person                      | No generated content; nothing in the shell authors text for the person                                                                           | PASS                                            |
| VI. The Interface Is the Product                            | shadcn/ui only; semantic tokens only; no literal colour utilities; three width bands; one place per action                                       | PASS, enforced by a lint rule and a review item |
| Additional Constraints: delete dead code in the same change | Everything this feature orphans (legacy panels, Prisma/Turso layer, hosted-site configuration, backup scripts) is removed in the same feature    | PASS, see Phase 6                               |

**Gate result**: PASS. No unjustified violations. Two justified deviations are
recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-app-shell/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── ui-shell.md      # Layout regions, width bands, keyboard and a11y contract
│   ├── workspace-api.md # Local endpoints the shell calls
│   └── map-file.md      # `.tours/*.tour.json` schema and write rules
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
├── layout.tsx                     # html, fonts, ThemeProvider, no analytics
├── page.tsx                       # redirects to the last opened view
├── (shell)/
│   ├── layout.tsx                 # AppShell: rail + canvas + inspector + dock
│   └── p/[projectId]/[mapFile]/page.tsx
├── components/
│   ├── ui/                        # shadcn/ui generated primitives
│   └── shell/
│       ├── AppShell.tsx
│       ├── WorkspaceRail.tsx
│       ├── ProjectGroup.tsx
│       ├── TourDock.tsx
│       ├── Inspector.tsx
│       ├── WaypointEditor.tsx
│       ├── TourEditor.tsx
│       ├── ThemeToggle.tsx
│       ├── AddProjectDialog.tsx
│       └── states/                 # EmptyWorkspace, EmptyMap, Loading, Failed
├── lib/
│   ├── theme/tokens.ts             # token names and contrast pairs
│   ├── theme/contrast.ts           # WCAG ratio computation
│   ├── store/map-store.ts          # per-map store + temporal history
│   ├── store/history.ts            # undo/redo controls, limit, branch discard
│   ├── store/selectors.ts
│   ├── workspace/registry.ts       # ~/.ctour/workspace.json, atomic
│   ├── workspace/service.ts        # list, add, create map, view state
│   ├── workspace/map-file.ts       # parse, serialize, atomic write
│   ├── workspace/types.ts
│   └── fs/safe-path.ts             # absolute path validation and containment
└── api/
    ├── workspace/route.ts          # GET projects, POST add project
    ├── workspace/browse/route.ts   # GET directory listing for the picker
    ├── workspace/[projectId]/maps/route.ts
    ├── workspace/view-state/route.ts
    └── maps/[projectId]/[mapFile]/route.ts   # GET and PUT map document

tests/
├── unit/                           # Vitest: history, map-file, registry, tokens
└── acceptance/                     # Playwright: the spec's user stories

.tours/                             # created inside a person's project, not here
```

**Structure Decision**: One Next.js application. The shell lives in a route
group so its layout is the only layout the map screens inherit. Filesystem work
is confined to `app/lib/workspace` and reached only through route handlers, so
nothing in a client component touches `fs`. The existing `app/api/*` Prisma
routes, `app/lib/db.ts`, `db-mappers.ts`, `sites.ts`, `edit-passcode.ts`,
`prisma/`, `scripts/`, `backups/` and `vercel.json` are removed in Phase 6
because Phase 3 orphans them.

## Complexity Tracking

> Violations of the spec's stated scope that must be justified, and one added
> dependency that needs a reason.

| Deviation                                                                                                                           | Why needed                                                                                                                                                        | Simpler alternative rejected because                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec Assumptions say reading and writing map contents is a separate feature, but this feature reads and writes `.tours/*.tour.json` | The shell must draw the map it navigates to (US1, US6) and FR-015 requires autosave of edits; a shell that cannot show or save a map is not a working application | Shipping the shell against a stub source leaves every map screen empty and makes FR-015 untestable; the constitution requires each phase to land a working application                                                                                                                                               |
| Phase 6 deletes the Prisma/Turso layer and hosted-site configuration inside this feature                                            | Phase 3 removes the last caller; leaving them is dead code, which the constitution forbids                                                                        | Deferring the deletion to a later feature leaves two data paths and a second, unreachable source of truth in the tree                                                                                                                                                                                                |
| `zustand` + temporal middleware added                                                                                               | FR-018 to FR-023 require a bounded, branch-discarding history over every mutation, and FR-029 requires persisted view state                                       | A hand-written reducer with past/future stacks was considered; it is roughly the same code the middleware already provides and is tested, but carries no ecosystem dependency. Chosen against because the history rules (branch discard, limit, per-map isolation) are the parts most likely to be got wrong by hand |

## Phases

| Phase | Delivers                                                                                                       | Verifiable at the end                                                |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0     | Research and design artifacts (this file, research.md, data-model.md, contracts/, quickstart.md)               | Every technical unknown resolved                                     |
| 1     | Token layer, themes, shadcn/ui setup, `AppShell` skeleton with four regions and three width bands              | Shell renders in light and dark at 1440/1024/360, no literal colours |
| 2     | Workspace registry, directory browsing, add project, create map, view-state persistence, endpoints             | A project can be added from inside the app and survives a restart    |
| 3     | Map file read/write, per-map store, map canvas wired to the store                                              | A real `.tours/*.tour.json` renders; an edit lands in the file       |
| 4     | Inspector editing, tour dock, undo and redo, the four surface states                                           | US1, US5, US6 acceptance pass                                        |
| 5     | Responsiveness, keyboard, accessible names, contrast checks                                                    | US2, US4 acceptance pass; SC-003, SC-004, SC-008                     |
| 6     | Delete what Phases 1 to 5 orphan: legacy panels, Prisma layer, hosted configuration, backup scripts, analytics | Build and type check pass with no reference to any removed module    |

## Post-Design Constitution Re-check

| Principle                    | After Phase 1 design                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Local First               | PASS — `contracts/workspace-api.md` exposes only loopback endpoints; no telemetry is added and the existing analytics import is removed in Phase 6                                     |
| II. Map Lives With the Code  | PASS — `contracts/map-file.md` fixes the schema, stable ordering and atomic write; `safe-path.ts` forbids writes outside the project root                                              |
| VI. Interface Is the Product | PASS — `contracts/ui-shell.md` fixes the token names, the three width bands, the single-place-per-action table and the keyboard contract; a lint rule rejects literal colour utilities |

No new gates were introduced by the design.
