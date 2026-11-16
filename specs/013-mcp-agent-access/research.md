# Research: Agent Access to the Map

Decisions taken before writing code, with the alternatives that were rejected.
Each decision names the requirement it serves.

## D1 — The protocol layer is written here, not imported

**Decision**: `cli/mcp/server.ts` implements JSON-RPC 2.0 over newline-delimited
standard input and output: `initialize`, `notifications/initialized`, `ping`,
`tools/list`, `tools/call`, and the standard error objects. Nothing is added to
`package.json`.

**Rationale**: the subset an agent needs is small and has been stable across the
protocol revisions (`2024-11-05`, `2025-03-26`, `2025-06-18`). Writing it means the
tests can assert the exact bytes an agent sees, including every refusal sentence,
and the published package stays free of a schema library it would use nowhere else.
The response to `initialize` echoes the client's protocol version when it is one of
the three above, and otherwise answers with `2025-06-18`; this is what clients
actually do on mismatch, and it keeps old agents working.

**Alternatives considered**: the official SDK (adds `zod` and a transport
abstraction, and formats errors in ways the tests would have to accept rather than
assert); one process per tool call (loses the file read between calls and multiplies
startup latency); an HTTP server instead of stdio (opens a port, which Principle I
refuses).

## D2 — Nine capabilities, named the way agents expect

**Decision**: `list_projects`, `read_map`, `create_waypoint`, `update_waypoint`,
`delete_waypoint`, `connect_waypoints`, `disconnect_waypoints`, `create_tour`,
`set_tour_stops`. Snake case, verb first, one action per capability. Each carries a
JSON Schema input, a one-paragraph description that says when to use it, and a text
result plus `structuredContent`.

**Rationale**: FR-001…FR-011 list exactly these actions; a capability per action
keeps every call auditable in a transcript and keeps refusals local. Deleting a
tour is deliberately absent: FR-009 covers waypoint deletion with its links and
stops, and the spec's Assumptions leave removing whole maps, projects and tours to
the person.

**Alternatives considered**: one `write_map` capability taking the whole document
(makes every call a full-file write, so two agents overwrite each other and the
state token protects nothing useful); a capability per field
(`set_waypoint_description`) — a combinatorial surface no agent would discover.

## D3 — The state token is a hash of the file bytes

**Decision**: `read_map` returns `state`, the first 16 hex characters of
SHA-256 over the exact bytes read. Every write sends `state` back; the writer
re-reads the bytes and compares hashes before writing.

**Rationale**: FR-005 and FR-014 need "the map moved underneath me". A timestamp is
what the interface uses for optimistic concurrency, but two writes inside the same
millisecond alias, and a restore-from-git keeps the old content with a new time.
A hash answers exactly the question asked, costs one pass over a file that is
already being read, and is what a refusal can echo back. The timestamp is still
returned for display, not for comparison.

A token mismatch is not by itself a refusal. If the document the caller sends is
equal, after normalisation, to the map now on disk, the answer is `unchanged` with
the new token — the same false conflict 011 fixed for the interface, kept consistent
here (FR-016).

**Alternatives considered**: mtime alone (aliasing); a revision counter stored in
the document (churns the file on every write and makes the map format responsible
for concurrency); byte length plus mtime (same aliasing).

## D4 — Projects are addressed by id, name or folder; ambiguity is refused

**Decision**: every capability that targets a project accepts `project`, matched
against the registry's `id`, then `name`, then an absolute folder path after
`realpath`. A name that matches two projects is refused with the ids to choose
between; a registered folder that no longer exists is refused as `project-gone`
rather than reported as an empty map.

**Rationale**: `ctour status` already shows ids, and an agent that read
`list_projects` has them in hand. Names are what a person says out loud ("the
forge project"), so they must work too, but silently picking one of two projects
with the same name is the kind of guess FR-006 and the spec's edge cases forbid.

**Alternatives considered**: folder basename only (breaks for two checkouts of the
same repository); an opaque numeric handle (nothing on screen matches it).

## D5 — The map is addressed by file, and the read says which file it opened

**Decision**: `read_map` takes `project` and `map` (the file name, e.g.
`main.tour.json`) and returns it. Without `map`, a project with exactly one map
opens that map; a project with several is refused with the list.

**Rationale**: FR-002 is about _one_ map, and the spec's edge case says a write
aimed at another map must be refused. The file name is the stable identity — the
display name is derived from it and can be re-derived by the reader.

**Alternatives considered**: an index (`map: 0`) — invisible in the interface and
unstable after a rename; a map id stored in the document — changes the format.

## D6 — Reads report losses, writes refuse them

**Decision**: `read_map` uses `readMap` and returns `omitted` counts from its
`LoadReport` (FR-004). Every write uses `readMapStrict`, which refuses when the
existing file would lose data, and then `writeMap`.

**Rationale**: the two directions have opposite obligations. An agent that cannot
see three waypoints must be told so; an agent that would silently delete them by
rewriting the file must be stopped. This is the behaviour 011 already established
for the interface (`map-unreadable` on a lossy file), reused rather than reinvented.

**Alternatives considered**: refusing reads too (an agent could never diagnose a
damaged map); permitting lossy writes (the exact corruption FR-015 forbids).

## D7 — "Nothing changed" is decided on canonical text

**Decision**: "nothing changed" is decided twice, in this order. First against the
map now on disk: a state-token mismatch whose normalised content is identical is
`unchanged` with the new token, not a refusal. Then against the document that was
read: equal canonical text means `unchanged` and the file is not touched (FR-016).

**Rationale**: `canonicalText` normalises through the reader, so a re-sent field that
round-trips differently is still recognised as the same value. This is the same
normalisation 011 uses to recognise its own writes, which keeps "unchanged" meaning
the same thing in both places.

**Alternatives considered**: comparing `JSON.stringify` of both documents (order-
sensitive, so a reordered array looks like a change); comparing file bytes
(different indentation makes an identical map look changed).

## D8 — A waypoint added without coordinates is placed in a free slot

**Decision**: `cli/mcp/placement.ts` walks a fixed grid — columns of 240 px from
`x = 80`, rows of 160 px from `y = 80`, filling downwards then rightwards — and
returns the first slot that is at least 224 px away horizontally **or** 80 px away
vertically from every existing waypoint. The numbers come from the rendered
waypoint: `WaypointNode.tsx` draws `w-52` (208 px) and about 74 px tall, so the
clearance is that rectangle plus a gap rather than a radius. The result
depends only on the current map, so two agents that read the same map pick the same
slot and the second is refused by the state token.

**Rationale**: FR-007 asks that a new waypoint not cover another one. A fixed
`{80, 80}` puts every agent-created waypoint in one pile; random coordinates make
tests flaky and diffs noisy.

**Alternatives considered**: a layout algorithm (a feature of its own, and it would
move the person's waypoints); reusing the interface's fixed point (fails FR-007).

## D9 — Coexistence with the open interface needs no new channel

**Decision**: the protocol server writes files directly and never talks to the
running interface. Visibility comes from 011: `sync.ts` watches the map folder in
the web process, sees an agent write as an external change, applies it when the
person has no unsaved edits, and offers the choice when they do.

**One second**: FR-018 and SC-002 are delivered by `fs.watch` on the map folder,
which fires on the rename `writeMap` performs (011 watches the directory for exactly
this reason). The 2 s comparison loop is a fallback for a file system whose watcher
cannot report; if the acceptance run measures a write slower than a second, the
interval in `app/lib/workspace/sync.ts` is lowered — the criterion is not.

**Rationale**: the agent's write is an external write by definition — it comes from
another process — and that is precisely the case 011 was built for. Adding an IPC
call would create a second path to the same effect and a second place for the
"changed on disk" notice to be wrong.

**Alternative considered and rejected**: the agent calling the web server's PUT
route. It would require the interface to be running (violating FR-003's spirit for
writes), and would make the map unwritable on a machine that never started it.

**Consequence**: the write is invisible to the web process's own-write registry, so
the interface treats it as external. That is intended and already tested in 011.

## D10 — Instructions travel in the handshake

**Decision**: the text the agent needs — the read-change-read-back loop, the ten
waypoint types, the state token, the refusal behaviour — lives once in
`cli/mcp/instructions.ts` and is returned in the `initialize` result's
`instructions` field. `README.md` summarises it for people and links to the file.

**Rationale**: FR-026 asks that the agent finds the instructions without the person
copying anything. Every client surfaces `instructions` to the model; per-agent skill
folders would mean four copies of the same words, drifting apart, and a write into
directories this feature otherwise leaves alone (FR-022, FR-027).

**Alternatives considered**: `~/.claude/skills/…/SKILL.md` and `~/.codex/AGENTS.md`
(agent-specific, unreachable for the other agents, and they would be written by
`mcp install`, widening what that command touches); a `how_to_use` capability (the
agent has to guess to call it).

## D11 — Four agents, detected by their configuration, edited byte-preservingly

**Decision**: one adapter table in `cli/mcp/agents.ts`:

| Agent       | Configuration             | Shape                       |
| ----------- | ------------------------- | --------------------------- |
| Claude Code | `~/.claude.json`          | JSON, `mcpServers`          |
| Cursor      | `~/.cursor/mcp.json`      | JSON, `mcpServers`          |
| Gemini CLI  | `~/.gemini/settings.json` | JSON, `mcpServers`          |
| Codex       | `~/.codex/config.toml`    | TOML, `[mcp_servers.ctour]` |

Detection is the presence of the configuration file or its directory, not of the
binary on `PATH`: on this machine `~/.claude.json` exists with two configured
servers while no agent executable is on `PATH` at all (verified: `command -v claude
cursor codex gemini` finds nothing).

`cli/mcp/config-text.ts` edits text rather than data: a scanner locates the key, the
value span, or the insertion point; the edit is a splice; the result is re-parsed and
the neighbouring entries are compared with what they were. For TOML, the block is
appended — appending cannot alter an existing byte.

**Rationale**: FR-022 says every other entry stays byte-identical, which
`JSON.parse` + `JSON.stringify` cannot promise (it reorders nothing but rewrites
whitespace, quoting and number formatting). Splicing keeps the person's file as they
wrote it. Verified shape on this machine: `~/.claude.json` is
`{"mcpServers":{"gortex":{"args":["mcp"],"command":"/home/…/gortex","env":{}}, …}}`
— note the absolute `command`, which informs D12.

**Alternatives considered**: running `claude mcp add` (depends on that binary being
installed, which it is not here, and hands control of the edit to a program whose
output cannot be asserted); rewriting the file (fails FR-022).

## D12 — The configured command is an absolute path when one can be resolved

**Decision**: `mcp install` writes `command` as the absolute path of the running
executable when it can be resolved on disk, otherwise the name `ctour`, with
`args: ["mcp"]`. `doctor` checks that the written command still exists (FR-025).

**Rationale**: agents launched by a window manager or from a menu inherit a
different `PATH` than a terminal, which is the classic reason a configured command
"is not found"; the two servers already in this machine's `~/.claude.json` are
absolute for the same reason. Storing an absolute path is still checkable, which is
why `doctor` verifies rather than assumes.

**Alternatives considered**: always `ctour` (breaks under a version manager);
`node <path>/cli.mjs mcp` (works, but the path contains the package version and
breaks on upgrade — a false problem created by the fix).

## D13 — Exit codes: 5 for "nothing to connect here"

**Decision**: `ctour mcp install` exits `0` when connected or already connected,
`5` when no known agent was detected (nothing written, entries printed), `3` when a
configuration exists but cannot be edited safely, `2` for usage. `contracts/cli.md`
in 012 is extended with the one new code.

**Rationale**: FR-024 demands a code distinct from success and from failure. `1` is
"problems found" and `2` is "usage" in the existing command; a machine without an
agent is neither.

## D14 — `doctor` reports the connection; nothing else does

**Decision**: `runDoctor` gains one check per detected agent, id `agent:<name>`,
`ok: true` when the entry is present and its command resolves; when the entry is
absent the check is ok with the hint `ctour mcp install`; when the entry is present
but broken the check fails with the same hint. `status` is unchanged.

**Rationale**: FR-025 asks for one report, read-only. Adding a `status` column would
duplicate the control the person already has, and `doctor` is where "what is wrong
and the command that fixes it" already lives.

**Alternatives considered**: a new `ctour mcp status` subcommand (a second place to
learn, identical output); failing `doctor` when no agent is connected (a machine
without an agent is not broken).

## D15 — Testing: in-memory streams for the protocol, one real process at the end

**Decision**: `tests/cli/mcp-*.test.ts` drive `serve()` with an in-memory pair of
streams and assert on exact response frames; `tests/acceptance/mcp.spec.ts` spawns
the built `dist/cli.mjs mcp`, writes a waypoint into the fixture map, and asserts it
appears on the open screen within a second.

**Rationale**: the protocol is a text contract, so the tests should read like the
contract. Spawning a process for each of the ~40 protocol assertions would add
seconds and flakiness for nothing; the one thing a process proves — that an agent's
request reaches the file and the screen — is proven once, end to end.

**Alternatives considered**: the official SDK's test client (a dependency in the
tests only, and it would accept frames the writer might get wrong).

## D16 — No logging on standard output, ever

**Decision**: inside `cli/mcp/`, standard output belongs to the protocol. `serve`
writes frames through one writer; anything else that needs to say something writes
to standard error. `tests/cli/mcp-isolation.test.ts` scans the module for
`console.log`, `process.stdout.write` outside the writer, and network clients.

**Rationale**: a stray line on standard output corrupts the frame the agent is
parsing, and the failure looks like a broken agent rather than a bug in this
product. The same test file protects FR-028 by refusing an HTTP client import.

**Alternatives considered**: a debug flag (a second path that can still corrupt the
stream); relying on review.

## D17 — The published bundle needs no build change

**Decision**: `cli/commands/mcp.ts` is imported from `cli/index.ts`; `build:cli`
(esbuild, already bundling `@/` aliases) picks it up. No new script, no new
dependency, no change to `files` in `package.json`.

**Rationale**: 012 already bundles the command into one ESM file and ships the
standalone build; the protocol server is pure Node standard library plus modules
already inside the bundle.

**Verified**: `npm run build:cli` produces `dist/cli.mjs` from `cli/index.ts` with
`--bundle --platform=node --format=esm`; the `mcp` command needs nothing at runtime
that the interface needs, so an agent can work on a machine where the interface was
never built.
