# ADR 010: Live file sync

**Date**: 2026-11-16 | **Status**: Accepted

## Context

The map is a file in the repository, which is the reason the product exists. An
agent, an editor, a formatter or `git checkout` can rewrite it while the
application has it open. Without a way to notice that, the application becomes a
stale viewer and the next save silently writes the old document back over
whatever arrived — the exact failure that makes a local-first tool untrustworthy.

## Decision

The server watches the project's `.tours/` directory and pushes change
notifications to the open page over one local event stream. The browser decides
what to do with a change; the server never merges, never retries a write and
never makes a choice on the person's behalf.

Supporting decisions, each with the alternative it replaced:

1. **Watch the directory, not the file.** `writeMap` writes a temporary file and
   renames it over the target, so the inode changes on every save and a watcher
   attached to the file dies after the first one. A directory watch survives it
   and also reports maps added, renamed and removed, which the rail needs.
2. **Recognise own writes by canonical text.** A "saving" flag loses an outside
   change that lands during a save; `mtime` is too coarse on fast filesystems;
   the inode changes on every atomic rename. Storing the serialised document the
   process just wrote is exact, and it is the same text the comparison uses.
3. **Server-sent events, not WebSocket or polling.** WebSocket is bidirectional
   and would need a custom server, which breaks "one command to start". Polling
   from the browser spends more work for the same one-second guarantee. SSE is a
   plain route handler and a browser primitive.
4. **Two mechanisms behind one emitter.** `fs.watch` where it works, a
   two-second comparison loop where it throws or reports nothing. The consumer
   cannot tell them apart, so an awkward filesystem degrades latency instead of
   correctness.
5. **One watcher per project, refcounted on `globalThis`.** A module-level handle
   leaks one inotify watch per hot reload in development; two tabs sharing one
   project would fight over the same handle. The last subscription closes the
   watcher.
6. **The open page owns the conflict decision.** Only it knows what is unsaved.
   A server-side merge cannot distinguish "the person typed this a second ago"
   from "the file holds something newer", and every guess loses someone's work.
7. **Auto-applied changes keep the undo history; an explicit reload clears it.**
   Silently discarding fifty undo steps because a formatter ran is hostile. When
   the person chooses to take the file's version, the notice says the history
   starts again.
8. **One map-level notice, by priority.** Read-only, unreadable, outside change,
   save failure, oversized. A newer situation replaces an older one, so the top
   of the map never stacks banners.
9. **A first frame per subscription.** A subscription announces the current
   document (or list) on its first sweep instead of adopting it silently. That
   removes the window between the page's own fetch and the stream opening, where
   a change could otherwise be adopted as "already delivered" and never sent.

## Consequences

The write path gains one in-process record and no wire changes; `PUT` and `GET`
on a map keep the same shape, and the `409 stale-document` contract is unchanged.
Read-only maps open no stream. Everything runs between the local server and the
browser on the same machine, so no part of a map leaves the computer.

A second browser tab on the same map sees the same events and makes its own
choices; two people editing one map at once remains out of scope.
