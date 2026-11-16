# Contract: Map File Failures and Notices

**Feature**: `011-file-sync` | **Date**: 2026-11-16

Extends `specs/010-app-shell/contracts/workspace-api.md` with the failure cases
sync introduces, and fixes which of them the person sees and where. Error codes
are the existing ones; no code is renamed and none is removed.

---

## Read and write, unchanged parts

`GET /api/maps/{projectId}/{mapFile}` returns the document, the load report, the
modification time and the read-only flag, exactly as before. Sync does not
replace this call: it is still what a load and a reload use, and still what a
reconnect reconciles with.

`PUT /api/maps/{projectId}/{mapFile}` still accepts `{ document, expectedMtimeMs }`
and still answers `409 stale-document` when the file's modification time moved
further than one millisecond from `expectedMtimeMs`. Sync adds no field and
relaxes no check: a change that lands while a save is in flight must still lose
the race to the person's screen, where the choice is made.

The only write-path addition is an in-process record of the canonical text the
write produced, used by the watcher to recognise its own output. It is not part
of the wire format and never leaves the process.

---

## Failure cases and what the person sees

| Situation                                           | Code                  | Where it is detectable | Notice kind                               | Actions                |
| --------------------------------------------------- | --------------------- | ---------------------- | ----------------------------------------- | ---------------------- |
| File replaced with content that is not JSON         | `map-unreadable`      | event `map-unreadable` | `unreadable` ("… is not valid JSON")      | Dismiss                |
| File replaced with JSON of another version or shape | `map-unreadable`      | event `map-unreadable` | `unreadable` (the `MapFileError` message) | Dismiss                |
| File emptied to zero bytes                          | `map-unreadable`      | event `map-unreadable` | `unreadable`                              | Dismiss                |
| File deleted outside the application                | `map-gone`            | event `map-gone`       | `deleted` (same `outside-change` area)    | Write it back, Dismiss |
| File changed while something is unsaved             | —                     | event `map-changed`    | `outside-change` with the summary         | Reload, Keep mine      |
| File changed while a save is in flight              | `stale-document`      | `409` from `PUT`       | `outside-change` — the same notice        | Reload, Keep mine      |
| Folder unreachable                                  | `project-unavailable` | `GET`/`PUT`            | `read-only`                               | Choose a new location  |
| Save failed for any other reason                    | `save-failed`         | `PUT`                  | `save-failed`                             | Retry                  |
| Map beyond the supported size                       | —                     | document size          | `oversized`                               | Dismiss                |

Rules:

1. A notice names the file when the file is unusual, and names what changed when
   the document changed.
2. `stale-document` and `map-changed with something unsaved` must produce one
   notice, not two: the second arrival replaces the first.
3. An unreadable file never becomes empty content: the document on screen stays,
   and a save is offered again only after the file is readable or the person
   chooses to overwrite it explicitly.
4. A notice is inert with respect to the document: dismissing it changes nothing.
5. Every notice is announced in the live region; none moves focus.

---

## What must not happen

- Applying a document that failed to normalise.
- Writing the open document back automatically after `map-gone` or
  `map-unreadable`; both are recoveries only on request.
- Showing two notices for the same race.
- Reloading the map for a write the application itself performed.
- Reading or writing the local cache while the project folder is reachable.
