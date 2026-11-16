# ADR 009: Local first, and why the hosted shell went away

**Status:** Accepted
**Date:** 2026-11-16
**Supersedes:** ADR 003 (Turso), ADR 004 (Vercel), ADR 005 (SQLite via Prisma), ADR 008 (one site per team)

## Context

The application began as a hosted demo: a Next.js deployment on Vercel with
Prisma over Turso, one site per team, an edit passcode, and the map stored in a
database row. That shape was not chosen for the product; it was chosen because
serverless functions have no disk, so the map had to live somewhere else.

The product is different. A map explains how a repository works, the person who
reads the map is usually looking at the code beside it, and the person who
maintains the map is usually an AI agent working in that repository. A map that
lives in a database row can drift from the code it describes, cannot be reviewed
in a pull request, cannot be diffed, and disappears when the deployment does.
An editing passcode and a per-team URL exist to keep strangers out of a shared
server — a problem that only exists because the map was shared in the first
place.

## Decision

The application is local first (constitution, principle I).

- The map is a file in the repository: `.tours/<name>.tour.json`. Several maps
  may live in one repository.
- Writes are atomic (temporary file, then rename), keys are sorted, and every
  path inside a map is relative to the repository root, so a map is reviewable
  and diff-friendly (principle II).
- The workspace — which repositories are open, and where the person last was —
  is machine-local state in `~/.ctour/workspace.json`. It is not part of the
  repository and is not synced.
- The server exists only because a browser cannot touch the disk. Filesystem
  access is confined to `app/lib/workspace` and `app/lib/fs` and is reachable
  only through route handlers; nothing in a client component imports `fs`.
- Hosting is deleted, not flagged off: Prisma, the generated client, Turso, the
  per-team sites, the edit passcode and the Vercel configuration were removed in
  the same change that orphaned them.

## Consequences

Good:

- A change to a map is a change to a file, so it appears in `git diff`, in a
  review, and in the history of the code it describes.
- Nothing needs an account, a deployment, a database, or a network connection.
  `npx ctour init` is enough to start.
- A repository that is moved, copied or cloned carries its map with it.

Costly, and accepted:

- Two people cannot edit the same map over a network through this application.
  They share it the way they share code.
- A project whose folder is renamed or removed becomes unavailable. It stays in
  the rail, marked, and can be repointed; the last copy saved on this machine
  opens read only.
- Every write is a whole-file write. That is fine at the supported size (250
  waypoints, 40 tours) and cheap to reason about; a delta format would add a
  format version, a merge story and failure modes nobody asked for.
- Hosted previews and per-team sites are gone. That capability would have to
  return as export, not as a deployment.

## Alternatives considered

- **Keep the hosted path behind a flag.** Rejected: a second storage backend
  doubles the surface of every change and leaves dead code the moment the flag
  is off.
- **Store the map in `.ctour/` at the home directory.** Rejected: the map stops
  traveling with the repository, which is the whole point.
- **One map per repository.** Rejected: a repository usually needs more than one
  story — onboarding, one per subsystem, one per decision record.
