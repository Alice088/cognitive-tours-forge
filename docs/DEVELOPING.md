# Developing

Requirements, how to run the application from a checkout, what the command does,
the environment, the test layout and every symptom the product can produce.

Using it is in the [README](../README.md); how it works is in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Technical detail

### Requirements

Node.js 20 or newer (22 tested).

### Install it

```bash
curl -fsSL https://raw.githubusercontent.com/Alice088/cognitive-tours-forge/main/install.sh | sh
```

Builds the interface, packs it, and installs `ctour` globally. `--prefix DIR`
installs elsewhere; `CTOUR_TARBALL_URL` skips the build and uses an already packed
`ctour-<version>.tgz`; `CTOUR_REPO` / `CTOUR_BRANCH` read a fork instead.

### Run it

```bash
ctour init        # in a project folder: creates .ctour/, registers it, opens the map
ctour serve       # later: opens the interface again, writes nothing
ctour status      # every registered project, with map counts
ctour doctor      # what is wrong and which command fixes it, agent included
ctour mcp         # the map protocol on standard input and output, for an agent
ctour mcp install # connect the agent found on this machine
```

`init` prints one address that opens that project's map, and picks a free port from
4317 upwards when the first one is taken. Nothing is sent anywhere: the server
listens on `127.0.0.1` only.

The command is not on the public npm registry yet. Until it is, install it from a
packed tarball:

```bash
npm run build:all
npm pack                      # produces ctour-0.1.0.tgz
npm install -g ./ctour-0.1.0.tgz
ctour init ~/code/your-project
```

Working on this repository itself:

```bash
npm install
npm run dev        # the interface on :3000, with hot reload
npm run build:all  # standalone build + packed assets + the bundled command in dist/
node dist/cli.mjs init .   # the command as it will ship
```

### The command

`cli/` holds the command, bundled by esbuild into `dist/cli.mjs`: `init`, `serve`,
`status`, `doctor`, `mcp` and `workspace`, with `--port`, `--json`, `--project`,
`--skip`, `--help`, `--version`. `next build` produces `.next/standalone`, which the
published package carries, so the command starts the interface with no installed
dependencies. Exit codes: `0` fine, `1` problems found, `2` usage, `3` environment
refusal (not a folder, outside `$HOME`, home itself, not writable), `4` no free
address in the range, `5` nothing to connect when `mcp install` finds no agent.

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
npm run test:unit  # vitest: two projects — unit (jsdom) and cli (node)
npm run test:e2e   # playwright: the user stories, on a temporary workspace
```

### Test layout

- `tests/unit` — logic that must be right without a browser: undo semantics, map
  file round-trips and ordering, registry recovery, path containment, WCAG contrast
  of every token pair, tour-reading derivation and card placement.
- `tests/cli` — the command without a browser: target resolution and refusals, port
  probing, readiness, server stop, status and doctor against damaged fixtures,
  dispatch and exit codes, and a source scan proving nothing in the command talks
  to a remote address. `mcp-*` covers the protocol: frames, handshake, reads,
  writes, every refusal, placement, agent configuration edits and the isolation
  scan.
- `tests/acceptance` — the shell's user stories in a real browser against a real
  `.ctour/` directory created per run, plus `cli.spec.ts`, which spawns the built
  command, opens the address it prints, and interrupts it. `exchange.spec.ts`
  drives saving a copy and bringing a map in through the dialogs;
  `workspace-bundle.spec.ts` exports on one machine, imports on another and opens
  the result; `tour-reading.spec.ts` covers the reading card, the panel and the
  toolbar.

Playwright starts the application with `CTOUR_HOME=./.tmp/e2e-home` and builds its
fixture under `.tmp/`, so a test run never touches a real workspace.

### Troubleshooting

| Symptom                                            | Cause                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| Empty workspace after a restart                    | `CTOUR_HOME` was set during that run; the registry is elsewhere  |
| "That folder does not exist" when adding a project | the path is outside `$HOME`, or it is a file                     |
| The dock says "Not saved"                          | the file was changed on disk; reload or keep yours               |
| A colour change is rejected by lint                | use a token from `app/globals.css`                               |
| `ctour doctor` reports `leftover-tours`            | maps moved from `.tours/` to `.ctour/`; move them and delete it  |
| The agent does not see the map                     | run `ctour mcp install`, then restart the agent                  |
| `ctour doctor` says an agent command is gone       | the configured path moved; `ctour mcp install` rewrites it       |
| `ctour init` refuses the folder                    | it is `$HOME`, outside `$HOME`, not a folder, or not writable    |
| The command says the built interface is missing    | run `npm run build:all` before `node dist/cli.mjs`               |
| An import is refused with one sentence             | the file is not a map, or its version is newer than this product |
| `ctour workspace import` says a folder is missing  | the recorded path does not exist here; rerun with `--project`    |
| A tour reads as boxes with no words                | its stops carry no narration; the reading surface says so        |
| The reading card sits in an unexpected corner      | the focused stop was under the bottom-left one; it moved aside   |

## Where to read next

- [ARCHITECTURE.md](ARCHITECTURE.md) — the three regions of state and the internals
- [QUICKSTART.md](QUICKSTART.md) — the five-minute path
- [guides/](guides/) — mapping, tours, agents, moving maps
- `specs/` — the specification each feature was built against
- `docs/adr/` — one decision per file, with the alternatives that lost
