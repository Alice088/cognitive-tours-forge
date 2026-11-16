# Cognitive Tours

Cognitive Tours is a map of how a piece of software actually works, kept next to
the code it describes.
еа
depend on each other. A **tour** is an ordered walk through the map with a
spoken narrative at each stop, so a newcomer can be shown the shape of the system
in ten minutes instead of six months.

The map is a file in the repository: `.tours/<name>.tour.json`. It is versioned
with the code, reviewed in the same pull request, and diffed like anything else.
When the code changes, the map is wrong in the same commit, and someone can fix
it there.

## Who this is for

Someone joining a codebase and needing to know why it is shaped this way.
Someone leaving a codebase and wanting the reason to survive them. A team that
keeps re-litigating a decision because nobody remembers the constraint that
produced it.

## What it does today

- One command starts a local application. Nothing is uploaded, no account is
  made, no data leaves the machine.
- The navigation rail lists every project you have added and the maps inside
  each one.
- The map shows waypoints as typed cards with their links, searchable and
  filterable by type.
- The tour dock walks a tour stop by stop, with a whole-tour overview.
- The inspector edits a waypoint or a tour without hiding the map.
- Edits save themselves into `.tours/*.tour.json`; undo and redo work like a
  browser's, per session and per map.
- Light, dark and follow-the-system themes, at any window width down to a phone.

## What it does not do yet

The command line entry point (`ctour init`, `ctour serve`), the MCP server that
lets an AI agent read and write the same map, and the skill files that teach an
agent the map format. The application currently starts with `npm run dev` from a
checkout. Those pieces plug into this shell and are specified separately.

## Architecture

Three regions of state, each with exactly one owner.

| State                    | Lives in                            | Survives              |
| ------------------------ | ----------------------------------- | --------------------- |
| Workspace registry       | `~/.ctour/workspace.json`           | restarts, per machine |
| Map document             | `<project>/.tours/<name>.tour.json` | restarts, git, clones |
| Selection, history, drag | the running application             | the session           |

The registry is machine-local on purpose: which projects you have open is a fact
about your machine, not about the repository. The map is the opposite — it
belongs to the code.

### The screen

Four regions, each the single home of its content: the navigation rail (projects
and their maps), the map canvas, the inspector (the selected waypoint or the
tour being edited), and the tour dock (the current tour, its position, its
controls). A fact that appears in two regions is a defect, not a convenience.

Width bands: at 1280 px and wider all four are visible, with a 240 px rail and
a 320 px inspector; between 768 and 1279 px the rail is 56 px of icons whose
labels appear on hover or focus and the inspector stays docked at 300 px; below
768 px the rail and inspector become drawers over the canvas and the dock
becomes a single scrollable row.

### Design tokens

Every colour is a semantic custom property in `app/globals.css`, defined once for
light and once for dark: surfaces (`background`, `card`, `rail`, `dock`,
`canvas`), interaction (`primary`, `accent`, `destructive`, `ring`, `input`),
the ten waypoint types, and three states. Components use `bg-canvas`,
`text-waypoint-goal-foreground`; a literal `bg-gray-100` fails lint. A unit test
reads the stylesheet and fails if any text pair drops below WCAG AA, so the
themes cannot silently rot.

### Reading and writing the map

`app/lib/workspace/map-file.ts` owns the format. Reads validate and normalise,
and never rewrite the file they just read. Writes serialise with a fixed key
order, sort collections by id, keep tour stop order exactly as authored, write a
temporary file and rename it over the target. A crash mid-save cannot truncate a
map, and adding one waypoint produces a one-line diff.

### Following the file while it is open

The server watches the project's `.tours/` folder, never the map file itself:
every save renames a temporary file over the target, which replaces the inode
and silently kills a watcher attached to the file. A change is read, parsed and
normalised, and compared with the canonical text last delivered; equal text
produces no event, which is also why the application's own saves do not echo
back — the write records the same normalised text a read will produce, so
clearing a field cannot make the application's own save look like an outside
one. The browser receives events over one local stream per open map, so nothing
leaves the machine. A comparison loop runs every two seconds alongside the
watcher rather than only after a watch error: some network mounts and container
volumes accept a watch and then report nothing, and a silent watcher would stop
the map from following the file at all.

When the file changes under unsaved typing the map-level notice says what
changed and offers two actions: reload the file's version, which restarts the
history and says so, or keep mine, which writes the open document over the file
without a second notice. A save refused only because the file's timestamp moved
— a formatter, `git checkout` of the same branch — is retried without a notice
when the two documents say the same thing.

Reads for sync are strict. The load surface repairs a map it partly understands;
while a map is open, a document whose repair would drop a waypoint, a link, a
stop or a file path is refused, and the message names what would be lost. A
deleted file is never recreated by an autosave: the notice offers to write it
back, and typing continues on the copy in memory until that choice is made. When
the map cannot be read at all, the same notice offers to write the map over the
file.

### When the folder is not there any more

Every successful read and write also refreshes a copy of the map in
`~/.ctour/cache/<project>/`. If the project folder is renamed, moved or deleted,
the project stays in the rail, marked, and opening a map serves the last copy
saved on this machine, read only: every editing control is disabled and the only
action is to choose a new location for the project. The cache is a fallback, not
a source of truth — nothing is ever read from it while the folder is reachable.

### Server routes exist because the browser cannot touch the disk

`app/api/workspace/*` and `app/api/maps/*` are the only code that reads or writes
files. They validate that every path resolves inside the project root before any
filesystem call. Nothing is fetched over the network; the application is a local
server the browser talks to.

### Editing

One zustand store per open map, wrapped in temporal history limited to fifty
steps and scoped to the document — selection and loading flags are not edits and
never enter the history. A text field commits to the store when the person
pauses or leaves the field, so one edit is one undo step. A waypoint is moved by
dragging it on the canvas and one drag is one undo step. Links and tours are
created from the inspector and the tour dock, so every change the interface can
make is also a change the history can step back through. The store is watched by
an autosave that writes 800 ms after the last change and reports pending, saved
or failed in the dock. Saves are serialised, so a burst of changes cannot put two
writes in flight at once. A save that would overwrite a file changed on disk is
refused with a 409 and shown in the same map-level notice as an outside change,
with the same two actions; any other failure names the reason and offers one
retry without losing the text. Loading a map is not an edit, so opening one no
longer writes it back.

## Technical detail

### Requirements

Node.js 20 or newer (22 tested).

### Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first launch shows an empty workspace with one
action: add a project. Pick a folder that holds your code; a map is created on
demand and stored in `.tours/` inside it.

### Environment

| Variable     | Default    | Purpose                                                                     |
| ------------ | ---------- | --------------------------------------------------------------------------- |
| `CTOUR_HOME` | `~/.ctour` | where the workspace registry lives; tests point it at a temporary directory |

There is no other configuration. No database, no API keys, no accounts.

### Commands

```bash
npm run dev        # local application on :3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint, including the design-token rule
npm run test:unit  # vitest: history, map file, registry, paths, token contrast
npm run test:e2e   # playwright: the user stories, on a temporary workspace
```

### Test layout

- `tests/unit` — logic that must be right without a browser: undo semantics, map
  file round-trips and ordering, registry recovery, path containment, WCAG
  contrast of every token pair.
- `tests/acceptance` — the shell's user stories in a real browser against a real
  `.tours/` directory created per run.

Playwright starts the application with `CTOUR_HOME=./.tmp/e2e-home` and builds its
fixture under `.tmp/`, so a test run never touches a real workspace.

### Troubleshooting

| Symptom                                            | Cause                                                           |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Empty workspace after a restart                    | `CTOUR_HOME` was set during that run; the registry is elsewhere |
| "That folder does not exist" when adding a project | the path is outside `$HOME`, or it is a file                    |
| The dock says "Not saved"                          | the file was changed on disk; reload or keep yours              |
| A colour change is rejected by lint                | use a token from `app/globals.css`                              |

## Contributing

The map format is a contract: `specs/010-app-shell/contracts/map-file.md`.
Changes to ordering or field meaning need a version bump and a reader that still
opens version 1. Feature work is specified before it is built; see `specs/`.

## License

MIT.
