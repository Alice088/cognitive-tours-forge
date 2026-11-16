# Quick start

Five minutes from a repository you have never seen to a map you can walk. You need
Node.js 20 or newer. Nothing leaves your machine.

The ideas behind it are in the [README](../README.md); the internals are in
[ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Install the command

```bash
curl -fsSL https://raw.githubusercontent.com/Alice088/cognitive-tours-forge/main/install.sh | sh
```

That one line installs `ctour` and nothing else: no project dependency, no
configuration file, no account. It needs Node.js 20 or newer, builds the interface
on your machine the first time (a couple of minutes), and installs the command into
the machine-wide npm prefix — or into `~/.local` if that prefix is not writable. It
prints where the command went and what to do next.

## 2. Start it on your project

```bash
cd ~/code/your-project
ctour init
```

That one command creates `.ctour/` with a first map, registers the project, starts
the interface on `127.0.0.1`, and prints one address:

```
project  your-project
serving  http://127.0.0.1:4317/p/your-project
```

Open that address in a browser and the map is there. The interface is a local
process: closing it does not lose anything, because every edit is already a file.

`ctour init` refuses a folder it should not touch — your home directory itself,
anything outside it, a path that is not a directory, a folder it cannot write to —
and says which of those it was.

## 3. Come back later

```bash
ctour serve
```

`serve` opens the interface again, with every project this machine knows in the
rail, and writes no file. Choose the project and map on the left; the last place
you had open is remembered.

```bash
ctour status    # the projects this machine knows, with map counts
ctour doctor    # one line per problem, with the command that fixes it
```

## 4. The first five minutes

1. **Add a waypoint** in the inspector: a label, a type, and — if it belongs to a
   file — the file's path inside the project.
2. Write the description in your own words. A waypoint that repeats what the code
   already says is noise.
3. Drag it where it belongs, then select another and press **Connect to a
   waypoint** to name the link between them — "motivates", "implemented by",
   "tested by".
4. **New tour** in the dock, then **Edit tour**: choose stops in order and write
   the narration for each. Read it with the arrows; the words appear in a card in
   the corner of the map, and **Whole tour** shows every stop's text at once.

Every change saves itself 800 ms after you stop typing, straight into
`.ctour/<name>.tour.json`, and `Ctrl/Cmd+Z` steps back through it.

More: [Mapping a project](guides/mapping-a-project.md) and
[Writing a tour](guides/writing-a-tour.md).

## 5. Let your agent read the same map

```bash
ctour mcp install
```

The command finds the agents on this machine — Claude Code, Cursor, Gemini CLI,
Codex — adds the map server to the one it finds, and leaves every other byte of
that configuration alone. Restart the agent; it can then list your projects, read a
map, and add or change waypoints, links and tours in the same file you have open.

Details, including what a refusal means:
[Working with an agent](guides/working-with-an-agent.md).

## 6. When something looks wrong

| What you see                                      | What it means                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| The workspace is empty after a restart            | `CTOUR_HOME` was set during that run; the registry lives elsewhere      |
| The dock says "Not saved"                         | The file changed on disk; the notice offers **Reload** or **Keep mine** |
| The map is read only and offers "Choose a folder" | The project folder moved; that is the last copy saved on this machine   |
| A map is not in the rail                          | It is not inside `.ctour/`, or its name does not end in `.tour.json`    |
| Nothing but boxes, no words                       | The tour's stops carry no narration yet; the reading surface says so    |

Every symptom the product can produce is in
[DEVELOPING.md](DEVELOPING.md#troubleshooting).
