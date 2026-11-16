# Implementation Plan: Maps in and out

**Branch**: `014-map-import-export` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-map-import-export/spec.md`

## Summary

A map must be able to leave a project as one file and come back into another,
and the machine-local workspace — the registered projects, the last place opened
and the last known copies of the maps — must be able to move to another machine.

Three surfaces: the interface saves a copy of the open map (or of every map in a
project) into a folder the person picks, and brings a chosen map file, or a
folder of them, into a project after showing exactly what will be written; the
`ctour` command carries the whole workspace in one file and back. Everything is
a file operation over the modules that already exist (`map-file.ts`, `cache.ts`,
`registry.ts`, `service.ts`): nothing is re-serialised that can be copied, no
map format changes, no dependency is added.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 or newer (verified on v22.22.3)

**Primary Dependencies**: Next.js App Router, React, zustand with zundo, shadcn/ui primitives on Tailwind, esbuild for the command bundle. **No new dependency.**

**Storage**: files only — `.ctour/<name>.tour.json` inside a project; `~/.ctour/workspace.json` and `~/.ctour/cache/<projectId>/<file>.tour.json` for the machine. `CTOUR_HOME` relocates the machine folder and must be inside `$HOME`.

**Testing**: vitest with two projects (`unit` on jsdom, `cli` on node) and Playwright against the production build (`next build && next start`), one worker.

**Target Platform**: a local machine — desktop browser, terminal, macOS/Linux/Windows. Everything stays on that machine.

**Project Type**: local web application plus a published command, in one repository.

**Performance Goals**: a map of 250 waypoints, 300 links and 40 tours is copied out and back in under 2 seconds each; a workspace of 6 projects and 20 maps exports and imports in under a minute.

**Constraints**: writes land only inside `$HOME`; every write is atomic; export is a byte copy of what the project holds; import refuses rather than overwrites; no network, no new dependency, no change to the map format or its version.

**Scale/Scope**: 50 projects per machine, 40 maps per project, 250 waypoints and 40 tours per map, 10 new files, 2 new routes, 1 new command group.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                                                                                                            | Before Phase 0                                                                                                                         | After Phase 1                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Local First** — nothing leaves the machine, no account, no network                                         | PASS — every artefact is a file the person chooses; the bundle is carried by hand, not uploaded                                        | PASS — no route calls out, no dependency added, and a test scans the new modules for network clients                                                                                |
| **II. The Map Lives With the Code** — `.ctour/`, atomic writes, relative paths, the file is the source of truth | PASS — import writes into `.ctour/` only and copies bytes; export reads the file and writes a copy the person asked for                | PASS — one justified broadening: the app writes a copy into a folder the person chose (see Complexity Tracking); the project folder itself is still written only through `writeMap` |
| **III. One Command to Start** — idempotent, no copied URLs, `doctor` explains                                   | PASS — the workspace bundle is `ctour workspace export` / `import`, idempotent by realpath, with decisions as flags instead of prompts | PASS — importing the same bundle twice adds nothing and says so                                                                                                                     |
| **IV. Agent Access Through MCP** — one implementation, no bypass of the file contract                           | PASS — 013's `read_map` and the new preview share `normalizeDocument`; no tool is added or renamed                                     | PASS — the MCP surface is untouched                                                                                                                                                 |
| **V. Understanding Stays With the Person** — nothing decides for the person                                     | PASS — every overwrite, every dropped entry and every folder match is named and confirmed; nothing is matched by guess                 | PASS — the lossy import requires an explicit confirmation carrying the counts, and a missing folder is left out rather than guessed                                                 |
| **VI. The Interface Is the Product** — shadcn/ui, tokens only, one obvious place, responsive                    | PASS — two dialogs from the existing primitives, one control per action, no duplicate export path                                      | PASS — export lives in the map's own action bar, import next to "Create a map"; both reachable at phone widths through the existing drawers                                         |

**Result: 6/6 gates pass, before and after design.** One item is recorded in
Complexity Tracking as a deliberate broadening rather than a violation.

## Project Structure

### Documentation (this feature)

```text
specs/014-map-import-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── exchange-api.md
│   └── workspace-command.md
├── checklists/requirements.md
└── tasks.md            (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/lib/workspace/
├── exchange.ts         new — copy out, preview, write in, sets, naming
├── bundle.ts           new — workspace file shape, plan, apply
├── map-file.ts         existing — mapFileName, normalizeDocument, serializeDocument, writeMap
├── cache.ts            existing — writeCachedMap, readCachedMap, listCachedMaps
├── registry.ts         existing — registerProject, uniqueId, writeLastView
├── service.ts          existing — projectById, addProject, browse, saveViewState
└── types.ts            existing — MapDocument, MapRef, ProjectSummary, ViewState

app/api/exchange/
├── preview/route.ts    new — GET: what a chosen file or folder would become
├── export/route.ts     new — POST: write a copy of one map or of a project's maps
└── import/route.ts     new — POST: write a chosen file or folder into a project

app/api/workspace/browse/route.ts   extended — lists map files for import

app/components/shell/
├── ExportDialog.tsx    new — choose a folder, see the names that will be written
├── ImportDialog.tsx    new — choose a file or folder, read the preview, confirm
├── MapActions.tsx      new — the map's action bar: save a copy, export the project
├── FolderBrowser.tsx   extended — entries include files when a mode asks for them
├── MapWorkspace.tsx    wired — the action bar and its announcements
├── ProjectGroup.tsx    wired — "Bring in maps" beside "Create a map"
└── ProjectHome.tsx     wired — the same import entry point

app/lib/workspace/use-workspace.ts  extended — preview, export, import calls

cli/commands/workspace.ts  new — export and import of the machine folder
cli/lib/run.ts             extended — `workspace export|import`, --project, --skip
cli/lib/report.ts          extended — the two new report shapes

tests/unit/{exchange,bundle}.test.ts
tests/cli/workspace.test.ts
tests/acceptance/{exchange,workspace-bundle}.spec.ts
```

**Structure Decision**: the two new modules live beside the existing workspace
modules because they are the same layer — file operations over the same four
contracts. The routes live under `app/api/exchange/` rather than under a
project, because exporting a single map needs the same code path as exporting a
set or importing a folder; the project is a parameter, not a resource. The
command group is `ctour workspace`, because the machine folder is not a project.

## Complexity Tracking

| Item                                                                                  | Why needed                                                                                      | Simpler alternative rejected because                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The application writes outside `.ctour/`, into a folder the person chooses            | A copy is the point of export; there is no other way for a file to leave the project            | The browser's own save-as was rejected: it gives no way to name the destination in the product, cannot write a set of maps without one save dialog per map, and the destination would be invisible to the person's own announcement |
| A machine-level command group (`workspace`) beside project-level commands             | The workspace file is about the machine, not a project, and import needs a decision per project | Putting it in the interface was rejected: there is no machine-level screen, and `ctour status` is already the place a person looks at what this machine knows                                                                       |
| Decisions travel as flags (`--project name=folder`, `--skip name`) instead of prompts | 012 guarantees every command finishes without reading from a terminal                           | A prompt-driven import was rejected: it would break the one-command contract and cannot be tested end to end                                                                                                                        |
| The folder browser gains a file mode                                                  | Import needs a file, and the browser is already the only way to reach the disk                  | A browser file input was rejected: the server never learns the path, so the preview and the write would have to trust the client's copy of the bytes                                                                                |
