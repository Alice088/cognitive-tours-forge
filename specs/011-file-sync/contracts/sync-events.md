# Contract: Sync Events

**Feature**: `011-file-sync` | **Date**: 2026-11-16

The one interface this feature adds. It is a local connection from the server
process to a browser tab on the same machine; nothing about it may reach
another host (constitution I, FR-015).

---

## Request

```http
GET /api/maps/{projectId}/{mapFile}/events HTTP/1.1
Accept: text/event-stream
```

- `projectId` — a project in the workspace registry.
- `mapFile` — the map file name, for example `main.tour.json`. Must match the
  existing map file pattern; anything else is a `400`.

Responses:

| Status | Body                                             | When                             |
| ------ | ------------------------------------------------ | -------------------------------- |
| `200`  | `text/event-stream`                              | The subscription is open         |
| `400`  | `{ "error": "invalid-name", "message": "…" }`    | `mapFile` is not a map file name |
| `404`  | `{ "error": "unknown-project", "message": "…" }` | The project is not registered    |

Headers on `200`:

```text
content-type: text/event-stream; charset=utf-8
cache-control: no-store, no-transform
connection: keep-alive
x-accel-buffering: no
```

The route is dynamic; no caching layer may hold the response.

---

## Frames

The stream begins with the retry hint, then one frame per event, then a comment
every 25 seconds while idle:

```text
retry: 1000

event: map-changed
data: {"type":"map-changed","document":{…},"report":{…},"mtimeMs":1763856000000}

event: maps-changed
data: {"type":"maps-changed","maps":[{"file":"main.tour.json","name":"main"}]}

: ping
```

Every event is named (`event:`) as well as typed inside the payload, so a client
can subscribe by name; a client that ignores names still receives the payload.
Payloads are single-line JSON. No `id:` field is sent, so a reconnect never
replays: the client reconciles by fetching the map, which is the same path a
fresh load takes (D10).

---

## Event: `map-changed`

```json
{
  "type": "map-changed",
  "document": { "version": 1, "project": { "name": "…", "createdAt": "…" }, "waypoints": [], "edges": [], "tours": [] },
  "report": { "droppedEdges": 0, "droppedStops": 0, "droppedPaths": 0, "unknownTypes": 0, "waypointCount": 0 },
  "mtimeMs": 1763856000000
}
```

Sent when the file exists, parses, normalises, and its canonical text differs
from the text last delivered on this subscription. `mtimeMs` is the value the
file had when it was read and becomes the `expectedMtimeMs` of the next save.

Guarantees:

1. Never sent twice in a row with equal canonical text.
2. Never sent for a write this process performed, because that write's canonical
   text is already the delivered text.
3. Never sent with a partial document: the server reads, parses and normalises
   before emitting, and the writer renames atomically, so a reader cannot see a
   half-written file.
4. Sent at most once per 120 millisecond burst: five changes in one second settle
   into the fewest frames that describe every settled state.

---

## Event: `map-unreadable`

```json
{ "type": "map-unreadable", "file": "main.tour.json", "reason": "main.tour.json is not valid JSON" }
```

Sent on the transition into an unreadable state: a file that is missing, empty,
truncated, or not a map document of a supported version. `reason` is the message
the existing `MapFileError` already carries. Not repeated while the file stays
unreadable; a later readable file produces `map-changed` and the client clears
the notice.

---

## Event: `map-gone`

```json
{ "type": "map-gone", "file": "main.tour.json" }
```

Sent when a file that was delivered before is no longer in `.tours/`. Never sent
for a subscription that has delivered nothing, so a stream opened on a
just-deleted file does not start with an error. The client must not treat this as
empty content (FR-010): the document on screen stays and the notice offers to
write it back.

---

## Event: `maps-changed`

```json
{ "type": "maps-changed", "maps": [{ "file": "main.tour.json", "name": "main" }] }
```

Sent when the set of `*.tour.json` files in the watched folder differs from the
set last announced, to one subscriber that asked for the project rather than a
single file. Used by the navigation rail (FR-013). The order is the same sorted
order the map list endpoint returns, so a client can replace its list wholesale.

---

## Server-side rules

1. One watcher per project folder; `fs.watch` first, a two-second comparison loop
   after a watch error. The client cannot tell them apart.
2. A write performed through `PUT /api/maps/{projectId}/{mapFile}` records its
   canonical text as an own write before the file is renamed into place.
3. A subscription holds the text it last delivered and the last state it
   reported; both survive an unrelated change in the folder.
4. Aborting the request closes the subscription; the last close closes the
   watcher.
5. Nothing is read from a project that is not on this machine, and nothing is
   written to a log outside the process.

---

## Client-side rules

1. Exactly one stream per open map; closed on unmount and never opened for a
   read-only map.
2. `map-changed` with nothing unsaved: load it, keep the selected waypoint, the
   open tour and the step when their identifiers still exist, and announce it in
   the live region without moving focus.
3. `map-changed` with something unsaved: hold it, show the one notice with the
   change summary, and let the person choose.
4. `map-unreadable`: keep the current document, name the file, stop offering to
   save until the file is valid again.
5. `map-gone`: keep the current document, offer to write it back.
6. `maps-changed`: refresh the workspace listing.
7. On becoming visible after being hidden, fetch the map once and reconcile —
   missed while hidden is missed silently, never noticed as a conflict with
   nothing unsaved.
