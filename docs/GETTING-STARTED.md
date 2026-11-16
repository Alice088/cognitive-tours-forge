# Getting started with Cognitive Tours

Cognitive Tours is a map of a software project: **waypoints** for what matters
(goals, user needs, features, decisions, code, tests, risks, open questions),
linked to each other, and **tours** that walk a reader through them in order,
with a short narrative between stops. You build the map yourself; writing it is
how the understanding gets built. See the [README](../README.md) for the ideas
behind it.

## 1. Start it

Cognitive Tours runs on your machine and nothing leaves it. You need Node 22 or
newer and a git checkout:

```bash
git clone https://github.com/margaretstorey/cognitive-tours.git
cd cognitive-tours
npm install
npm run dev
```

Open `http://localhost:3000`. The first screen is empty on purpose: it asks for a
project.

## 2. Add your project

Press **Add project** and pick the folder that holds your code. A project needs
no preparation — the map is created inside it on the first **Create map**, in
`.tours/`.

Each map is a file: `.tours/<name>.tour.json`. It travels with the repository,
so it is committed, reviewed and cloned like the code it describes. A repository
can hold several maps; the rail lists them.

Which projects you have open is remembered separately, in
`~/.ctour/workspace.json` — a fact about this machine, not about the repository.

## 3. Write a few waypoints

With a map open:

- **Add a waypoint** in the inspector. Give it a label, a type, and, if it
  belongs to a file, the file's path inside the project.
- Drag a waypoint on the canvas to move it. Press **Connect to a waypoint** in
  the inspector to link two of them and name the link ("motivates", "implemented
  by", "tested by").
- Write the description in your own words. This is the part that has to be
  yours: the map is worth nothing if it repeats what the code already says.
- **Add a waypoint** again, link it, and you have a small piece of a map.

Every change is saved 800 ms after you stop, straight into the `.tours/` file,
and every change can be undone — `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`.

## 4. Walk a tour

**New tour** in the dock, then **Edit tour** to choose stops in order and write
the narrative for each. Step through it with the next and previous buttons;
`Export` writes the tour as Markdown.

A tour is the part other people read. A map nobody can walk through is a pile of
notes.

## 5. What it does not do yet

The `ctour` command line entry point, the MCP server that lets an AI agent read
and write the same map, and the skill files that teach an agent the map format
are specified separately and not built yet. Today the application is started
with `npm run dev` from a checkout, and the map is edited in the browser.

## Before you share a link

The application has no login because it has no server to log in to: it is a
local process reading local files. Sharing a map means sharing the repository,
which is the point — the map is reviewed next to the code it explains.
