# Research: Live Map Sync

**Feature**: `011-file-sync` | **Date**: 2026-11-16

Answers the unknowns in the plan's Technical Context. Each decision is stated
with the reason it was chosen and what it was chosen over.

---

## D1 — Watch the directory, not the file

**Decision**: `fs.watch(projectRoot/.tours, { persistent: true })`, non-recursive,
one watcher per project folder.

**Rationale**: `writeMap` writes `.tour.json.tmp` and renames it over the map.
After the first save the watched inode no longer exists, so a watcher created on
the file itself goes deaf — silently, which is the worst failure mode for this
feature. A directory watcher sees the rename, and sees files arriving and
disappearing, which is also what the rail needs (FR-013).

**Alternatives considered**:

- _Watch the file_: survives nothing; one save and it is stale.
- _Watch the file and re-watch after every event_: a race between the event and
  the re-arm, and a window where changes are lost.
- _Recursive watch_: `recursive` is not available on Linux; watching `.tours/`
  non-recursively is what the layout needs anyway.

---

## D2 — One-way event stream over `EventSource`, not WebSockets

**Decision**: server-sent events on `GET /api/maps/[projectId]/[mapFile]/events`,
consumed with the browser's `EventSource`.

**Rationale**: the traffic is one-way, and the browser already has a client that
reconnects, retries and buffers text frames without a dependency or a handshake
protocol. It rides on the existing HTTP server, so there is no second port to
open and no second thing to shut down (constitution I and III).

**Alternatives considered**:

- _WebSocket_: bidirectional, which nothing needs; a Next.js route handler does
  not serve upgrades without a custom server, so it would add an operational
  component to a product whose promise is one command.
- _Polling only_: the guarantee in FR-001 is one second; a one-second poll with a
  read and a hash on every tick is more work than a watch for the same latency,
  and it cannot distinguish a burst from a single change.
- _Long polling_: reimplements `EventSource` badly.

---

## D3 — Recognise own writes by content, not by a flag or a timestamp

**Decision**: the write path records the canonical text of the document it wrote;
the watcher drops any event whose canonical text equals it.

**Rationale**: the same bytes going out and coming back is exactly the condition
"nothing changed", so one comparison covers own writes (FR-003) and external
rewrites that produce identical content (FR-012). A boolean "we are saving"
flag is wrong as soon as a save overlaps an external edit, and it is per process
while the filesystem is not. Modification times are coarser than two writes in
the same tick on some filesystems, and `rsync`-style copies preserve them.

**Alternatives considered**:

- _Suppression flag with a timeout_: loses a real external change that lands in
  the window, and keeps suppressing for the timeout after it.
- _Compare modification times only_: misses content changes with preserved
  mtimes and cannot tell an own write from an external one.
- _Compare `inode`_: atomic rename gives a new inode on every write, including
  ours, so it distinguishes nothing.

---

## D4 — Canonical form is the comparison key

**Decision**: compare `serializeDocument(normalizeDocument(parsed))` — the same
function `writeMap` uses.

**Rationale**: another program may rewrite the file with different key order or
indentation and mean nothing by it. Comparing raw bytes would deliver an update
for a formatter run; comparing canonical text delivers nothing, and canonical
text is also what produces stable diffs in git (constitution II).

**Alternatives considered**:

- _Raw byte comparison_: false positives on any reformat, and a formatter firing
  on save is common.
- _Deep object equality after `JSON.parse`_: ignores the ordering the writer
  guarantees, so it would hide a real change that only reorders collections —
  which the format defines as meaningless, but the cost of canonicalising is
  lower than reasoning about which orderings matter.

---

## D5 — Two mechanisms, one emitter

**Decision**: `fs.watch` where it works; a two-second `stat`-plus-compare loop
otherwise; both feed the same subscription object, so the browser cannot tell
which one is running.

**Rationale**: inotify runs out of watches under load, does not exist on some
network mounts, and on containers may report nothing at all. FR-001's slower
speed is the contract there, and FR-016's "no notice" holds because both
mechanisms produce the same event. A `null` filename from `fs.watch` (documented
platform behaviour) is treated as "re-read this subscription's file", which is
always correct.

**Alternatives considered**:

- _`chokidar`_: a dependency that still needs a fallback decision, for one
  directory; and it hides exactly the platform behaviour we must handle anyway.
- _Polling first, watch never_: two seconds on every filesystem, failing FR-001's
  fast path where the operating system is perfectly capable of telling us.
- _Refusing to sync where a watch fails_: turns an unusual filesystem into a
  broken product.

---

## D6 — Watchers are refcounted, per project, and kept on `globalThis`

**Decision**: a registry keyed by project id holds one watch handle and its
subscriptions; the handle is closed when the last subscription goes; the registry
itself hangs off `globalThis`.

**Rationale**: a module-level variable is re-created when the dev server reloads
a module, which leaks an open watcher per reload until the process runs out of
inotify handles. `globalThis` survives that. Refcounting means two tabs on the
same project share one watcher, and closing the last tab stops the polling loop,
which is what keeps an idle application idle (SC-009).

**Alternatives considered**:

- _One watcher per subscription_: duplicates inotify pressure and makes closing
  one tab disturb the other.
- _Never close_: an idle product that keeps polling forever is the defect SC-009
  measures.

---

## D7 — The browser owns the conflict decision, the server never merges

**Decision**: the server only reports "the file now contains this"; the open page
decides whether to apply it, and whether to ask.

**Rationale**: only the page knows whether the person has unsaved typing. A
server that resolved conflicts would have to guess, and the guesses are the two
bad outcomes: silently discarding the person's text or silently discarding the
other writer's (FR-004, SC-003). This also keeps the write path unchanged, so the
existing stale-document check stays the last line of defence for the in-flight
race.

**Alternatives considered**:

- _Server-side three-way merge_: the format has no common ancestor to merge
  against, and a wrong merge is worse than a question.
- _Last-writer-wins_: one of the two versions is destroyed with nobody choosing.
- _Lock files_: an agent writing with a plain `writeFile` would ignore them, so
  the lock would protect only the application from itself.

---

## D8 — Auto-apply keeps undo history; an explicit reload does not

**Decision**: an outside change applied while nothing is unsaved is loaded
without touching the temporal history. Choosing "take the file's version" in the
notice clears the history and says so.

**Rationale**: with nothing unsaved, the person's history is a record of their
own edits, and it stays meaningful; undoing after an auto-apply produces a local
edit, which is saved like any other, so the person's intent wins and nothing is
lost. In the conflict path the document is replaced under the person's editing,
and a history that steps back into a version the file never contained would be
misleading — the spec requires the restart and requires saying so (FR-006).

**Alternatives considered**:

- _Always clear_: destroys the person's ability to undo their own work for a
  change they never made.
- _Never clear_: lets undo resurrect a document that contradicts the file, with
  no explanation of where it came from.

---

## D9 — One notice area, priority order, no stacking

**Decision**: `MapNotice.tsx` receives every map-level situation and renders the
highest-priority one: read-only, unreadable, outside change, save failure,
oversized.

**Rationale**: FR-019 and the shell's one-action-one-place rule. The existing
component already rendered four banners in sequence, which can show two at once;
one component with a priority makes "at most one" structural rather than a
convention. The outside-change text and the stale-save text are the same
sentence, because to a person they are the same situation.

**Alternatives considered**:

- _Stack notices_: two banners describing the same race is the duplicate-control
  defect the shell phase removed (SC-002 of `010`).
- _A toast for changes and a banner for conflicts_: two places for one kind of
  message, and toasts vanish before a person can read what changed.

---

## D10 — Reconcile on becoming visible, not on a timer

**Decision**: when the tab becomes visible again, fetch the map once and compare;
nothing else runs while the tab is hidden.

**Rationale**: browsers throttle background tabs and may suspend the stream
without closing it, so events can be missed with no error to detect (FR-016).
One fetch on `visibilitychange` is cheaper than a heartbeat and covers the only
window in which the person is not looking.

**Alternatives considered**:

- _Heartbeat every second_: costs a request per second per tab to catch a case
  that happens when nobody is watching.
- _Trusting the stream_: a resumed stream after sleep delivers nothing for
  changes made while it was suspended, which is exactly when a laptop was closed.

---

## D11 — No sync for a read-only map

**Decision**: the hook does not open a stream when the map is read-only, and
opens one if the map becomes writable while open.

**Rationale**: FR-014. A read-only map is the cached copy of an unreachable
folder; there is no file to watch, and applying changes to a copy the person
cannot save would invite edits that are lost. Relinking the project refreshes the
document and makes the map writable, which is when sync should start.

**Alternatives considered**:

- _Sync the cache file_: it is a fallback, not a source of truth, and the
  relinked folder would immediately win.
- _Watch the missing folder_: `fs.watch` throws, and the retry loop would spin on
  a path that does not exist.

---

## D12 — Keep-alive comment and a fixed retry delay

**Decision**: the stream sends `retry: 1000` on open and a `: ping` comment every
25 seconds.

**Rationale**: `EventSource`'s default retry is around three seconds, which
delays the fast path after a dev-server restart; one second is what SC-001
allows. The comment keeps intermediaries from treating an idle connection as
dead, and it is invisible to the code that parses events.

**Alternatives considered**:

- _No keep-alive_: an idle map loses its stream after a proxy timeout and the
  reconnect storm is visible as a stall.
- _Real heartbeat events_: forces the client to distinguish a heartbeat from a
  change; a comment needs no handling at all.

---

## D13 — Change summary computed locally, from two documents

**Decision**: `diff.ts` compares the current document with the incoming one and
produces counts and up to three names per kind.

**Rationale**: FR-005 says the notice must name what changed, and the person
needs that before choosing. Doing it in the browser means the server sends only
the document it already has, and the summary is testable in isolation without a
filesystem.

**Alternatives considered**:

- _Send a patch from the server_: the server would need to know which version the
  page holds, which it deliberately does not (D7).
- _Say only "the file changed"_: the person cannot judge which side matters, so
  the choice becomes a coin toss.
