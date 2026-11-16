# Contract: the map protocol

The server speaks JSON-RPC 2.0 over standard input and standard output, one object
per line. This file is the contract the tests assert against. `data-model.md` gives
the shapes; this file gives the rules.

## Transport

- One request or notification per line on standard input. `\n` terminates a frame.
- Exactly one response line per request; notifications are never answered.
- Standard output carries frames and nothing else. Diagnostics go to standard
  error, and only when `CTOUR_DEBUG` is set.
- Standard input closing ends the server with exit code 0, mid-request included.

## Handshake

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": { "name": "claude", "version": "1.0" }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "tools": { "listChanged": false } },
    "serverInfo": { "name": "ctour", "version": "0.1.0" },
    "instructions": "…"
  }
}
```

The negotiated version echoes the client's when it is `2025-06-18`, `2025-03-26` or
`2024-11-05`; anything else gets `2025-06-18`. `instructions` is never empty and
names: the read-change-read-back loop, the ten waypoint types, the state token, and
the fact that refusals mean nothing was written.

`notifications/initialized` follows and is not answered.

## `tools/list`

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }
```

Returns exactly nine tools, in this order, each with `name`, `description` and
`inputSchema` (JSON Schema, `additionalProperties: false`):

| #   | Name                   | Description promises                                     |
| --- | ---------------------- | -------------------------------------------------------- |
| 1   | `list_projects`        | every project this machine knows, with its maps          |
| 2   | `read_map`             | one map in full, with a state token and what was omitted |
| 3   | `create_waypoint`      | adds one waypoint, returns its id and new state          |
| 4   | `update_waypoint`      | changes only the fields named                            |
| 5   | `delete_waypoint`      | removes a waypoint with its links and tour stops         |
| 6   | `connect_waypoints`    | links two waypoints, optionally labelled                 |
| 7   | `disconnect_waypoints` | removes a link                                           |
| 8   | `create_tour`          | creates an empty tour                                    |
| 9   | `set_tour_stops`       | replaces a tour's stops in order                         |

Descriptions say _when_ to use the tool and _what a refusal means_. No description
mentions implementation.

## `tools/call`

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": { "name": "read_map", "arguments": { "project": "cognitive-tours-forge" } }
}
```

Success:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{ "type": "text", "text": "…human and model readable…" }],
    "structuredContent": { "map": "main.tour.json", "state": "a3f1…", "document": {} },
    "isError": false
  }
}
```

Refusal (the call itself succeeded; nothing was written):

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "type \"Depndency\" is not a waypoint type. Valid: Goal, User Need, Feature, ADR, Code Component, Test, Risk, AI Instruction, Open Question, Deprecated."
      }
    ],
    "structuredContent": { "code": "type-unknown", "allowed": ["Goal", "…"] },
    "isError": true
  }
}
```

Unknown tool name: JSON-RPC error `-32602` naming the tool. Missing or wrong-typed
argument: `isError: true` with code `invalid-argument`, naming the argument and the
expected type.

## Guarantees

1. A write either replaces the whole file atomically or leaves it byte-identical.
2. A refused write leaves the file byte-identical and says why, with valid values.
3. A write names the state token it was based on. A mismatch whose normalised
   content is identical is `changed: false` with the current token; any other
   mismatch is refused with the current state and current map, never applied.
4. A write that changes nothing returns `changed: false` and does not touch the file.
5. No capability writes outside the addressed project's `.ctour/` directory.
6. No capability deletes a map file or removes a project.
7. No capability reads or writes a path outside the registered projects, and no
   capability repairs the machine-local project list: a damaged one is reported as
   `workspace-unreadable` and left where it is.
8. A read reports what it could not represent instead of hiding it.
9. Nothing opens a socket, contacts a network, or needs the interface to be running.
10. Two servers may run at once; each write is complete on its own, and the second
    writer of the same state is refused.

11. An imported map is read with the same `normalizeDocument` that `read_map`
    uses, so the counts a person confirms in the import preview are the counts an
    agent would report for the resulting file. No capability in this contract
    changed for map import and export.
