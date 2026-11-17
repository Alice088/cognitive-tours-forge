# Working with an agent

The map is a file, so an agent that can write files can already edit it — badly,
guessing the format, and racing whatever you have open. `ctour mcp` exists so it
does not have to guess.

## What the agent gets

`ctour mcp` speaks a newline-delimited protocol on standard input and output, with
nine capabilities:

| Tool                   | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `list_projects`        | the projects this machine knows, their ids and folders             |
| `read_map`             | one map in full, plus the state token that later writes must carry |
| `create_waypoint`      | adds a waypoint; the server picks a free position on the canvas    |
| `update_waypoint`      | changes label, type, description, notes or file                    |
| `delete_waypoint`      | removes a waypoint and the links and stops that pointed at it      |
| `connect_waypoints`    | adds a named link between two waypoints                            |
| `disconnect_waypoints` | removes one link                                                   |
| `create_tour`          | adds an empty tour, ready for stops                                |
| `set_tour_stops`       | writes a tour's stops and their narration, in order                |

There is no way to delete a tour over the protocol: deleting a tour is not an
operation that should happen by accident, and the interface does it in one click
with undo behind it.

The protocol writes through the same map-file code the interface uses, so the
agent produces the same normalised file — sorted keys, sorted collections,
two-space indent — and your next `git diff` is the change, not a reformat.

## Connecting an agent

```bash
ctour mcp install
```

The command looks for Claude Code, Cursor, Gemini CLI, Codex and pi on this
machine, and for each one it finds, adds a map server entry to that agent's own
configuration file (`~/.pi/agent/mcp.json` for pi, so `pi mcp list` shows it). It preserves the rest of the file byte for byte, uses an
absolute path to the command, and writes nothing at all the second time it runs.
Restart the agent afterwards; most of them read configuration only at startup.

If it finds no agent, it exits with code `5` and says so. If an agent's
configuration is unreadable, it exits `3` and leaves the file alone.

Then:

```bash
ctour doctor
```

reports, per agent, whether the connection is present and whether the command it
points at still exists — moving the checkout or reinstalling under a different
path is the usual reason a working setup stops working. `ctour mcp install` fixes
it in place.

## What the agent is told

Instructions travel in the protocol's handshake, from `cli/mcp/instructions.ts`:
read the map first, send the state token with every change, read the map back
after writing, the ten waypoint types and what each one is for, and what a refusal
means. Nothing is installed into the agent's own instruction files, so no skill
file can drift out of date with the product.

An agent that is told all of this still benefits from the map itself: **AI
Instruction** waypoints are the place to record what must be true before someone —
or something — edits a file.

## Conflicts and refusals

A read returns a state token: the first sixteen hex characters of the sha256 of
the file's bytes.

- Token matches → the change is applied.
- Token differs but the file says the same thing after normalisation → the answer
  is "nothing changed", not an error.
- Token differs and the file really changed → the write is refused, and the
  refusal carries the current map, so the agent re-reads and retries against what
  is there now.

Reads report what they cannot represent and write it nowhere. Writes refuse rather
than lose it: a map from a newer version of the product, a document that would drop
a waypoint, link, stop or file path, a waypoint label that is empty, a file path
that escapes the project — each has its own refusal with its own sentence.

## The agent and the interface at the same time

There is no socket between them. The agent writes the file; the interface notices
it as an outside change and says what changed, exactly as it does for your editor.
With the interface closed, everything still works: the interface is a view of the
folder, not a requirement.

That means the two never disagree, and it also means you should not have both
write in the same second. If the map notice appears while you were typing, the
choice is the usual one: **Reload** to take the agent's version, **Keep mine** to
write yours over it.
