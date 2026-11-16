# Phase 0 Research: Application Shell

All Technical Context unknowns are resolved here. Each entry records the
decision, why it was taken, and what was rejected.

## D1. UI primitives: shadcn/ui on Radix

**Decision**: Use shadcn/ui, generated into `app/components/ui/`, on Radix
primitives, styled with Tailwind 4 and CSS custom properties. Add
`class-variance-authority`, `clsx` and `tailwind-merge` as its usual companions.
Icons come from `lucide-react`, already a dependency.

**Rationale**: Constitution Principle VI requires it. Beyond the rule, Radix
supplies the parts this feature is graded on — focus trapping in drawers and
dialogs, roving focus in menus, `aria-*` wiring, escape-to-dismiss — which would
otherwise be hand-written four times (rail, inspector, dock, dialogs) and
verified four times.

**Alternatives considered**: Radix styled by hand (same primitives, so it costs
the same work as shadcn/ui minus the maintained wrappers); Headless UI (smaller
coverage of the components needed, no combobox or menu parity); a component
library with a fixed visual identity (conflicts with the token layer the second
principle of this feature demands).

## D2. Theming: CSS custom properties with a class strategy

**Decision**: One semantic token set defined as CSS custom properties on
`:root` and `.dark`, exposed to Tailwind through `@theme inline`, switched by a
class on `<html>` driven by `next-themes` with `attribute="class"`,
`defaultTheme="system"` and `enableSystem`. The explicit choice is persisted in
localStorage by that library. `<html>` carries `suppressHydrationWarning` and the
layout applies the stored class before paint via the library's inline script.

**Rationale**: FR-004 needs three states (light, dark, follow the system) and
FR-005 needs every surface to resolve from one definition per theme. A class
strategy is the only one that supports an explicit choice overriding the system
preference; `prefers-color-scheme` alone cannot express "the person chose light
on a dark machine".

**Alternatives considered**: media-query-only tokens (the current broken
behaviour, and it cannot honour an explicit choice); a React context that
rewrites inline styles (re-renders the tree on every toggle, and third-party
children such as React Flow's canvas would not follow); duplicating colour
utilities per theme with `dark:` prefixes (that is the literal-utility defect
Principle VI forbids — 178 instances of it exist today).

## D3. Selection is not appearance

**Decision**: React Flow's own node and edge state carries selection; the store
holds only the selected waypoint's identifier. Highlighting, dimming and the
spotlight are derived in the node component from that identifier.

**Rationale**: Selection changes dozens of times a minute while a person walks a
tour. Round-tripping it through the store would rebuild every node on each
change and would also land selection in the undo history, where Ctrl-Z would
undo a click.

**Alternatives considered**: selection in the temporal store (pollutes the
history); selection in each node's local state (cannot express "exactly one
selected").

## D4. State and history: zustand with a temporal middleware

**Decision**: One store instance per open map, created by a factory, wrapped in
the temporal middleware for undo/redo with a limit of 50 steps,
`partialize` limited to the document (waypoints, edges, tours), `handleSet`
wrapped so that rapid keystrokes inside one field collapse into one entry, and
`clearHistory` called after loading a map.

**Rationale**: FR-018 to FR-023 describe exactly the middleware's model —
positional history, branch discard on new change after stepping back, forward
traversal. Per-map instances give the isolation FR-021 needs without extra
bookkeeping, and `partialize` keeps selection and loading flags out of the
history.

**Alternatives considered**: Redux Toolkit with a custom undoable reducer (more
ceremony for the same result); a hand-written past/future stack (about the same
line count as the integration, but the branch-discard and coalescing rules would
be written and tested by hand); TanStack Store with `withHistory` (comparable,
less used in this stack).

**Risk accepted**: the middleware is a small third-party package; the store is
created behind a factory in `app/lib/store/map-store.ts`, so replacing it later
touches one file.

## D5. Choosing a project folder from a local web app

**Decision**: The "add project" action opens a dialog that browses the local
filesystem through a server endpoint (`GET /api/workspace/browse?path=...`) with
a breadcrumb, a list of directories only, and a text field for the current path
that the person may also type or paste. Choosing a directory posts its absolute
path to `POST /api/workspace`.

**Rationale**: The browser cannot hand a server an absolute path. The File
System Access API returns an opaque handle, no path, and exists only in
Chromium, so it cannot satisfy FR-027 (the project must be usable on disk
afterwards). A native dialog needs a desktop shell this project does not have.
A server-side browser gives a real path, works in every browser, and keeps the
person inside the application, which FR-028 requires.

**Alternatives considered**: File System Access API (`showDirectoryPicker`) —
Chromium-only, no absolute path, unusable in Firefox or Safari; a bare text
field for the path — cheapest, but it asks the person to know and type a path,
which is what FR-028 rules out; a native file dialog through Electron or Tauri —
contradicts Principle I as written today (a browser application) and adds a
whole runtime.

## D6. Routing and restoring the last view

**Decision**: The open map is a URL:
`/p/[projectId]/[mapFile]?tour=[tourId]&step=[n]`. `app/page.tsx` reads the
stored view state and redirects to it; if none is stored it renders the
workspace-root state. Every navigation updates the stored view state.

**Rationale**: FR-029 and FR-009 both reduce to "restore four identifiers". A
URL already is that tuple, so restoring is a redirect and switching is a
navigation, with no bespoke serialisation. It also gives the person working
back-button behaviour for free.

**Alternatives considered**: a single route with all state in the client
(reload loses everything, and two tabs fight over one stored view); storing the
tuple only in localStorage without URLs (cannot be linked, cannot be reopened
after a crash without custom logic).

## D7. Read and write of `.tours/*.tour.json`

**Decision**: One module owns the format. Reads validate and normalise; writes
serialise with keys in a fixed order, collections sorted by `id`, two-space
indentation, a trailing newline, to `<file>.tmp` and then `rename`. Paths inside
a document are stored relative to the project root. Every write is verified to
resolve inside the project root before it happens.

**Rationale**: Principle II. A sorted, stable serialisation keeps `git diff`
honest, which is the whole point of keeping the map in the repository. `rename`
on the same filesystem is atomic, so an interrupted save cannot truncate a map.

**Alternatives considered**: writing in place with `writeFile` (a crash mid-write
loses the map); a lock file (unnecessary for one person, and stale locks are
worse than no locks); watching the file with `fs.watch` (belongs to the sync
feature, not this one — deferred, and `rename` is what makes watching a
directory rather than a file viable later).

## D8. Canvas performance at 250 waypoints

**Decision**: `onlyRenderVisibleElements` on the canvas, node and edge
components memoised and given primitive props, positions read from the store by
identifier rather than spread as objects, and drag results committed to the
store on drop only.

**Rationale**: SC-010 sets 100 ms for pan, zoom, select, drag and filter at 250
nodes. The expensive part is not the store but re-rendering every node when one
changes; visibility culling plus memoisation keeps a viewport's worth of nodes
rendering.

**Alternatives considered**: virtualising positions by hand (React Flow already
does the equivalent); a worker for layout (no automatic layout in this feature);
debouncing the filter input (a filter that lags behind typing fails the spirit
of SC-010).

## D9. Test stack and isolation

**Decision**: Vitest with `jsdom` and Testing Library for units — history rules,
map-file round-trip, registry read/write, path containment, token contrast.
Playwright for the spec's user stories, with the web server started as
`next dev` under a temporary `CTOUR_HOME` directory and a temporary project
directory, both created and removed per run. The `dotenv -e .env.test` wrapper
and the Prisma test database are dropped.

**Rationale**: The existing Playwright setup cannot run today (`.env.test` is
missing, and the server command depends on it — observed: exit 127). Once this
feature lands there is no database to isolate, so the isolation unit becomes two
directories, which is simpler and actually runnable. Units that decide undo
semantics and path safety need a fast runner with no browser.

**Alternatives considered**: Playwright component tests (slower, and the units
have no DOM); Jest (more configuration against an ESM Next project); keeping the
Prisma test database (deleted in Phase 6).

## D10. Contrast as an executable check

**Decision**: `app/lib/theme/tokens.ts` lists the token pairs that can appear as
text on a surface, per theme. A unit test computes the WCAG ratio for each pair
and fails below 4.5:1 for body text and 3:1 for large text and UI borders.

**Rationale**: SC-003 is "100% of text/border pairs meet WCAG AA", which is only
checkable if the pairs are enumerated in code. It also stops a future token edit
from quietly breaking the theme.

**Alternatives considered**: eyeballing both themes in a browser (not repeatable,
not a test); an external accessibility audit per release (too late to catch a
token regression).

## D11. What Phase 6 deletes

**Reasoning recorded because this is the largest destructive step.** Once the
shell reads and writes map files itself, every caller of the Prisma layer is
gone: `app/lib/db.ts`, `db-mappers.ts`, `sites.ts`, `edit-passcode.ts`,
`app/api/data`, `app/api/waypoints`, `app/api/edges`, `app/api/tours`,
`app/api/backup-nightly`, `app/api/reset-nightly`, `prisma/`,
`prisma.config.ts`, `scripts/`, `backups/`, `vercel.json`, and the dependencies
`@prisma/*`, `@libsql/client`, `better-sqlite3`, `@vercel/analytics`,
`@vercel/blob`, `dotenv-cli`. The legacy presentation components
(`CognitiveToursApp`, `TourBar`, `WaypointDetail`, `WaypointForm`,
`TourMarkdownView`, `ClaudeCodePanel`, `StartHere`) are deleted as soon as their
replacements render.

**Rationale**: Constitutional — dead code is deleted in the change that makes it
dead. Leaving a second data path in the tree would also leave a second source of
truth, which Principle II forbids.

**Kept**: `app/lib/tour-markdown.ts` and the markdown export, because the
markdown view is a shell surface (US1, US6) and is rewritten on top of the new
store, not removed.
