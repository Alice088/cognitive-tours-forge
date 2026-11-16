# Implementation Plan: Live Map Sync

**Branch**: `011-file-sync` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-file-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The open map follows the file on disk. The local server watches `.tours/` for
the open project, compares what it reads against the content it last read or
wrote, and pushes a change over a one-way event stream to the browser. The
browser decides what to do with it: apply it silently when there is nothing
unsaved, or show one notice offering "reload from disk" and "keep mine" when
there is. Own writes are recognised by content, not by a flag, so saving never
echoes back as a change. Where the filesystem reports nothing, a two-second
comparison gives the same result more slowly.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 22 (local server), React 19, Next.js 16 App Router

**Primary Dependencies**: `node:fs` (`watch`, `stat`, `readFile`), Next.js route handlers (`ReadableStream` for server-sent events), browser `EventSource`, `zustand` + `zundo` (existing store), shadcn/ui `Button` (existing)

**Storage**: the map file `.tours/<name>.tour.json` is the only source of truth; the existing local cache under `~/.ctour/cache/` keeps receiving the last saved copy. No new durable state.

**Testing**: Vitest for the watcher, the canonical comparison and the change summary against real temporary directories; Playwright for the end-to-end paths against the production build (`next build && next start`), writing to the fixture map from the test process while the page is open.

**Target Platform**: the person's machine: macOS and Linux (Node 20+). Windows is not a target this feature changes.

**Project Type**: single Next.js application (`app/`), filesystem access confined to `app/lib/workspace`, reached only from route handlers.

**Performance Goals**: an outside change visible within 1 s where the filesystem reports changes and within 2 s where it does not (FR-001); five changes in one second settle into one rendered state (SC-008); ten idle minutes produce no measurable load (SC-009).

**Constraints**: no network traffic beyond the local server (FR-015, constitution I); atomic writes preserved (constitution II); one map-level notice at a time (FR-019); sync suspended for a read-only map (FR-014); the autosave contract does not change (FR-020); no comments in code; no new dependencies if `fs.watch` plus a timer covers the cases, which research says it does.

**Scale/Scope**: one open map watched at a time per browser tab, up to 250 waypoints and 40 tours; at most a handful of tabs; one watcher per project folder, shared between subscriptions and closed with the last one.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                              | Gate                                                                          | Verdict                                                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Local First (NON-NEGOTIABLE)                        | No hosted deployment, no product data on the network.                         | PASS — the event stream is a local HTTP connection from the local server to the person's own browser; nothing leaves the machine and no state is stored anywhere but the file and the existing local cache. |
| II. The Map Lives With the Code                        | The file is the source of truth; writes atomic; no second copy.               | PASS — sync reads the file and never promotes browser state to truth; writes keep the existing temporary-file-and-rename path; the cache stays a fallback that is not read while the folder is reachable.   |
| III. One Command to Start                              | No extra manual step to reach a working map.                                  | PASS — nothing to configure, nothing to enable: watching starts when a map opens, and its absence on an unusual filesystem changes latency, not correctness.                                                |
| IV. Agent Access Through MCP                           | Shared implementation of the file contract; a human sees what an agent wrote. | PASS — this feature is what makes an agent's write visible to the person in the same second, through the same read path the interface already uses. No new write path is added.                             |
| V. Understanding Stays With the Person                 | No feature may be justified by "the AI will handle it".                       | PASS — sync shows a person what changed elsewhere; deciding which version survives stays a human choice (FR-004).                                                                                           |
| VI. The Interface Is the Product                       | shadcn/ui, tokens, one place per action, one notice.                          | PASS — the conflict choice uses the existing map-level notice area and existing `Button` variants; no new region, no duplicated control, notice text replaces rather than stacks (FR-019).                  |
| Additional: no comments, minimal diffs, tests recorded |                                                                               | PASS — one feature, one commit series, tests for every requirement, run recorded in `TEST_RESULTS.md`.                                                                                                      |

No violations. Complexity Tracking is therefore empty.

**Post-design re-check (after Phase 1)**: unchanged. The design adds one route
handler, one server module, one client hook and one notice component; the write
path gains an in-process record only. Nothing is stored outside the map file and
the existing local cache, no new dependency is introduced, and the notice area
stays a single place with a single action per situation.

## Project Structure

### Documentation (this feature)

```text
specs/011-file-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── sync-events.md
│   └── map-file-errors.md
├── checklists/requirements.md
└── tasks.md            (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── api/maps/[projectId]/[mapFile]/
│   ├── route.ts                    (existing GET/PUT)
│   └── events/route.ts             (new: server-sent events for one map)
├── components/shell/
│   ├── MapWorkspace.tsx            (existing: owns autosave; gains the notice)
│   ├── MapNotice.tsx               (new: the one map-level notice area)
│   └── WorkspaceRail.tsx           (existing: refreshes on maps-changed)
└── lib/workspace/
    ├── sync.ts                     (new: watcher manager, server only)
    ├── sync-events.ts              (new: event shapes shared by both sides)
    ├── diff.ts                     (new: what changed between two documents)
    ├── use-map-sync.ts             (new: client subscription hook)
    ├── map-file.ts                 (existing: canonical serialise, unchanged)
    └── service.ts                  (existing: loadMap/saveMap, unchanged)

tests/
├── unit/
│   ├── sync-watch.test.ts          (new: real directory, short timers)
│   └── diff.test.ts                (new: change summary)
└── acceptance/
    ├── sync.spec.ts                (new: outside change, own save, conflict,
    │                               unreadable, deleted, rail, read-only)
    └── fixtures.ts                 (existing: gains raw write and delete helpers)
```

**Structure Decision**: single Next.js application. The watcher is the only
new code that touches `fs`, and it lives beside the code that already does, in
`app/lib/workspace/sync.ts`, so the rule "filesystem access is reached only
through route handlers" holds. The event stream is a route handler next to the
existing map route, so one URL prefix owns one map. The client hook lives in
`app/lib/workspace` beside `use-workspace.ts`, which is where the browser's
view of the workspace already lives.

## Design Outline

### Server: one watcher per project folder

`sync.ts` holds a module-level registry on `globalThis` (survives dev hot
reloads) mapping project id to a watch handle: the `fs.watch` handle for the
project's `.tours/` directory plus the set of subscriptions. The directory is
watched, not the file, because the writer replaces the file by renaming a
temporary over it — the watched inode would be gone after the first save.

Each subscription knows one map file and the canonical text it last delivered.
On any directory event the watcher debounces for 120 ms, then, per
subscription, reads its own file and:

1. missing file → deliver `map-gone` once, and only when a document was
   delivered before;
2. unreadable or invalid → deliver `map-unreadable` once per transition;
3. canonical text equal to the last delivered text → deliver nothing, which is
   how "rewritten with identical content" and "own write" both become silence;
4. otherwise deliver `map-changed` with the normalised document, the load report
   and the modification time, and remember it as the last delivered text.

The write path records the canonical text of every save it performs in a
per-project registry read by step 3, so an own write is suppressed by content,
not by a flag or a timestamp — flags are per process and timestamps are coarser
than back-to-back changes on some filesystems.

`fs.watch` can fail (inotify limits, network mounts) or report events without a
filename. A failed watcher falls back to a two-second stat-and-compare loop for
the same subscriptions; a `null` filename is treated as "this subscription must
re-read its own file", which is always correct and never produces a false
change. Both mechanisms share one emitter, so the browser cannot tell them
apart.

### Server: the event stream

`GET /api/maps/[projectId]/[mapFile]/events` returns `text/event-stream`,
`cache-control: no-store`, and keeps the connection open through a
`ReadableStream`: a `retry: 1000` line on open, one JSON payload per event as
`data:`, and a comment every 25 s so an idle connection is not killed by an
intermediary. The subscription is closed on `request.signal` abort.

### Browser: decide, then either apply or ask

`use-map-sync.ts` opens one `EventSource` per open map and closes it on
unmount; nothing is opened for a read-only map (FR-014). On becoming visible
again after being hidden, it fetches the map once and reconciles, because events
do not arrive while the tab is frozen.

`MapWorkspace.tsx` receives events and asks the store whether anything is
unsaved — a pending debounce, a save in flight, or a failed save. With nothing
unsaved it applies the document directly, keeping the selection, the tour and
the step when their identifiers still exist, and announces the update in the
live region without moving focus. With something unsaved it stores the incoming
document as a pending outside change and shows the notice instead.

The notice area moves out of `MapWorkspace.tsx` into `MapNotice.tsx`, which
takes all map-level situations and renders at most one, in this order:
read-only, unreadable file, outside change, save failure, oversized. The
outside-change and the existing stale-save paths share one text and two actions,
so a person never sees two notices describing the same race.

### Shared: what changed

`diff.ts` compares two documents and returns counts and up to three names for
added, removed and changed waypoints, links, tours and stops. It is used for the
notice sentence, so the person can decide without switching windows.

## Complexity Tracking

None: the Constitution Check has no violations.
