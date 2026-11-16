# Moving maps between projects

A map normally lives in one repository and travels with it. Sometimes it should
travel another way: a map of an old product that becomes the starting point for
the new one, a tour that is easier to send as a file, a machine that is being
replaced.

## Saving a copy

**Save a copy** in the map's top row writes the current map into a folder you
pick. The copy is the file's bytes — not a re-serialisation — so what leaves is
what the project holds, including a hand-edited layout.

An existing file is never replaced. If the name is taken, the copy takes the next
free one and the dialog says which name it used.

**Export all maps** does the same for every map in the project at once, into one
folder, named after the map files they came from.

## Bringing a map in

**Bring in maps** on a project in the rail opens a preview before anything is
written:

- The name each map will get inside `.ctour/`.
- What it holds: waypoints, links, tours, stops.
- The entries this product cannot represent — a waypoint type from a newer
  version, a field that no longer exists — counted, not silently dropped.

Nothing is written until you confirm, and the confirmation is a screen that states
how many entries will be lost if you continue. Refusing leaves the folder exactly
as it was, and so does a file that is not a map at all, or one whose version is
newer than this build: those are refused with one sentence.

The write creates the file exclusively. If the name was taken between the preview
and the confirmation, the new map gets a suffix instead of overwriting the map
that took the name.

## Moving a whole workspace

The registry in `~/.ctour/` is what your machine remembers: the project names, the
folders they were opened from, the last place you had open, and the last known copy
of every map it has seen. Two commands carry that to another machine.

```bash
ctour workspace export ~/ctour-workspace.json
ctour workspace import ~/ctour-workspace.json
```

The export is one JSON file with a version, and it describes what it holds so the
import can decide without guessing.

The import matches each travelled project to a folder:

| Situation                       | What happens                                           |
| ------------------------------- | ------------------------------------------------------ |
| The recorded folder exists here | it is used                                             |
| It does not, and you name one   | `--project <name>=<folder>` uses that folder           |
| It does not, and you name none  | the project is described and skipped, never guessed at |

The folder always beats the travelled copy: if the project exists on this machine,
its own maps are what you see, and the exchanged copy is only used where there is
no folder to read. Nothing is added twice — importing the same bundle again leaves
the workspace as it was.

Use `--json` if you want the result as machine-readable output rather than prose.

## What is never in a bundle

Code. A bundle carries maps and the names of folders, not the project itself. The
map is small; the repository is the thing you clone.
