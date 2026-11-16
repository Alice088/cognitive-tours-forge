# Feature Specification: One command that opens a repository's map

**Feature Branch**: `012-ctour-cli`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "CLI `ctour`: init / serve / status / doctor — one command starts the local map workspace for a repository, with no clone, no configuration file and no account."

## Clarifications

### Session 2026-11-16

- Q: Should `.ctour/` replace the map folder entirely, or hold only the command's own state while maps stay in `.tours/`? → A: Replace it entirely: maps live at `.ctour/<name>.tour.json`, the `.tours/` folder ceases to exist.
- Q: Where does `.ctour/` go when the start command is run from a subdirectory? → A: The repository root: the run registers the repository, not the directory the terminal happens to be in, and falls back to the given folder when it is not inside a repository.
- Q: Does the start command wire the assistant in this feature, writing the agent configuration entry and installing the skills? → A: No: it prepares the map and the workspace only; agent wiring and its check in the doctor command arrive with the assistant server itself, so no command writes to an agent configuration file or installs a skill here.
- Q: Does the doctor command only report, or also repair what it can? → A: Report only: every problem is one line with the path, the reason and the command that fixes it, and no command in this feature repairs on the person's behalf.
- Q: What happens when the interface is asked to start in a folder that is not a project and no project is named? → A: The workspace screen opens, listing the registered projects or saying there are none, instead of an error.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - From a repository to a map in one command (Priority: P1)

A person is standing in the root of a repository that has no map yet. They type one command. A `.ctour/` folder appears with a map file inside it, the project is registered in the machine-local workspace, and the interface is already serving at an address printed in the terminal. They click the address and see an empty map they can start drawing on.

**Why this priority**: This is the entire promise of the product — "one command to start" — and every other command only makes sense after a repository is known to the workspace. Without it the application can only be started by someone who cloned this repository and knows its internals.

**Independent Test**: Take a throwaway folder with a few source files, run the single command there, and check that a map file exists, that the terminal prints an address, and that opening the address shows the project in the sidebar with an empty canvas. No prior state on the machine.

**Acceptance Scenarios**:

1. **Given** a folder that is not yet known to the workspace, **When** the person runs the start command in it, **Then** a map file is created inside that folder, the project appears in the terminal output with its path, and an address is printed that opens straight onto the empty map.
2. **Given** a repository that already contains a map file, **When** the person runs the start command, **Then** the existing map is adopted as it is — no waypoint, tour or label changes — and the same address is printed.
3. **Given** a project already in the workspace, **When** the person runs the start command again, **Then** no file on disk changes by a single byte and the interface opens on the existing map.
4. **Given** the command is run from a subdirectory of a repository, **When** it finishes, **Then** `.ctour/` and the workspace entry both point at the repository root, and the printed address opens that project, not the subdirectory.
5. **Given** the command is run in a folder that the person cannot write to, **Then** it stops with one sentence naming the folder and the reason, and leaves no partial map file behind.

---

### User Story 2 - Start the interface without re-initialising anything (Priority: P1)

The person closed the terminal yesterday. Today they open a terminal, go to the same repository, and type the serve command. The interface is back, on the same project, with the map as it is on disk now. Nothing is created, registered or asked.

**Why this priority**: Starting and stopping must be dull. If opening the interface can also write project files, people stop trusting the command and go back to editing the file by hand.

**Independent Test**: Initialise once, stop the process, run the serve command, and confirm the map opens with the same waypoints and that no file in `.ctour/` was rewritten.

**Acceptance Scenarios**:

1. **Given** an initialised project, **When** the person runs the serve command, **Then** the interface opens on that project's map and no file in the repository is written before the person edits something.
2. **Given** an address already in use by another process, **When** the interface starts, **Then** it chooses another free address, says which one it chose, and never fails because of the conflict.
3. **Given** the interface is running, **When** the person stops it with the interrupt key, **Then** the process exits within a second, frees the address, and the map file is left exactly as saved.
4. **Given** the current folder is not registered and no project is named, **When** the person runs the serve command, **Then** the interface opens on the workspace screen, the terminal says the folder is not a project yet, and nothing is created.
5. **Given** the workspace holds several projects, **When** the person runs the serve command inside one of them, **Then** that project is the one open, and the others are one click away in the sidebar.

---

### User Story 3 - See the state of every project at a glance (Priority: P2)

A person maintains six repositories with maps. They type the status command and get one short table: name, path, whether the map file is there, how many waypoints and tours it has, and a warning for each project whose folder or map has gone missing. No interface needed.

**Why this priority**: The workspace is machine-local state that lives outside every repository, so there must be a way to inspect it without opening a browser — especially when a project has been moved and the workspace is now pointing at nothing.

**Independent Test**: Register three projects, delete one folder, damage one map file, run the status command, and check that the table names all three and marks exactly the two broken ones.

**Acceptance Scenarios**:

1. **Given** three registered projects, **When** the person runs the status command, **Then** each project is listed once with its path, waypoint count and tour count.
2. **Given** a registered project whose folder no longer exists, **When** the person runs the status command, **Then** that row is marked as missing and the command still reports the other projects normally.
3. **Given** a map file that cannot be read, **When** the person runs the status command, **Then** the row says the file is unreadable and the command does not fail as a whole.
4. **Given** the workspace is empty, **When** the person runs the status command, **Then** the output says so in one line and suggests the command that adds a project.

---

### User Story 4 - Find out why something does not work (Priority: P2)

Something is wrong: the interface opens on a project but nothing is editable, or a colleague's machine shows a different map. The person runs the doctor command. It checks the things the product depends on — that each registered folder is reachable, that each map file parses and keeps its waypoints, that the workspace file itself is intact — and prints one line per problem with the path involved and the action that fixes it.

**Why this priority**: The product has no account, no server and no logs to send anywhere. The only support channel is the machine itself, so the command that explains the machine is part of the product, not a debugging aid.

**Independent Test**: Damage one map file, make one project folder read-only, corrupt the workspace file, and run the doctor command: three named problems, each with a path, and no stack trace.

**Acceptance Scenarios**:

1. **Given** a healthy workspace, **When** the person runs the doctor command, **Then** every check reports a clear pass and the exit is successful.
2. **Given** a map file that lost a waypoint, **When** the person runs the doctor command, **Then** the report names the file and what would be lost, and suggests what to do.
3. **Given** a workspace file that cannot be parsed, **When** the person runs the doctor command, **Then** the report says so, names the file, states that projects must be added again, and the file is left untouched.
4. **Given** any problem, **Then** the exit status is non-zero, so a script can tell a healthy machine from a broken one.

---

### User Story 5 - Install the command once, use it in any repository (Priority: P3)

A person installs the tool once on their machine. Afterwards the command works in any repository, without cloning this project and without editing a configuration file. Help output lists the commands and their meaning, and asking for the version prints one line.

**Why this priority**: It turns the product from "a repository you run" into "a tool you have", which is what makes `init` in an arbitrary repository meaningful. It is lower than the rest because the workflow itself already works without it.

**Independent Test**: On a machine with the tool installed, run the help and version commands outside any repository, then run the start command in a fresh folder; nothing has to be cloned.

**Acceptance Scenarios**:

1. **Given** the tool is installed, **When** the person asks for help, **Then** every command is listed with one line of meaning.
2. **Given** the tool is installed, **When** the person asks for the version, **Then** one line with a version number is printed.
3. **Given** an unknown command, **Then** the output says the command is unknown, lists the valid ones, and exits with a non-zero status.
4. **Given** a folder with no map and no workspace entry, **When** the person runs the start command there, **Then** it works without any file of this project being present in that folder.

---

### Edge Cases

- The folder passed to the start command is a file, not a directory.
- The folder is outside the person's home directory, or is a symlink pointing outside it.
- The folder already belongs to a different project entry under the same name.
- A map file exists but is empty, truncated, or holds an unsupported version.
- The `.ctour/` folder exists but is not writable while the project folder is.
- The folder is the person's home directory, so its `.ctour/` would sit on top of the machine-local workspace.
- A leftover `.tours/` folder from the previous version is present, holding a map and other files.
- The repository already holds an agent configuration file with other servers in it.
- The interface is already running for that project in another terminal.
- The person runs the start command from a subdirectory of an already initialised repository — the same project opens and nothing is duplicated.
- The enclosing repository root is itself a subdirectory of another repository, or the repository has no version-control metadata at all.
- The path contains spaces, quotes or non-ASCII characters.
- The machine has no browser available; the address is still valid when pasted elsewhere.
- The terminal is closed while the interface is running; the map must be left as last saved.
- Two projects have the same folder name in different locations.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The product MUST be usable through one command typed in a terminal, installed once per machine, working in any repository without that repository containing this product's code.
- **FR-002**: The start command MUST create the project's `.ctour/` folder and one map file inside it only when no map file exists, and MUST never modify an existing map file. A `.ctour/` folder that already holds a map file MUST be used as it is.
- **FR-003**: The start command MUST register the current folder in the machine-local workspace if it is not registered yet, and MUST NOT register it twice.
- **FR-004**: The start command MUST run a second time without changing any file, byte for byte, and without duplicating a workspace entry.
- **FR-005**: The start command MUST print, in the terminal, the project it registered, the path used, and one address that opens straight onto that project's map.
- **FR-006**: The start command MUST refuse a folder that cannot be written to, naming the folder and the reason, and MUST leave no partial file behind.
- **FR-007**: The start command MUST refuse to register a folder outside the person's home directory, and MUST say why.
- **FR-008**: The start command MUST adopt a map file that is already present, including one the person wrote by hand, without rewriting or reformatting it.
- **FR-009**: The start command MUST fail with a readable message when the folder it is given is a file, does not exist, or cannot be read.
- **FR-010**: The serve command MUST start the interface for an already registered project without creating, registering or writing anything.
- **FR-011**: The serve command MUST choose a free address when the preferred one is taken, and MUST print the address it actually uses.
- **FR-012**: Both the start and serve commands MUST support starting the interface for a specific registered project, and MUST default to the project containing the current folder.
- **FR-013**: Stopping either command MUST leave the map file as last saved, free the address, and exit within one second.
- **FR-014**: The status command MUST list every registered project with name, path, whether its map file is present, and the number of waypoints and tours.
- **FR-015**: The status command MUST mark a project whose folder is missing or whose map file cannot be read, and MUST still report the remaining projects and exit successfully.
- **FR-016**: The doctor command MUST check every registered project's folder, every map file's readability and completeness, and the integrity of the workspace file.
- **FR-017**: The doctor command MUST report each problem on its own line with the path involved and the action that resolves it, without a stack trace, and MUST exit with a non-zero status when any problem is found.
- **FR-018**: The product MUST provide help output listing every command with one line of meaning, a version output of one line, and a non-zero exit with the list of valid commands for an unknown command.
- **FR-019**: Every command MUST be readable when its output is piped or captured: no interactive prompt, no animation, no colour that carries meaning on its own, and no command that waits for input.
- **FR-020**: No command may send the map, the project path or any workspace content anywhere off the machine.
- **FR-021**: The start command MUST refuse a folder whose own `.ctour/` would be the machine-local workspace directory, which is the person's home directory, and MUST say which folder to name instead.
- **FR-023**: No command in this feature may create, modify or install anything outside `.ctour/` inside the project, the machine-local workspace, and its own output. An agent configuration file that already exists in the repository MUST be left byte-identical.
- **FR-024**: The doctor command MUST NOT modify anything. Each problem it reports MUST name the path, the reason and the command that resolves it, and the command MUST be safe to run repeatedly.
- **FR-025**: When the current folder is not registered and the person names no project, the serve command MUST open the interface on the workspace screen listing every registered project instead of failing, and MUST say in the terminal that this folder is not a project yet.
- **FR-022**: The start command MUST place `.ctour/` and the workspace entry at the root of the enclosing repository when the given folder is inside one, and in the given folder when it is not. Running it from a subdirectory MUST NOT create a second map or a second workspace entry for the same repository.

### Key Entities _(include if feature involves data)_

- **Project entry**: a repository the person has opened at least once — a stable identifier, the absolute path, a display name, and when it was added. Lives in the machine-local workspace, never in the repository.
- **Map file**: the document inside the repository, one or more per project, already defined by the map format; the command treats it as read-only unless it is creating it.
- **Workspace**: the machine-local list of project entries, its own file with a format version, replaceable by re-adding projects.
- **Diagnostic report**: the outcome of one check — what was looked at (a path), whether it passed, and the action to take when it did not.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A person who has never seen the product goes from an empty folder to a drawn map by typing one command and opening the printed address, in under one minute.
- **SC-002**: Running the start command a second time leaves every file in the repository byte-identical — verified by comparing the tree before and after.
- **SC-003**: The interface is reachable at the printed address within two seconds of the command being run on a machine that already has the tool installed.
- **SC-004**: Starting the interface when the preferred address is already taken succeeds on the first attempt, with the alternative address printed, in every case.
- **SC-005**: The status command reports six projects in under two seconds and marks every missing folder and unreadable map without failing.
- **SC-006**: The doctor command names one hundred percent of deliberately damaged fixtures across folder, map file and workspace file, each with the path involved.
- **SC-007**: Stopping the interface with the interrupt key returns control to the terminal within one second in ten out of ten attempts, with the stored map unchanged.
- **SC-008**: Help, version and unknown-command output each fit on one screen and none of them requires the person to know a command name in advance.

## Assumptions

- The person has a terminal on their machine, and the tool is installed once per machine through the platform's package manager.
- The machine-local workspace from the previous feature already exists as the single source of truth for registered projects; this feature adds the way to populate it from the outside.
- The map format, the interface and the file synchronisation are already implemented and are treated as fixed inputs here, with one exception this feature owns: the folder that holds maps is renamed from `.tours/` to `.ctour/`, and every reader and writer follows. Nothing has been published yet, so no installation needs to be migrated; a leftover `.tours/` folder is left untouched and reported by the doctor command rather than moved silently.
- "One command" means one command after installation, not one command that also installs itself.
- The agent integration (wiring the assistant to the map, installing the skills, and the check of that wiring in the doctor command) belongs to the following feature: this one only prepares the ground by making the workspace reachable from a terminal, and touches nothing an assistant reads.
- Import and export of maps between machines belong to a later feature; the start command creates an empty map, it does not import one.
- A project is a folder; nested projects are allowed and each is registered separately. The enclosing repository root wins over the folder the command was run in.
- The preferred address is a fixed default chosen by the product, not a value the person must configure.
