# Feature Specification: Agent Access to the Map

**Feature Branch**: `013-mcp-agent-access`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "доступ агента к карте через MCP"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The agent answers from the map, not from guesses (Priority: P1)

A person has a map of their project. They ask their coding agent "what are we
building and why?" or "which parts of the code are tests for the risk we noted?".
The agent reaches the map, reads the waypoints, the links between them and the
tours, and answers with the labels the person wrote — quoting the goal, the user
need, the decision — instead of summarising the code from scratch.

**Why this priority**: This is the entire point of giving an agent access. Without
it the map is only visible to the person; with it, the map becomes the context the
agent works from. Read-only access alone already changes the answers.

**Independent Test**: Start with a map of three waypoints and one tour, ask an
agent that has never seen the project to name every goal on the map and what
follows from it. The answer names all three and cites the tour, without opening a
single source file.

**Acceptance Scenarios**:

1. **Given** two registered projects, **When** the agent asks what is on this
   machine, **Then** it receives both projects with their folder and the maps each
   one holds, and can tell which map a question is about.
2. **Given** a map with waypoints, links and tours, **When** the agent opens it,
   **Then** it receives every waypoint with its label and type, every link with
   its label, and every tour with its stops and the narrative between them.
3. **Given** the interface is not running, **When** the agent opens a map, **Then**
   the answer is the same as with the interface open.
4. **Given** a map file that holds something the reader cannot represent,
   **When** the agent opens it, **Then** the answer says how many entries were
   left out rather than pretending the map is complete.

---

### User Story 2 - The agent writes into the same map the person is looking at (Priority: P1)

The person asks the agent to record what it just found: "add a risk about the
retry loop and link it to the goal it threatens". The agent adds the waypoint,
links it, and the person sees it appear on the open screen within a second, with
undo available, and with their own unsaved edits still theirs.

**Why this priority**: A map that only the person can write stays a report. A map
the agent can write becomes the shared record of the work — which is the product.

**Independent Test**: With a map open in the interface, have the agent add a
waypoint and a link, then read the file and the screen. Both show the new
waypoint and the link, the person's earlier undo history is intact, and no other
file in the project changed.

**Acceptance Scenarios**:

1. **Given** an open map with two waypoints, **When** the agent adds a waypoint,
   **Then** the waypoint appears on the open screen within one second without a
   reload, and the file holds it with its label, type and position.
2. **Given** an open map, **When** the agent adds a waypoint, changes a
   description, links two waypoints, and builds a tour of three stops, **Then**
   the open screen shows all of it and the person's undo button still walks back
   through their own edits.
3. **Given** a person with unsaved edits, **When** the agent writes, **Then** the
   person is told the map changed on disk and chooses between their version and
   the one on disk; neither side is lost without a choice.
4. **Given** the agent writes, **When** the project folder is inspected, **Then**
   nothing outside the map folder has changed.

---

### User Story 3 - A bad write is refused, never half-applied (Priority: P1)

The agent tries to do something the map cannot hold: a waypoint with a type that
does not exist, a link to a waypoint it invented, a file path outside the
project, or a write based on a reading that is now out of date because the person
edited meanwhile. Nothing is written. The answer says what was wrong and what to
do instead, and the agent can try again correctly.

**Why this priority**: A map that can be silently corrupted by an agent is worse
than no agent access at all — the person loses work they cannot reconstruct. This
is not optional hardening; it is the condition for allowing writes.

**Independent Test**: Send a series of malformed and stale writes. After every
one, the file is byte-for-byte what it was before, and the answer names the cause
and the valid alternatives.

**Acceptance Scenarios**:

1. **Given** a map, **When** the agent sends a waypoint type that is not one of
   the known ten, **Then** nothing is written and the answer lists the valid types.
2. **Given** a map read a moment ago and since changed by the person, **When**
   the agent writes based on that reading, **Then** the write is refused, the
   answer carries the current state of the map, and no edit of the person is lost.
3. **Given** a map, **When** the agent removes a waypoint that three links and one
   tour stop point at, **Then** the waypoint, its links and its tour stop are gone,
   and the answer says how many of each were removed.
4. **Given** a project folder, **When** the agent names a path outside it,
   **Then** the write is refused and the folder is untouched.
5. **Given** the same content the map already holds, **When** the agent writes it
   again, **Then** the answer says nothing changed and the file is not rewritten.

---

### User Story 4 - One command connects the agent (Priority: P2)

A person installs the product and wants their agent to see the map. They run one
command. It finds the agent they use, writes the connection into that agent's own
configuration, leaves every other setting exactly as it was, and tells them the
next time they start the agent the map is available. Running it again says it is
already connected and writes nothing.

**Why this priority**: Without this the feature exists but is unreachable for
anyone who does not hand-edit configuration. It ranks below the access itself
because a person with a hand-written configuration already gets the value.

**Independent Test**: Run the command twice against a configuration that already
contains other servers. The agent's configuration is valid after both runs, the
other servers are untouched byte for byte, the second run reports no change, and
the agent starts and reaches the map.

**Acceptance Scenarios**:

1. **Given** a machine with a known agent installed and not connected, **When**
   the person runs the command, **Then** the agent's configuration gains the
   connection, the person is told which file changed, and the command exits
   successfully.
2. **Given** an agent already connected, **When** the person runs the command
   again, **Then** every file is byte-identical afterwards and the answer says it
   was already connected.
3. **Given** a configuration that holds other servers, **When** the connection is
   added, **Then** every other entry stays exactly as it was.
4. **Given** no known agent on the machine, **When** the person runs the command,
   **Then** nothing is written, the command prints the connection to add and where
   it goes, and exits with a distinct code that says "nothing to connect here".
5. **Given** a connected machine, **When** the person asks whether the map is
   reachable, **Then** the answer says which agents are connected, whether the
   configured command still exists, and — when it does not — the command that
   fixes it.

---

### User Story 5 - The shipped instructions teach the working loop (Priority: P3)

The agent that reads the map is told how the map is meant to be used: read before
writing, write one thing at a time, read back what was written, and never invent a
waypoint that the person did not ask for. These instructions ship with the
product and are found by the agent without the person copying anything.

**Why this priority**: The capability works without the instructions; they make
the difference between an agent that uses the map well and one that treats it as
a scratchpad. They are also the easiest part to iterate on.

**Independent Test**: Ask a freshly connected agent to add a waypoint. It reads
the map first, uses a valid type, and reads the map back afterwards — because the
instructions it was given say so.

**Acceptance Scenarios**:

1. **Given** a connected agent, **When** it starts work on a map, **Then** the
   instructions it receives name the read-change-read-back loop, the valid
   waypoint types, and the refusal behaviour.
2. **Given** the instructions, **When** the product is updated, **Then** the
   instructions live in the repository with the code and are reviewed like code.

---

### Edge Cases

- The map file disappears between the read and the write: the write is refused and
  the answer says the map is gone, rather than recreating it from memory.
- The project folder is moved or renamed after it was registered: the answer names
  the missing folder instead of an empty map.
- Two projects share a name: the agent must address a project by its folder when
  the name is not enough, and an ambiguous name is refused rather than guessed.
- A project holds several maps: the read says which file it opened, and a write
  intended for another map is refused.
- The person is typing when the agent writes: the person's unsaved edits survive
  and the person chooses what to keep (see 011's behaviour).
- The person deletes a waypoint in the interface while a tour stops on it: the
  tour stop goes with it, and the agent's next read shows that.
- A waypoint type is valid in a newer map version than this build understands:
  the read reports it as left out instead of dropping it silently.
- The project folder is not writable: reads work, writes are refused with the
  reason.
- The agent writes the same value twice: the second write reports "unchanged" and
  does not touch the file.
- The agent's configuration file is missing, empty, or malformed: the command
  reports it and changes nothing rather than overwriting it.
- Two agents are connected at once: each write is complete on its own, and the
  later read sees the earlier write.
- The person deletes a map while the agent is connected: the next read says the
  map is gone, and nothing is written back.

## Requirements _(mandatory)_

### Functional Requirements

**Reading**

- **FR-001**: The agent MUST be able to ask which projects this machine knows,
  and receive each project's name, folder and maps, with the map files named.
- **FR-002**: The agent MUST be able to open one map and receive its whole
  content: waypoints with label, type, description, notes and file path; links
  with their labels and the waypoints they join; tours with their stops, order and
  narrative.
- **FR-003**: A read MUST work with the interface closed.
- **FR-004**: A read MUST state how many entries were left out when the file holds
  something this build cannot represent.
- **FR-005**: A read MUST carry a token that identifies the exact state of the file
  that was read, so a later write can tell whether the map moved underneath it.
- **FR-006**: A read of a missing folder, a missing map or an unreadable file MUST
  fail with a message naming what is missing, and MUST NOT return an empty map.

**Writing**

- **FR-007**: The agent MUST be able to add a waypoint with a label and one of the
  known types, and optionally a description, notes, a file path inside the project
  and a position; a position left out is chosen so the waypoint does not cover
  another one.
- **FR-008**: The agent MUST be able to change a waypoint's label, type,
  description, notes, file path or position, changing only the fields it names.
- **FR-009**: The agent MUST be able to remove a waypoint; its links and its tour
  stops go with it, and the answer MUST say how many were removed.
- **FR-010**: The agent MUST be able to link two waypoints, with an optional label,
  and to remove a link.
- **FR-011**: The agent MUST be able to create a tour with a name and optional
  description and author, and to set the tour's stops in order, each with an
  optional narrative.
- **FR-012**: A write MUST touch nothing outside the map folder of the project it
  addresses, and MUST refuse a file path outside the project.
- **FR-013**: A write that names a waypoint that does not exist, links a waypoint
  to itself, or stops a tour on a waypoint that is not on the map MUST be refused.
- **FR-014**: A write MUST be refused when the map changed since the read the write
  was based on; the refusal MUST carry the current map so the agent can act on
  what is true now.
- **FR-015**: A refused write MUST leave the file exactly as it was, and MUST say
  what was wrong and which alternatives are valid.
- **FR-016**: A write that changes nothing MUST be reported as unchanged and MUST
  NOT rewrite the file.
- **FR-017**: A write MUST reach the disk whole: another reader sees either the
  previous map or the new one, never a partial file, and a failed write leaves the
  previous map in place.
- **FR-018**: A write that succeeds MUST appear in an open interface within one
  second, without a reload, and MUST NOT discard the person's earlier undo
  history.

**Coexistence with the person**

- **FR-019**: When the person has unsaved edits and the agent writes, the person
  MUST be told and MUST choose between their version and the one on disk; neither
  is discarded without that choice.
- **FR-020**: When the person and the agent write at the same moment, the later
  write MUST NOT silently win: it is refused as out of date and the writer re-reads.

**Connecting the agent**

- **FR-021**: A single command MUST connect the agent found on the machine,
  writing only that agent's own configuration, and MUST name the file it changed.
- **FR-022**: The command MUST leave every other entry of that configuration, and
  every other file, byte-identical.
- **FR-023**: The command MUST be repeatable: a second run changes nothing and says
  the agent is already connected.
- **FR-024**: When no known agent is present, or the configuration cannot be read
  safely, the command MUST write nothing, print what to add and where, and exit
  with a code distinct from success and from failure.
- **FR-025**: The product MUST report, on request, which agents are connected,
  whether the configured command still exists, and — when it does not — the
  command that fixes it, without changing anything itself.

**Instructions**

- **FR-026**: The product MUST ship instructions that name the read-change-read-back
  loop, the valid waypoint types, and the refusal behaviour, and an agent that
  receives them MUST be able to find them without the person copying anything.

**Boundaries**

- **FR-027**: No capability of this feature may reach outside the registered
  projects and the map folders inside them.
- **FR-028**: No capability of this feature may send anything off the machine, and
  none may require an account, a key or a running interface.

### Key Entities

- **Project**: a folder this machine knows about, with a name, a folder path and
  the maps inside it.
- **Map**: one file in a project's map folder, holding waypoints, links and tours,
  with a version.
- **Waypoint**: a named item on the map, of one of the ten known types, with
  optional description, notes, file path and position.
- **Link**: a labelled or unlabelled connection between two waypoints.
- **Tour**: a named walk through the map, with an author, a description and an
  ordered list of stops.
- **Stop**: one waypoint inside a tour, with an optional narrative.
- **State token**: what a read returns alongside the map, identifying the exact
  file state the write must still match.
- **Refusal**: an answer that names what was wrong, what is valid instead, and
  leaves the file untouched.
- **Agent connection**: the entry in an agent's own configuration that points it at
  the map, with the agents that are connected and the ones that are not.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An agent that has never seen a project can name all of a map's goals
  and the tour that explains them after two requests, without opening a source file.
- **SC-002**: Changes made by the agent appear on an open screen within one second
  in 20 out of 20 consecutive edits, and none of the person's earlier undo steps
  are lost.
- **SC-003**: Across 50 deliberately invalid, stale or out-of-range writes, zero
  files are corrupted, zero writes succeed silently, and every refusal names the
  cause and a valid alternative.
- **SC-004**: A map with 250 waypoints is read in under one second and written in
  under one second.
- **SC-005**: Connecting an agent twice leaves every file byte-identical the second
  time, and a machine with other configured servers keeps all of them intact.
- **SC-006**: Every capability works with the interface closed: 100% of reads and
  writes succeed on a machine that never started the interface.
- **SC-007**: Across 10 writes made while a person is typing, zero edits are lost
  on either side, and the person is asked once per situation.
- **SC-008**: A person who has never connected an agent completes the connection in
  under two minutes with one command and no hand-editing of configuration.

## Assumptions

- The map is the same artefact the person edits; there is no separate agent-side
  copy, cache or database. The folder is the interface between them.
- The agent talks to the map through the standard protocol this feature names, on
  this machine only. The concrete set of advertised capabilities and their exact
  names are fixed during planning, not here.
- One person, one machine: no authentication, no permissions, no sharing. Access
  to the machine is access to the map.
- The agent addresses any registered project, not only the current folder, in the
  same way `status` already does. Reading the machine's project list is part of
  the access, not a separate feature.
- The known agents supported by the connection command are those with a local
  configuration file in a documented place; the list is decided during planning
  and validated against the agent actually starting.
- Removing whole maps and removing projects from the workspace stay in the person's
  hands; the agent may not delete either.
- Live synchronisation between the file and the open screen already exists (011);
  this feature consumes it rather than changing it.
- Import and export of maps stay out of scope; they are a separate feature.
