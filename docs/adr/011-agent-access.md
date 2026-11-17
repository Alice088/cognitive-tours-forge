# ADR 011 — Agent access through a local protocol

**Status**: accepted (2026-11-16)

## Context

The map is the point: a person writes down what a project is for, what threatens
it and how the pieces hang together, and the map is worth more when the coding
agent works from it instead of re-deriving the same understanding from the source.
That requires the agent to read and write the same file the person edits, on the
same machine, without a server in the middle and without a second copy of the map
to keep in step.

Constraints from the constitution: everything local (I), the map lives in the
repository (II), one command (III), agent access through the standard protocol
(IV), nothing decides for the person (V), and the interface — including the words
a refusal uses — is the product (VI).

## Decisions

1. **The protocol layer is written in the repository, not imported.**
   `cli/mcp/server.ts` implements the five methods an agent needs over
   newline-delimited JSON on standard input and output. The bytes are asserted in
   tests, and the package gains no dependency. Rejected: the official SDK, which
   hides the frames the refusals are tested against.

2. **Reads report, writes refuse.**
   `read_map` uses `readMap` and returns how many entries the reader could not
   represent; every write uses `readMapStrict` and refuses when the existing file
   would lose data. The two directions have opposite obligations: an agent must
   be told what it cannot see, and must never silently delete it.

3. **The state token is a hash of the file bytes.**
   `sha256(bytes)[:16]`, computed on read and recomputed before writing. A
   timestamp aliases within a millisecond and survives a restore; a hash answers
   exactly the question "did the map move?". A mismatch with identical normalised
   content is reported as "nothing changed" rather than as a conflict — the same
   false conflict 011 fixed for the interface.

4. **No channel to the running interface.**
   The agent writes the file; the interface's watcher treats it as an outside
   change, applies it when the person has no unsaved edits and offers the choice
   when they do. Adding IPC would create a second path to the same effect and a
   second place for the notice to be wrong. Rejected: the agent calling the
   interface's PUT route, which would make writes require a running server.

5. **Instructions travel in the handshake.**
   One text in `cli/mcp/instructions.ts` is returned by `initialize.instructions`.
   Rejected: skill files per agent — four copies of the same paragraphs, drifting
   apart, written into directories this feature otherwise never touches.

6. **One adapter table, byte-preserving edits.**
   Claude Code, Cursor, Gemini CLI, Codex and pi are detected by their
   configuration file or folder (pi reads `~/.pi/agent/mcp.json`, the same
   `mcpServers` shape the others use); `cli/mcp/config-text.ts` splices the entry and re-parses the
   result instead of re-serialising the file, so every other byte stays as the
   person wrote it. Idempotent by construction: an equal entry means no write.

7. **The configured command is an absolute path when it resolves.**
   Agents launched from a window manager inherit a different `PATH`; the two
   servers already configured on the machine this was built against are absolute
   for that reason. `doctor` verifies the path still exists rather than assuming
   it does.

8. **Exit code 5 means "nothing to connect here".**
   0–4 are taken by 012; a machine without an agent is neither a success nor a
   failure, and reusing 1 would report a valid no-op as a problem.

## Consequences

- The protocol server has no dependency of its own and can be bundled into
  `dist/cli.mjs` by the existing esbuild step.
- An agent can work on a machine where the interface was never built or started.
- The refusals are product copy and are reviewed as such; changing a sentence is a
  product decision, not a log tweak.
- Adding a tenth capability or a fifth agent is a table entry plus tests, not a
  new module.
- A future transport (for example over HTTP for a remote agent) would contradict
  Principle I and needs a new ADR, not a flag.
