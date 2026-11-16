# Product Brief — Cognitive Tours, Local First

Status: draft. Written before implementation starts.

## Why

The idea is good. The product around it is not.

Cognitive Tours should be an application you open and use. Today it is a chore:
you start something, copy commands, and move data by hand. A tool for
understanding should not need a manual to reach your own map.

I like the concept. I am rebuilding the product around it.

## What I do not like today

- **The interface does not respond.** Three panels, the same control in two
  places, no clear next action. It is slow to read and harder to trust.
- **Starting is a chain of copy and paste.** Copy a command, run an agent,
  paste the command back, wait, hope. Too many steps.
- **One map per deployment.** A second map needs a second deployment.
- **The map is not in the repository.** It lives in a server database, so it
  does not travel with the code and is never reviewed with it.
- **A map cannot be handed over.** Sharing means exporting markdown and
  losing the structure.
- **Dark mode is broken.** Only the page background changes; panels stay white.
- **The AI agent has no real access.** It can read a public URL, nothing more.

## Goals

1. **A local application.** `npx ctour serve` opens it. No hosting, no accounts.
2. **One command to start.** `npx ctour init` creates the map, connects the
   agent (MCP server plus skills) and registers the project.
3. **One workspace.** Every project and every map in one window, switched from
   a sidebar. No second deployment for a second map.
4. **The map lives in the repository.** `.ctour/*.json`, committed, reviewed,
   cloned. One repository can hold more than one map.
5. **The file and the browser stay in sync.** Edit in the browser and the file
   changes. Edit the file and the browser changes. No reload.
6. **The agent has full access.** Create, edit and delete waypoints, links and
   tours through MCP, with a plan shown before it applies.
7. **A map is portable.** Clone a repository, run `ctour init`, the map is
   there, in the same place, with the same positions.
8. **An interface that feels right.** Responsive at every width, a real light
   and dark theme, one obvious place for every action.

## Non-goals

- No hosting. No Vercel, no Turso, no per-team sites, no edit passcode.
- No accounts, no multi-user live editing, no conflict resolution between
  people.
- No change to what the product means: understanding stays with the person.
  The agent drafts and suggests; the person decides.

## Decisions

| Decision            | Value                                             |
| ------------------- | ------------------------------------------------- |
| Deployment          | Local only. All hosting code removed.             |
| Storage             | JSON files in the repository, written atomically. |
| Command             | `ctour`, published to npm.                        |
| Maps per repository | More than one is allowed.                         |
| Interface language  | English.                                          |
| First iteration     | The interface: theme, layout, project sidebar.    |

## What success looks like

- `npx ctour init` then `npx ctour serve` gives a browser with the project in
  the sidebar and the map loaded from the repository.
- Editing a waypoint in the browser shows up in `git diff`.
- Editing `.ctour/tour.json` in an editor updates the browser on its own.
- Two maps in one repository, side by side in the sidebar.
- Dark mode looks correct at every width, down to a phone.
- An agent creates a waypoint through MCP, and the map shows it.
