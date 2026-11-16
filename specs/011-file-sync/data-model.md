# Data Model: Live Map Sync

**Feature**: `011-file-sync` | **Date**: 2026-11-16

No durable entity is added: the map file keeps every fact the product stores.
What this feature adds is the runtime state that decides when the person is told
something, and it is described here so its rules can be tested without reading
the code.

---

## Entity: Watched project

One entry per project folder that has at least one subscription.

| Field           | Type                | Meaning                                         | Rules                                                                                                                                                          |
| --------------- | ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`     | string              | Registry id from `~/.ctour/workspace.json`      | Unique; the key of the registry                                                                                                                                |
| `root`          | string              | Absolute path of the project folder             | Must exist when the watcher opens; a missing root is a failed watcher, not an error message                                                                    |
| `tours`         | string              | `path.join(root, '.tours')`                     | Created by the map write path if it does not exist                                                                                                             |
| `mode`          | `'watch' \| 'poll'` | Which mechanism is running                      | Starts as `'watch'`; becomes `'poll'` after a watch error, and never returns to `'watch'` in the same process (a filesystem that failed once is not re-tested) |
| `subscriptions` | Subscription[]      | Open streams                                    | When the last one closes, the handle closes and the entry is removed                                                                                           |
| `lastWrite`     | `OwnWrite \| null`  | The document this process last wrote for a file | Read by the suppression rule                                                                                                                                   |

Identity: `projectId`. The entry lives on `globalThis` so a dev-server module
reload does not leak a watcher.

Transitions: `watch → poll` on a watch error or an unavailable `fs.watch`;
`poll → (closed)` when the last subscription closes. There is no
`poll → watch` transition.

---

## Entity: Subscription

One open event stream, so at most one per browser tab per map.

| Field           | Type                                  | Meaning                                        | Rules                                                                                                        |
| --------------- | ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `file`          | string                                | `<name>.tour.json`                             | Must match the map file pattern; anything else is rejected before a stream opens                             |
| `deliveredText` | string \| null                        | Canonical text the browser was last told about | `null` until the first document is delivered. This is the reference the suppression rule compares against    |
| `fileState`     | `'present' \| 'gone' \| 'unreadable'` | Last reported state of the file                | A transition in this field is what makes `map-gone` and `map-unreadable` fire once instead of on every event |
| `emit`          | function                              | Writes one event to the stream                 | Never called after `close`                                                                                   |

Validation: `file` must pass the existing `MAP_FILE` pattern; a stream for a
project that is not registered is refused with the existing `unknown-project`
error.

---

## Entity: OwnWrite

The record the suppression rule reads.

| Field     | Type   | Meaning                                | Rules                                                                                                                 |
| --------- | ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `file`    | string | The map file written                   | One per file per project; the newest replaces the older                                                               |
| `text`    | string | Canonical text written                 | Produced by `serializeDocument` in the same call, so no second serialisation can drift                                |
| `mtimeMs` | number | Modification time the write returned   | Informational; it is delivered to the browser so the next save's staleness check uses the value the file actually has |
| `at`      | number | When the write completed, milliseconds | Not used for comparison — recorded so a test can assert the record was replaced rather than accumulated               |

Rule: an event whose canonical text equals `OwnWrite.text` is not delivered, but
`deliveredText` is updated to it. This is what makes an own save silent (FR-003)
while keeping the reference current, so the next external change is still
detected.

---

## Entity: Outside change (browser)

A document that arrived from the stream and has not been applied or refused.

| Field        | Type            | Meaning                                      | Rules                                                                        |
| ------------ | --------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `document`   | `MapDocument`   | The document read from disk                  | Already normalised by the server                                             |
| `report`     | `LoadReport`    | What normalisation had to drop               | Carried so the existing oversized and dropped-entity reporting keeps working |
| `mtimeMs`    | number          | Modification time observed with the document | Becomes the value the next save sends as `expectedMtimeMs`                   |
| `summary`    | `ChangeSummary` | What differs from the document on screen     | Computed when the change arrives, shown in the notice                        |
| `receivedAt` | number          | Milliseconds                                 | Used to test that a burst settles into one change                            |

State transitions:

```text
nothing unsaved   → applied      (loaded, selection/tour/step preserved, announced)
something unsaved → offered      (notice shown; document held, not loaded)
offered → applied  (person chose "Reload")
offered → written  (person chose "Keep mine": our document is written, change dropped)
applied/written    → absent      (the next event replaces the entry, never stacks)
```

---

## Entity: Change summary

Computed from two documents; never stored.

| Field       | Type                                                        | Meaning                                                 |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `waypoints` | `{ added, removed, changed }: DiffBucket`                   | Waypoints by kind of change                             |
| `edges`     | `DiffBucket`                                                | Links, by id and label                                  |
| `tours`     | `DiffBucket`                                                | Tours, by id, name and stop order                       |
| `names`     | `{ added: string[]; removed: string[]; changed: string[] }` | Up to three labels or names per kind, in document order |

Rules: a waypoint counts as changed when its label, type, description, notes,
file or position differ; a tour counts as changed when its name, description or
stop list differ; an edge counts as changed when its label differs. A stop that
moved within a tour counts as a change to the tour, not to the waypoint.

---

## Entity: Map-level notice (browser)

Exactly one is shown.

| `kind`                       | Text names                                                  | Actions                | Priority      |
| ---------------------------- | ----------------------------------------------------------- | ---------------------- | ------------- |
| `read-only`                  | that the folder is unreachable and the map is the last copy | Choose a new location  | 1             |
| `unreadable`                 | the file and the reason it could not be read                | Dismiss                | 2             |
| `outside-change`             | what changed                                                | Reload, Keep mine      | 3             |
| `outside-change` (file gone) | the file was deleted                                        | Write it back, Dismiss | 3             |
| `save-failed`                | the reason                                                  | Retry                  | 4             |
| `oversized`                  | the supported size                                          | Dismiss                | 5             |
| —                            | nothing                                                     | —                      | 6 (no notice) |

Rules: a notice of higher priority replaces the current one without animation;
`outside-change` and the stale-save failure are one kind, because they describe
the same race and must not be shown twice; dismissing a notice never changes the
document.

---

## Relationships

```text
Watched project 1 ── * Subscription 1 ── ? Outside change
        │
        └── ? OwnWrite (per file, newest wins)

Outside change 1 ── 1 Change summary
Outside change * ── 0..1 Map-level notice      (at most one shown)
```

## Invariants

1. A subscription never delivers text equal to the text it last delivered.
2. A subscription delivers at most one `map-gone` per absence and at most one
   `map-unreadable` per invalid document.
3. A closed subscription receives nothing; the watcher is closed with the last
   subscription of its project.
4. No event is delivered for a map that is open read-only.
5. The number of notices shown at any moment is zero or one.
6. The document the browser holds after "Keep mine" is the document that was
   written, byte for byte, in canonical form.
