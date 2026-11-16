# Mapping a project

A map is a graph of the facts your code does not carry. This guide is about
building one that stays useful after the novelty wears off.

## Where the map lives

A project holds its maps in `.ctour/`, one file each:

```
your-project/
  src/
    queue.ts
  .ctour/
    support-inbox.tour.json
    triage.tour.json
```

Each file is committed, reviewed, and cloned with the code. One repository can
hold as many maps as it has views worth keeping — a whole-product map, a map of
one subsystem, a map of the queue nobody wants to touch. The rail lists them under
the project.

Which folders you have opened is remembered per machine, in
`~/.ctour/workspace.json`. That is deliberately not in the repository: it is a
fact about your laptop, not about the code.

## Waypoints

A waypoint is one fact, typed, and written in a sentence or two.

| Field           | What goes in it                                                   |
| --------------- | ----------------------------------------------------------------- |
| **Label**       | The claim, short enough to read on the canvas — ten words at most |
| **Type**        | Which question it answers; also its colour and its filter         |
| **Description** | Why it is true, what it costs, what would break. Your words       |
| **Notes**       | Scratch space: links out, open threads, anything long             |
| **File**        | The file it belongs to, relative to the project root              |
| **Links**       | Named edges to other waypoints                                    |

The ten types are defined in the [README](../../README.md#what-a-map-is).
The short version: **Goal**, **User Need**, **Feature** say what the product is
for; **ADR**, **Code Component**, **Test**, **Deprecated** say how it is built;
**Risk**, **AI Instruction**, **Open Question** say what could go wrong and what
an agent must know before touching it.

Three habits make the difference:

- **One fact per waypoint.** A waypoint that carries two claims cannot be linked
  precisely, and one of the two will quietly go stale.
- **Write what the code cannot.** The signature is in the code. The reason the
  parameter is optional for one caller is not.
- **Prefer a named link to a paragraph.** "This test makes that promise
  checkable" is a link from **Test** to **Feature**, not a sentence in a
  description.

## Links

Select a waypoint, press **Connect to a waypoint**, pick the other one, and name
the relationship. The name is yours: "motivates", "implemented by", "tested by",
"superseded by", "would break if". A named edge is a sentence the reader can
follow, and the inspector lists them in both directions.

## Layout

Drag a waypoint to move it; the position is saved with the map, so the picture is
the same for everyone who opens it. There is no auto-layout, and that is on
purpose: the arrangement is part of the explanation — goals at the top, code in
the middle, risks where they bite.

## Finding things

The canvas's top row has a search field and a type filter. Search matches labels
and descriptions; the filter narrows the canvas to the types you are thinking
about. The count beside them says how many waypoints the map holds.

## Saving, undo, and the file

- Edits save themselves 800 ms after you stop typing. The dock shows _pending_,
  _saved_, or _failed_.
- Undo and redo behave like a browser's: `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`, per
  session, per map, fifty steps deep. Selection and dragging the canvas are not
  edits.
- The file is followed while it is open. If something else writes it — your
  editor, `git checkout`, an agent — the map says what changed and offers
  **Reload** or **Keep mine**. Nothing is merged silently.
- Opening a map never rewrites it. If you hand-edited a file, the first save
  normalises it; the diff that produces is yours to review, so commit
  hand-edited layout separately from content.

If you want to edit the file by hand, keep the shape: `version`, `waypoints`,
`links`, `tours`, sorted by id, two-space indent, one waypoint per line group.
`specs/010-app-shell/contracts/map-file.md` is the contract.

## When the folder moves

If a project folder is renamed or deleted, the project stays in the rail, marked,
and opening it serves the last copy saved on this machine — read only, every
editing control disabled. The only action is to choose a new location for the
project. That copy is a fallback, never a source of truth: nothing is read from it
while the folder is reachable.

## Writing a map with an agent

An agent connected through `ctour mcp` can add and change exactly what you can.
Two habits make that pleasant: keep **AI Instruction** waypoints where the agent
will read them first, and let the agent write the map while you read the tour it
produces. See [Working with an agent](working-with-an-agent.md).
