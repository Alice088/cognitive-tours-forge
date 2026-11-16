# Data Model: Agent Access to the Map

The map document itself is unchanged — see
`specs/010-app-shell/contracts/map-file.md` and `specs/011-file-sync/`. This file
describes what the protocol layer adds: frames, capabilities, refusals, connection
entries.

## Frame

One JSON object per line on standard input and one per line on standard output.
Nothing else is ever written to standard output.

```ts
type Frame =
  | { jsonrpc: '2.0'; id: number | string; method: string; params?: unknown } // request
  | { jsonrpc: '2.0'; method: string; params?: unknown } // notification
  | { jsonrpc: '2.0'; id: number | string; result: unknown } // success
  | { jsonrpc: '2.0'; id: number | string; error: { code: number; message: string; data?: unknown } };
```

Rules:

- A notification is never answered, including an unknown one.
- An unparseable line answers `-32700` with `id: null`.
- A request before `initialize` answers `-32002` ("not initialized"), except
  `ping`, which always answers.
- An unknown method answers `-32601`, naming the method.
- A tool that fails is **not** a JSON-RPC error: the call succeeds and the result
  carries `isError: true` (see Refusal).

## InitializeResult

```ts
type InitializeResult = {
  protocolVersion: '2025-06-18' | '2025-03-26' | '2024-11-05';
  capabilities: { tools: { listChanged: false } };
  serverInfo: { name: 'ctour'; version: string };
  instructions: string;
};
```

`protocolVersion` echoes the client's when it is one of the three, otherwise
`2025-06-18`. `version` is the package version, the same value `ctour --version`
prints. `instructions` is the text from `cli/mcp/instructions.ts` (D10).

## Capability

```ts
type Capability = {
  name: CapabilityName;
  description: string;
  inputSchema: JSONSchema;
  run: (input: unknown, context: Context) => Promise<Outcome>;
};

type CapabilityName =
  | 'list_projects'
  | 'read_map'
  | 'create_waypoint'
  | 'update_waypoint'
  | 'delete_waypoint'
  | 'connect_waypoints'
  | 'disconnect_waypoints'
  | 'create_tour'
  | 'set_tour_stops';

type Context = { home: string };
```

## Inputs and outcomes

### `list_projects`

No input.

```ts
type ProjectView = {
  id: string;
  name: string;
  folder: string;
  available: boolean;
  maps: { file: string; name: string; waypoints: number; tours: number; readable: boolean }[];
};
```

`available` is false when the folder is gone; such a project is listed, with
`maps: []`, rather than hidden.

### `read_map`

Input `{ project: string, map?: string }`.

```ts
type MapView = {
  project: string;
  map: string;
  state: string;
  savedAt: string;
  document: MapDocument; // unchanged shape
  omitted: { waypoints: number; links: number; stops: number; paths: number; unknownTypes: number };
};
```

### Write capabilities

```ts
type WaypointInput = {
  project: string;
  map?: string;
  state: string;
  label: string;
  type: WaypointType;
  description?: string;
  notes?: string;
  file?: string;
  position?: { x: number; y: number };
};

type WaypointRef = { project: string; map?: string; state: string; waypoint: string };

type LinkInput = WaypointRef & { source: string; target: string; label?: string };

type TourInput = { project: string; map?: string; state: string; name: string; description?: string; author?: string };

type StopsInput = WaypointRef & { tour: string; stops: { waypoint: string; narrative?: string }[] };
```

`waypoint`, `source`, `target` and `tour` accept an id or an exact label; a label
that matches two entries is refused (`waypoint-ambiguous`).

```ts
type WriteOutcome =
  | {
      changed: true;
      state: string;
      savedAt: string;
      id?: string;
      removed?: { ways: number; links: number; stops: number };
    }
  | { changed: false; state: string };
```

`changed: false` is FR-016: the caller sent what the map already holds.

### `update_waypoint`

`{ project, map?, state, waypoint, label?, type?, description?, notes?, file?, position? }`.
Only the fields present in the request change; a field sent as `null` is cleared.
Sending no field at all is a refusal (`nothing-to-update`), not a silent no-op.

### `delete_waypoint`

`WaypointRef`. Removes the waypoint, every link that touches it and every tour stop
that points at it; `removed` counts all three.

### `connect_waypoints` / `disconnect_waypoints`

`LinkInput` with `label` (connect only). Self-links are refused. Disconnect names
an existing pair; no match is refused (`link-unknown`), never silently ignored.

### `set_tour_stops`

`StopsInput`. Replaces the whole ordered list. Refused: unknown waypoint, a waypoint
twice, a stop on a waypoint that was deleted between the read and the write
(`stop-unknown`). An empty list is allowed and clears the tour's stops.

## Refusal

```ts
type Refusal = {
  code: RefusalCode;
  message: string; // one sentence, names the value and the reason
  allowed?: string[]; // valid values, when the cause is a value
  state?: string; // current state, for map-changed
  map?: MapView; // current map, for map-changed (FR-014)
};
```

| Code                   | Cause                                               | Allowed values carried |
| ---------------------- | --------------------------------------------------- | ---------------------- |
| `project-unknown`      | no registered project matches                       | the registered ids     |
| `project-ambiguous`    | two projects share the name                         | their ids              |
| `project-gone`         | registered folder no longer exists                  | —                      |
| `workspace-unreadable` | the machine-local project list cannot be read       | the path               |
| `map-unknown`          | no such map in the project                          | the map files          |
| `map-required`         | the project holds several maps and none was named   | the map files          |
| `map-missing`          | the file is gone                                    | —                      |
| `map-unreadable`       | not JSON, wrong version, or a write would lose data | —                      |
| `map-changed`          | the state token no longer matches                   | current state and map  |
| `type-unknown`         | not one of the ten types                            | the ten types          |
| `label-empty`          | empty or whitespace-only label                      | —                      |
| `waypoint-unknown`     | no waypoint matches                                 | —                      |
| `waypoint-ambiguous`   | the label matches two waypoints                     | their ids              |
| `nothing-to-update`    | a change with no fields                             | the changeable fields  |
| `self-link`            | a link from a waypoint to itself                    | —                      |
| `link-unknown`         | no such link                                        | —                      |
| `stop-unknown`         | tour stop on a waypoint that is not on the map      | —                      |
| `stop-duplicate`       | the same waypoint twice in one tour                 | —                      |
| `tour-unknown`         | no such tour                                        | the tour ids           |
| `name-empty`           | empty tour name                                     | —                      |
| `path-outside`         | a `file` outside the project folder                 | —                      |

Refusal text is one sentence, in the second person, no jargon:
`type "Depndency" is not a waypoint type. Valid: Goal, User Need, Feature, ADR, Code
Component, Test, Risk, AI Instruction, Open Question, Deprecated.`

## Connection

```ts
type AgentAdapter = {
  name: 'claude-code' | 'cursor' | 'gemini-cli' | 'codex';
  label: string;
  configPath: string;
  format: 'json' | 'toml';
  entryPath: string[]; // ['mcpServers', 'ctour'] or ['mcp_servers', 'ctour']
  detect: () => Promise<boolean>;
};

type ConnectionEntry = { command: string; args: string[] }; // args: ['mcp']

type ConnectionResult = {
  agent: AgentAdapter;
  path: string;
  change: 'added' | 'updated' | 'unchanged' | 'unreadable';
  reason?: string;
};
```

Truth table for one agent (FR-021…FR-024):

| Configuration                             | Entry present | Written            | Printed                                                            | Exit |
| ----------------------------------------- | ------------- | ------------------ | ------------------------------------------------------------------ | ---- |
| absent                                    | —             | nothing            | entry to add, for every agent                                      | 5    |
| present, parses, no entry                 | no            | splice             | `connected  <agent>  <path>`                                       | 0    |
| present, parses, entry equal              | yes           | nothing            | `already connected  <agent>  <path>`                               | 0    |
| present, parses, entry different          | yes           | replace value span | `updated  <agent>  <path>`                                         | 0    |
| present, does not parse, or has no anchor | —             | nothing            | `cannot read <path>: <reason>` and the entry to add, with its path | 3    |

Two or more agents detected: each is reported on its own line; the exit code is the
first non-zero code in the table order (3, then 5, then 0).

## Doctor check

`DoctorCheck` (from 012) gains one id per detected agent:

```ts
type AgentCheck = {
  id: `agent:${AgentAdapter['name']}`;
  ok: boolean;
  detail: string;
  fix: string; // 'ctour mcp install'
};
```

- connected and the command resolves → `ok: true`, detail names the file.
- connected and the command is missing → `ok: false`, detail names the missing path.
- not connected → `ok: true`, detail `not connected`, fix names the command.
- configuration unreadable → `ok: false`, fix names the command.

## State token

`state = sha256(fileBytes).hex().slice(0, 16)`. Computed on read and recomputed on
write. Equal tokens: write. Unequal tokens with the same normalised content: answer
`{ changed: false, state: <current> }`. Unequal tokens with different content:
refuse `map-changed` with the current map. The token is returned by every read and
every write, and echoed in `map-changed`.

## Exit codes for `ctour mcp`

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| 0    | served until standard input closed; or connection installed / already present |
| 2    | usage                                                                         |
| 3    | a configuration exists but cannot be edited safely                            |
| 5    | no known agent found; nothing written                                         |
