# Quickstart: agent access to the map

Runnable checks for `specs/013-mcp-agent-access/spec.md`. Every scenario names the
requirement it proves and the automated test that keeps it true.

## Prerequisites

```bash
npm install
npm run build:cli                  # dist/cli.mjs, which is what an agent starts
mkdir -p .tmp/qa/home && export HOME="$PWD/.tmp/qa/home"   # keep real agent configs out of it
export CTOUR_HOME="$HOME/.ctour"
```

Pointing `HOME` at a scratch directory is how every automated test avoids touching
the machine's real `~/.claude.json`; the adapters read `HOME`, not a hard-coded path.

The protocol is newline-delimited JSON, so a session is just lines in and lines out:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node dist/cli.mjs mcp
```

## 1. The agent sees the projects this machine knows (FR-001, FR-003)

```bash
node dist/cli.mjs init "$PWD"        # a project with one map
# then, in a session:
#   {"method":"tools/call","params":{"name":"list_projects","arguments":{}}}
```

Expect every registered project, each with folder and maps. Start the session with
the interface closed: the answer must be identical.

## 2. The agent reads one map in full (FR-002, FR-005)

`read_map` with `{"project":"<id>"}`. Expect the document, a `state` token, and
`omitted` counts. `document` must hold every waypoint, link and tour.

## 3. A damaged file is reported, not hidden (FR-004)

Remove one waypoint's `label` from the file by hand, read again: `omitted.waypoints`
is `1`. Nothing is dropped silently.

## 4. A waypoint added by the agent appears on screen (FR-007, FR-018)

With a map open in the interface, `create_waypoint` with `label` and `type` and no
position. Expect: a `state`, an `id`, a position that does not sit on an existing
waypoint, and the waypoint on screen within one second without a reload.

## 5. Only the named fields change (FR-008)

`update_waypoint` with `{"waypoint":"…","notes":"…"}`. Read back: `notes` changed,
everything else — including the description and the position — is as it was.

## 6. Deleting a waypoint takes its links and stops (FR-009)

Delete a waypoint that three links and one tour stop point at. The result reports
`removed: { ways: 1, links: 3, stops: 1 }`, and the map has no dangling reference.

## 7. A bad type is refused with the valid ones (FR-015, SC-003)

`create_waypoint` with `"type":"Depndency"`. Expect `isError: true`, the ten valid
types in the text, and the file byte-identical (`sha256sum .ctour/*.json` before and
after).

## 8. A stale reading cannot overwrite a newer map (FR-014, FR-020)

Read the map, change it in the interface, then write with the old `state`. Expect a
refusal carrying the current `state` and the current map, and no change on disk.

## 9. Writing what is already there changes nothing (FR-016)

Send the same `update_waypoint` twice. The second answer says `changed: false`, and
the file's modification time does not move.

## 10. Tours (FR-011)

`create_tour` with a name, then `set_tour_stops` with three stops and narratives.
Read back: the tour is in order. Sending the same waypoint twice is refused
(`stop-duplicate`); an empty list clears the stops.

## 11. The agent cannot leave the project (FR-012, FR-027)

`create_waypoint` with `"file":"../../etc/passwd"`. Refused (`path-outside`), and
`find . -newer` shows no file outside `.ctour/` changed.

## 12. One command connects an agent (FR-021, FR-023, FR-024, SC-005)

```bash
mkdir -p .tmp/qa/home/.claude
printf '%s' '{"mcpServers":{"other":{"command":"other","args":[]}},"theme":"dark"}' > .tmp/qa/home/.claude.json
node dist/cli.mjs mcp install
```

Expect `claude-code  connected  …/.claude.json`; the file still holds `other` and
`theme` with the same bytes around the new entry. Run it again: `already connected`
and `cmp` reports the file unchanged.

## 13. A machine with no agent (FR-024)

Empty `HOME`, then `node dist/cli.mjs mcp install`. Expect no files under `HOME`,
the entries to paste printed, and exit code `5`:

```bash
node dist/cli.mjs mcp install; echo $?   # 5
```

## 14. A configuration it cannot edit is left alone (FR-022)

Truncate `~/.claude.json` to `{"mcpServers":` and run `install` again. Expect exit
`3`, a line naming the file and the problem, and the file unchanged.

## 15. Doctor reports the connection and fixes nothing (FR-025)

```bash
node dist/cli.mjs doctor
node dist/cli.mjs doctor --json
```

Expect one `agent:<name>` line per detected agent: `ok` when connected and the
command resolves, `FAIL` with `run ctour mcp install` when the configured command is
gone. Every file must be unchanged afterwards.

## 16. Nothing leaves the machine (FR-028)

```bash
npx vitest run --project cli tests/cli/mcp-isolation.test.ts
```

The module is scanned for network clients and for writes to standard output outside
the frame writer.

## Automated coverage

| Requirement    | Test                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------- |
| FR-001, FR-003 | `tests/cli/mcp-read.test.ts` — list projects with and without the interface                         |
| FR-002, FR-005 | `tests/cli/mcp-read.test.ts` — full map, stable and changing state                                  |
| FR-004         | `tests/cli/mcp-read.test.ts` — omitted counts on a damaged fixture                                  |
| FR-006         | `tests/cli/mcp-read.test.ts` — missing folder, missing map, unreadable file                         |
| FR-007         | `tests/cli/mcp-write.test.ts`, `tests/cli/mcp-placement.test.ts`, `tests/acceptance/mcp.spec.ts`    |
| FR-008         | `tests/cli/mcp-write.test.ts` — partial update, clearing a field                                    |
| FR-009         | `tests/cli/mcp-write.test.ts` — links and stops removed with counts                                 |
| FR-010         | `tests/cli/mcp-write.test.ts` — connect, disconnect, self-link refused                              |
| FR-011         | `tests/cli/mcp-write.test.ts` — tour creation, stops in order, duplicates refused                   |
| FR-012, FR-027 | `tests/cli/mcp-write.test.ts` — path outside the project, tree compared before and after            |
| FR-013         | `tests/cli/mcp-write.test.ts` — unknown waypoint, self-link, unknown stop                           |
| FR-014, FR-020 | `tests/cli/mcp-write.test.ts` — stale state carries the current map                                 |
| FR-015         | `tests/cli/mcp-write.test.ts` — every refusal leaves the file byte-identical                        |
| FR-016         | `tests/cli/mcp-write.test.ts` — unchanged write, modification time unmoved                          |
| FR-017         | `tests/cli/mcp-write.test.ts` — no temporary file survives a failed write                           |
| FR-018         | `tests/acceptance/mcp.spec.ts` — write visible on the open screen within a second                   |
| FR-019         | existing `tests/acceptance/sync-*.spec.ts` (011) plus `tests/cli/mcp-write.test.ts` for the refusal |
| FR-021…FR-024  | `tests/cli/mcp-install.test.ts` — four agents, byte-preserving splice, idempotency, exit codes      |
| FR-025         | `tests/cli/mcp-doctor.test.ts`                                                                      |
| FR-026         | `tests/cli/mcp-protocol.test.ts` — instructions delivered at initialization                         |
| FR-028         | `tests/cli/mcp-isolation.test.ts`                                                                   |
| SC-004         | `tests/cli/mcp-read.test.ts` — 250 waypoints under a second                                         |
| SC-006         | `tests/cli/mcp-read.test.ts`, `tests/cli/mcp-write.test.ts` — no interface involved                 |
