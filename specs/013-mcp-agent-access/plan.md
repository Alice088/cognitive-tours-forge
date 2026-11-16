# Implementation Plan: Agent Access to the Map

**Branch**: `013-mcp-agent-access` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-mcp-agent-access/spec.md`

## Summary

Add a second way into the map: a local Model Context Protocol server, started by
`ctour mcp`, that speaks JSON-RPC over standard input and output and exposes nine
capabilities — list projects, read one map, and seven write operations covering
waypoints, links and tours. Reads are complete and honest about what the reader
could not represent; writes are guarded by a state token taken from the bytes that
were read, atomic, and refused rather than guessed, and they land in the same
`.ctour/<name>.tour.json` file the person edits, so the open interface picks them
up through the sync layer built in 011 with no new channel.

`ctour mcp install` connects a detected agent — Claude Code, Cursor, Gemini CLI or
Codex — by editing only that agent's own configuration, byte-preservingly, and
idempotently; with no agent present it prints the entries to paste and exits with
its own code. `ctour doctor` gains one check per detected agent so a person can see
whether the connection is live and what to run when it is not. The instructions
that teach the read-change-read-back loop travel inside the protocol handshake,
from one source file, instead of being copied into per-agent skill folders.

No part of the map format changes; no file outside `.ctour/` and the agents' own
configuration is touched; nothing is sent off the machine.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, no `any`), Node.js >= 20 runtime (developed on 22.22.3), ESM command bundle

**Primary Dependencies**: no new dependency — the protocol layer is written in the repository; reuses the workspace and map-file modules of the application (`app/lib/workspace/map-file.ts`, `registry.ts`, `service.ts`)

**Storage**: files only — `.ctour/<name>.tour.json` per project, `~/.ctour/workspace.json` for the machine-local project list, and the agents' own configuration files (`~/.claude.json`, `~/.cursor/mcp.json`, `~/.gemini/settings.json`, `~/.codex/config.toml`)

**Testing**: Vitest with the existing `cli` project (node environment, `tests/cli`), Playwright acceptance for the one end-to-end claim that spans processes (`tests/acceptance/mcp.spec.ts`)

**Target Platform**: macOS, Linux and WSL desktop; standard input and output only; no socket opened by the protocol server

**Project Type**: single package — a terminal command that speaks a protocol to an agent and writes files

**Performance Goals**: a 250-waypoint map read in under one second and written in under one second; a write visible on an open screen within one second; `mcp install` under two seconds including detection

**Constraints**: no network, no account, no running interface required, no comments in code, minimal diffs, English product text, protocol traffic must never be polluted by logging on standard output

**Scale/Scope**: one machine, up to ~50 projects, maps capped at 250 waypoints and 40 tours, one person typing while one or more agents write

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                                                                         | Gate                                                                                                                    | Result                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| I. Local First (NON-NEGOTIABLE)                                                                                   | The protocol server must not open a socket or contact anything; the connection command must write only local files      | PASS — FR-028, stdio only, `tests/cli/mcp-isolation.test.ts` scans the module for network clients and stray output                       |
| II. Map Lives With the Code                                                                                       | The agent writes the same tracked file, inside `.ctour/`, and nothing else                                              | PASS — FR-012, FR-027; every write goes through `writeMap`, refusals leave the file untouched                                            |
| III. One Command to Start                                                                                         | The person still starts with one command; the agent half is one command too                                             | PASS — `ctour mcp install`, FR-021…FR-024; no hand-editing of configuration                                                              |
| IV. Agent Access Through MCP                                                                                      | This is the principle itself                                                                                            | PASS — the whole feature                                                                                                                 |
| V. Understanding Stays With the Person                                                                            | Nothing decides for the person: refusals instead of guesses, conflicts resolved by the person, `doctor` changes nothing | PASS — FR-014, FR-015, FR-019, FR-025                                                                                                    |
| VI. Interface Is the Product                                                                                      | The protocol's replies and refusals are the agent's interface and must be exact                                         | PASS — refusal text names the cause and the valid values, FR-015                                                                         |
| Additional: Node 20+, package `ctour`, strict TS, no comments, README order, dead code removed in the same change | Enforced in every task                                                                                                  | PASS — no new dependency, `mcp` lives in the existing package, 012's `serve`/`doctor` code unaffected beyond one check and one help line |

## Project Structure

### Documentation (this feature)

```text
specs/013-mcp-agent-access/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mcp-tools.md
│   └── agent-config.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
cli/
├── index.ts                     # entry, unchanged
├── lib/
│   ├── run.ts                   # + 'mcp' command, help line, exit code 5
│   └── output.ts                # unchanged
├── commands/
│   ├── mcp.ts                   # `mcp` dispatch: serve | install; serving writes only protocol frames
│   └── doctor.ts                # + agent checks
└── mcp/
    ├── server.ts                # newline JSON-RPC loop, initialize, ping, tools/list, tools/call
    ├── tools.ts                 # nine tool definitions: name, description, schema, run
    ├── access.ts                # project/map resolution, state token, read and write through map-file.ts
    ├── placement.ts             # free position for a waypoint added without coordinates
    ├── refusals.ts              # refusal codes, messages, allowed values
    ├── instructions.ts          # the text an agent receives at initialization
    ├── agents.ts                # detection table and byte-preserving configuration edits
    └── config-text.ts           # JSON/TOML scanners: find key span, insert or replace, verify by parsing

tests/
├── cli/
│   ├── mcp-protocol.test.ts
│   ├── mcp-read.test.ts
│   ├── mcp-write.test.ts
│   ├── mcp-placement.test.ts
│   ├── mcp-install.test.ts
│   ├── mcp-doctor.test.ts
│   └── mcp-isolation.test.ts
└── acceptance/
    └── mcp.spec.ts
```

**Structure Decision**: the protocol server is a new `cli/mcp/` directory inside the
existing command, because it reuses the command's package root, version, and output
helpers, and because it must be bundled into the same `dist/cli.mjs`. The
application's disk access stays where it is (`app/lib/workspace`); the protocol
layer calls it rather than duplicating the format.

## Phase 0 — Research

See [research.md](./research.md). It resolves: protocol layer without a dependency,
the state token, project and map addressing, the nine capability names, placement
of a waypoint added without coordinates, coexistence with the open interface,
instruction delivery through the handshake, per-agent configuration formats and
byte-preserving edits, the new exit code, and the observation that one skill file
per agent would duplicate the same text four times.

## Phase 1 — Design

- [data-model.md](./data-model.md) — capabilities, their inputs and outputs, refusal
  codes, state token, connection entries, doctor checks.
- [contracts/mcp-tools.md](./contracts/mcp-tools.md) — the wire contract: framing,
  handshake, nine tools, refusals, exit behaviour.
- [contracts/agent-config.md](./contracts/agent-config.md) — per-agent paths and keys,
  splice rules, idempotency, output and exit codes.
- [quickstart.md](./quickstart.md) — twelve runnable scenarios, each traced to a
  requirement, with the automated coverage that proves it.

## Complexity Tracking

| Violation                                                               | Why Needed                                                                                                                                | Simpler Alternative Rejected Because                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Protocol layer written in the repository instead of an SDK dependency   | The published package stays dependency-free apart from the application, and the exact refusal text and framing are testable byte for byte | `@modelcontextprotocol/sdk` brings a schema library the repository does not otherwise use, and hides the bytes the tests assert on |
| Byte-splicing of JSON configuration instead of parse and re-serialize   | FR-022 requires every other entry to stay byte-identical, including formatting the person chose                                           | Re-serializing rewrites the whole file, which fails FR-022 on any file not already formatted exactly as the writer would           |
| Exit code 5 for "nothing to connect here"                               | FR-024 requires a code distinct from success and from failure, and 0–4 are taken by 012                                                   | Reusing 1 would report a successful no-op as a problem; reusing 2 would call a valid machine a usage error                         |
| `cli/mcp/placement.ts` rather than teaching the interface the same rule | FR-007 is about the agent; the interface's fixed `{80, 80}` is a separate, older behaviour                                                | Changing the interface in this feature would ride a refactor along with a feature                                                  |
