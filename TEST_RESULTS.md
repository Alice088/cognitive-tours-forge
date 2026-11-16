# Test Results

Формат ведения: каждый прогон добавляется сверху, сразу под этим разделом.

---

## Прогон: 2026-11-16 13:42 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run --reporter=json` (проекты unit + cli), `npx playwright test` (workers=1, production build через `next build && next start`), `npx tsc --noEmit`, `npx eslint .`

### Приёмочные тесты (`playwright test`, workers=1)

| #   | Тест                                                                       | Пакет                 | Результат | Время  |
| --- | -------------------------------------------------------------------------- | --------------------- | --------- | ------ |
| 1   | changes no file when it runs a second time                                 | cli.spec.ts           | PASS      | 0.81s  |
| 2   | opens the map for a repository in one command                              | cli.spec.ts           | PASS      | 1.59s  |
| 3   | opens the workspace screen where there is no project                       | cli.spec.ts           | PASS      | 0.49s  |
| 4   | returns the terminal within a second of the interrupt                      | cli.spec.ts           | PASS      | 0.30s  |
| 5   | takes another address when the first is busy                               | cli.spec.ts           | PASS      | 1.89s  |
| 6   | adds and removes a link between two waypoints                              | editing.spec.ts       | PASS      | 2.01s  |
| 7   | creates a tour and deletes it again                                        | editing.spec.ts       | PASS      | 2.40s  |
| 8   | moves a waypoint by dragging it on the map                                 | editing.spec.ts       | PASS      | 3.49s  |
| 9   | refuses an empty label and an absolute path in the editor                  | editing.spec.ts       | PASS      | 3.39s  |
| 10  | replays twenty changes back to the beginning and forward to the end        | editing.spec.ts       | PASS      | 59.85s |
| 11  | says why a save failed and offers one retry                                | editing.spec.ts       | PASS      | 1.16s  |
| 12  | dismisses the tour before the selection                                    | keyboard.spec.ts      | PASS      | 0.33s  |
| 13  | Escape closes the inspector drawer before anything else                    | keyboard.spec.ts      | PASS      | 0.26s  |
| 14  | focuses the map search with a slash                                        | keyboard.spec.ts      | PASS      | 0.24s  |
| 15  | moves between waypoints with the arrow keys                                | keyboard.spec.ts      | PASS      | 0.28s  |
| 16  | reaches every region with the keyboard in the contract order               | keyboard.spec.ts      | PASS      | 0.34s  |
| 17  | shows a visible focus ring on a keyboard-focused control                   | keyboard.spec.ts      | PASS      | 0.21s  |
| 18  | undo inside a text field stays text undo                                   | keyboard.spec.ts      | PASS      | 0.58s  |
| 19  | clamps a stored step that no longer exists                                 | navigation.spec.ts    | PASS      | 0.21s  |
| 20  | drops a stored tour that no longer exists                                  | navigation.spec.ts    | PASS      | 0.35s  |
| 21  | returns to the same project, map, tour and stop three times                | navigation.spec.ts    | PASS      | 0.56s  |
| 22  | pans, zooms, selects and drags inside the interaction budget               | performance.spec.ts   | PASS      | 0.86s  |
| 23  | reports a map larger than the supported size                               | performance.spec.ts   | PASS      | 0.36s  |
| 24  | stays inside the interaction budget on a 250 waypoint map                  | performance.spec.ts   | PASS      | 0.39s  |
| 25  | edits are saved once at the end of a pause                                 | responsive.spec.ts    | PASS      | 3.76s  |
| 26  | gives the space of a collapsed rail back to the canvas                     | responsive.spec.ts    | PASS      | 0.26s  |
| 27  | keeps the rail labels reachable at the medium band                         | responsive.spec.ts    | PASS      | 0.27s  |
| 28  | opens one drawer at a time and returns focus to its opener                 | responsive.spec.ts    | PASS      | 0.35s  |
| 29  | rearranges itself at the wide, medium and narrow bands                     | responsive.spec.ts    | PASS      | 0.74s  |
| 30  | a control that claims to change the map changes it                         | shell.spec.ts         | PASS      | 0.25s  |
| 31  | autosaves a description to the map file                                    | shell.spec.ts         | PASS      | 2.80s  |
| 32  | creates a map and opens it empty                                           | shell.spec.ts         | PASS      | 0.36s  |
| 33  | every visible control has an accessible name                               | shell.spec.ts         | PASS      | 0.21s  |
| 34  | keeps every tour fact in the dock                                          | shell.spec.ts         | PASS      | 0.21s  |
| 35  | keeps the dock usable at 768                                               | shell.spec.ts         | PASS      | 0.20s  |
| 36  | keeps the map visible while editing                                        | shell.spec.ts         | PASS      | 0.26s  |
| 37  | never exposes the same action in two regions                               | shell.spec.ts         | PASS      | 0.21s  |
| 38  | opens a map from the rail                                                  | shell.spec.ts         | PASS      | 0.23s  |
| 39  | rearranges at 360 without horizontal scrolling                             | shell.spec.ts         | PASS      | 0.24s  |
| 40  | resolves surfaces from tokens in the dark theme                            | shell.spec.ts         | PASS      | 0.32s  |
| 41  | restores the tour and step after leaving the map                           | shell.spec.ts         | PASS      | 0.36s  |
| 42  | shows the four regions without overlap                                     | shell.spec.ts         | PASS      | 0.21s  |
| 43  | switches theme and keeps the choice after a reload                         | shell.spec.ts         | PASS      | 0.35s  |
| 44  | undoes and redoes a change                                                 | shell.spec.ts         | PASS      | 1.97s  |
| 45  | a failed load says what failed and offers one retry                        | states.spec.ts        | PASS      | 0.17s  |
| 46  | a project without a map shows one create action                            | states.spec.ts        | PASS      | 0.16s  |
| 47  | an empty workspace adds a project itself                                   | states.spec.ts        | PASS      | 0.34s  |
| 48  | an unavailable project stays listed and can be repointed                   | states.spec.ts        | PASS      | 0.74s  |
| 49  | disables the data actions while a map is loading                           | states.spec.ts        | PASS      | 1.98s  |
| 50  | opens an unreachable project read-only from the last saved copy            | states.spec.ts        | PASS      | 0.41s  |
| 51  | asks once when both sides changed and keeps the typing                     | sync-conflict.spec.ts | PASS      | 0.46s  |
| 52  | shows one notice when a change lands while saving                          | sync-conflict.spec.ts | PASS      | 1.14s  |
| 53  | takes the file version and restarts the history                            | sync-conflict.spec.ts | PASS      | 0.53s  |
| 54  | writes the person version and raises no further notice                     | sync-conflict.spec.ts | PASS      | 2.02s  |
| 55  | applies the file again once it is valid and clears the message             | sync-invalid.spec.ts  | PASS      | 0.40s  |
| 56  | does not write the map back while the person keeps typing                  | sync-invalid.spec.ts  | PASS      | 2.08s  |
| 57  | never applies content it cannot read                                       | sync-invalid.spec.ts  | PASS      | 1.45s  |
| 58  | offers to write a deleted map back and never writes nothing                | sync-invalid.spec.ts  | PASS      | 0.31s  |
| 59  | refuses a file that would lose a waypoint                                  | sync-invalid.spec.ts  | PASS      | 0.21s  |
| 60  | writes over a file that cannot be read                                     | sync-invalid.spec.ts  | PASS      | 0.29s  |
| 61  | announces an applied change without moving focus                           | sync-outside.spec.ts  | PASS      | 0.40s  |
| 62  | does nothing when the file is rewritten with the same content              | sync-outside.spec.ts  | PASS      | 0.81s  |
| 63  | keeps editing after the file is rewritten with the same content            | sync-outside.spec.ts  | PASS      | 1.67s  |
| 64  | reconciles once when the page becomes visible again                        | sync-outside.spec.ts  | PASS      | 0.24s  |
| 65  | settles five changes into the last state                                   | sync-outside.spec.ts  | PASS      | 0.22s  |
| 66  | shows an outside change within a second and keeps the person in place      | sync-outside.spec.ts  | PASS      | 0.45s  |
| 67  | keeps the map still when a field is cleared                                | sync-own.spec.ts      | PASS      | 2.60s  |
| 68  | keeps twenty undos after twenty saves                                      | sync-own.spec.ts      | PASS      | 2.44s  |
| 69  | shows nothing when the person saves                                        | sync-own.spec.ts      | PASS      | 2.07s  |
| 70  | follows a map added and removed in the folder                              | sync-rail.spec.ts     | PASS      | 0.57s  |
| 71  | keeps the open map open when another map appears                           | sync-rail.spec.ts     | PASS      | 0.40s  |
| 72  | does not follow a map it cannot write and follows it again after relinking | sync-readonly.spec.ts | PASS      | 3.03s  |
| 73  | opens a change stream for the open map                                     | sync.spec.ts          | PASS      | 0.21s  |
| 74  | follows the system theme while it is set to system                         | theme.spec.ts         | PASS      | 0.25s  |
| 75  | keeps a dialog and a tooltip on the dark surface                           | theme.spec.ts         | PASS      | 0.60s  |
| 76  | resolves every surface of the dark theme from tokens                       | theme.spec.ts         | PASS      | 0.38s  |

### Юнит- и CLI-тесты (`vitest run`)

| #   | Тест                                                                                               | Пакет                      | Результат | Время |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------- | --------- | ----- |
| 1   | map fixture builder builds the requested number of waypoints and tours                             | build-map.test.ts          | PASS      | 0.00s |
| 2   | map fixture builder gives every waypoint a known type and a unique id                              | build-map.test.ts          | PASS      | 0.00s |
| 3   | map fixture builder points every stop at an existing waypoint                                      | build-map.test.ts          | PASS      | 0.00s |
| 4   | map cache lists the cached maps of one project only                                                | cache.test.ts              | PASS      | 0.00s |
| 5   | map cache reads back what was written                                                              | cache.test.ts              | PASS      | 0.01s |
| 6   | map cache returns nothing for a missing or escaping file                                           | cache.test.ts              | PASS      | 0.00s |
| 7   | change summary counts a moved stop as a tour change, not a waypoint change                         | diff.test.ts               | PASS      | 0.00s |
| 8   | change summary counts a moved waypoint as changed                                                  | diff.test.ts               | PASS      | 0.00s |
| 9   | change summary counts added, removed and changed waypoints                                         | diff.test.ts               | PASS      | 0.00s |
| 10  | change summary counts links and their labels                                                       | diff.test.ts               | PASS      | 0.00s |
| 11  | change summary describes what changed for a person                                                 | diff.test.ts               | PASS      | 0.00s |
| 12  | change summary is empty for the same document                                                      | diff.test.ts               | PASS      | 0.00s |
| 13  | change summary names at most three per kind in document order                                      | diff.test.ts               | PASS      | 0.00s |
| 14  | dispatch answers as JSON when asked                                                                | dispatch.test.ts           | PASS      | 0.00s |
| 15  | dispatch keeps the version in step with the package                                                | dispatch.test.ts           | PASS      | 0.00s |
| 16  | dispatch lists every command in help                                                               | dispatch.test.ts           | PASS      | 0.01s |
| 17  | dispatch names a command when none was given                                                       | dispatch.test.ts           | PASS      | 0.00s |
| 18  | dispatch prints one version line                                                                   | dispatch.test.ts           | PASS      | 0.00s |
| 19  | dispatch refuses --json outside the reporting commands                                             | dispatch.test.ts           | PASS      | 0.00s |
| 20  | dispatch refuses a port that is not a number                                                       | dispatch.test.ts           | PASS      | 0.00s |
| 21  | dispatch refuses an extra argument                                                                 | dispatch.test.ts           | PASS      | 0.00s |
| 22  | dispatch refuses an unknown command with the list                                                  | dispatch.test.ts           | PASS      | 0.00s |
| 23  | dispatch refuses an unknown option                                                                 | dispatch.test.ts           | PASS      | 0.00s |
| 24  | dispatch reports a healthy workspace from doctor                                                   | dispatch.test.ts           | PASS      | 0.00s |
| 25  | dispatch reports an empty workspace without failing                                                | dispatch.test.ts           | PASS      | 0.00s |
| 26  | doctor changes nothing on any run                                                                  | doctor.test.ts             | PASS      | 0.00s |
| 27  | doctor names a folder that moved away                                                              | doctor.test.ts             | PASS      | 0.00s |
| 28  | doctor names a map that would lose a waypoint                                                      | doctor.test.ts             | PASS      | 0.01s |
| 29  | doctor passes a healthy workspace                                                                  | doctor.test.ts             | PASS      | 0.01s |
| 30  | doctor reports a damaged workspace and leaves the file alone                                       | doctor.test.ts             | PASS      | 0.00s |
| 31  | doctor reports a leftover .tours folder                                                            | doctor.test.ts             | PASS      | 0.00s |
| 32  | map history caps the history at fifty entries                                                      | history.test.ts            | PASS      | 0.00s |
| 33  | map history discards the forward branch after a new change                                         | history.test.ts            | PASS      | 0.00s |
| 34  | map history ignores a move to where the waypoint already is                                        | history.test.ts            | PASS      | 0.00s |
| 35  | map history moves a stop without losing it                                                         | history.test.ts            | PASS      | 0.00s |
| 36  | map history moves a waypoint and records one entry                                                 | history.test.ts            | PASS      | 0.00s |
| 37  | map history never records selection or status changes                                              | history.test.ts            | PASS      | 0.00s |
| 38  | map history refuses to move a stop beyond the list                                                 | history.test.ts            | PASS      | 0.00s |
| 39  | map history removes a deleted waypoint from edges and tours                                        | history.test.ts            | PASS      | 0.00s |
| 40  | map history replays a twenty-change sequence exactly                                               | history.test.ts            | PASS      | 0.00s |
| 41  | map history starts empty and records nothing on load                                               | history.test.ts            | PASS      | 0.00s |
| 42  | map history steps back and forward through a change                                                | history.test.ts            | PASS      | 0.00s |
| 43  | one history entry per committed change does not record a change that leaves the document identical | history.test.ts            | PASS      | 0.00s |
| 44  | one history entry per committed change records exactly one entry per action type                   | history.test.ts            | PASS      | 0.00s |
| 45  | init adopts a hand-written map byte for byte                                                       | init.test.ts               | PASS      | 0.00s |
| 46  | init changes no file on a second run                                                               | init.test.ts               | PASS      | 0.00s |
| 47  | init creates one map named after the folder                                                        | init.test.ts               | PASS      | 0.01s |
| 48  | init opens the first map by name order                                                             | init.test.ts               | PASS      | 0.00s |
| 49  | init puts the map at the repository root when started from a subdirectory                          | init.test.ts               | PASS      | 0.00s |
| 50  | init refuses a map folder that is a file                                                           | init.test.ts               | PASS      | 0.00s |
| 51  | init registers the project once                                                                    | init.test.ts               | PASS      | 0.01s |
| 52  | map file accepts a file that loses nothing                                                         | map-file.test.ts           | PASS      | 0.00s |
| 53  | map file canonicalises a document the way a re-read will see it                                    | map-file.test.ts           | PASS      | 0.00s |
| 54  | map file coerces a broken position and drops an absolute file path                                 | map-file.test.ts           | PASS      | 0.00s |
| 55  | map file creates an empty document with the three collections                                      | map-file.test.ts           | PASS      | 0.00s |
| 56  | map file drops orphaned edges and stops when reading                                               | map-file.test.ts           | PASS      | 0.00s |
| 57  | map file maps an unknown type to Open Question and counts it                                       | map-file.test.ts           | PASS      | 0.00s |
| 58  | map file refuses a file name that escapes the project                                              | map-file.test.ts           | PASS      | 0.00s |
| 59  | map file refuses a file that would lose a waypoint                                                 | map-file.test.ts           | PASS      | 0.00s |
| 60  | map file refuses an unsupported version                                                            | map-file.test.ts           | PASS      | 0.00s |
| 61  | map file refuses to write an invalid document                                                      | map-file.test.ts           | PASS      | 0.00s |
| 62  | map file replaces the file atomically, leaving no temporary behind                                 | map-file.test.ts           | PASS      | 0.00s |
| 63  | map file reports a missing map                                                                     | map-file.test.ts           | PASS      | 0.00s |
| 64  | map file round-trips a document                                                                    | map-file.test.ts           | PASS      | 0.01s |
| 65  | map file serialises deterministically                                                              | map-file.test.ts           | PASS      | 0.00s |
| 66  | map file slugs a display name                                                                      | map-file.test.ts           | PASS      | 0.00s |
| 67  | map file writes sorted collections and keeps stop order                                            | map-file.test.ts           | PASS      | 0.00s |
| 68  | external document drops a selection that no longer exists and clamps the step                      | map-store-external.test.ts | PASS      | 0.00s |
| 69  | external document drops a tour that no longer exists                                               | map-store-external.test.ts | PASS      | 0.00s |
| 70  | external document keeps the selection, the tour and the step that still exist                      | map-store-external.test.ts | PASS      | 0.00s |
| 71  | external document leaves the history it already had alone                                          | map-store-external.test.ts | PASS      | 0.00s |
| 72  | nothing leaves the machine imports no network client                                               | no-network.test.ts         | PASS      | 0.00s |
| 73  | nothing leaves the machine mentions no remote address                                              | no-network.test.ts         | PASS      | 0.00s |
| 74  | nothing leaves the machine only ever talks to loopback                                             | no-network.test.ts         | PASS      | 0.00s |
| 75  | address selection fails when the whole range is taken                                              | port.test.ts               | PASS      | 0.00s |
| 76  | address selection skips an address that is taken                                                   | port.test.ts               | PASS      | 0.00s |
| 77  | address selection skips several taken addresses                                                    | port.test.ts               | PASS      | 0.00s |
| 78  | address selection takes the first free address                                                     | port.test.ts               | PASS      | 0.01s |
| 79  | workspace registry clamps an out-of-range step to zero on read                                     | registry.test.ts           | PASS      | 0.00s |
| 80  | workspace registry makes ids unique without clobbering an existing one                             | registry.test.ts           | PASS      | 0.00s |
| 81  | workspace registry recovers from unparseable content without overwriting it                        | registry.test.ts           | PASS      | 0.00s |
| 82  | workspace registry registers a project with a slugged unique id                                    | registry.test.ts           | PASS      | 0.00s |
| 83  | workspace registry returns the existing entry when the same path is registered twice               | registry.test.ts           | PASS      | 0.00s |
| 84  | workspace registry starts empty when there is no file                                              | registry.test.ts           | PASS      | 0.00s |
| 85  | workspace registry stores the last view and drops it with its project                              | registry.test.ts           | PASS      | 0.00s |
| 86  | workspace registry writes atomically and leaves no temporary behind                                | registry.test.ts           | PASS      | 0.00s |
| 87  | isWithinHome accepts an ancestor of home so browsing can reach the root                            | safe-path.test.ts          | PASS      | 0.00s |
| 88  | isWithinHome accepts the home directory and its children                                           | safe-path.test.ts          | PASS      | 0.00s |
| 89  | isWithinHome rejects an unrelated branch                                                           | safe-path.test.ts          | PASS      | 0.00s |
| 90  | resolveInside accepts a plain child                                                                | safe-path.test.ts          | PASS      | 0.00s |
| 91  | resolveInside accepts an absolute path inside the root                                             | safe-path.test.ts          | PASS      | 0.00s |
| 92  | resolveInside accepts the root itself                                                              | safe-path.test.ts          | PASS      | 0.00s |
| 93  | resolveInside does not confuse a sibling with a shared prefix                                      | safe-path.test.ts          | PASS      | 0.00s |
| 94  | resolveInside follows a symlink that leaves the root                                               | safe-path.test.ts          | PASS      | 0.00s |
| 95  | resolveInside rejects an absolute path outside the root                                            | safe-path.test.ts          | PASS      | 0.00s |
| 96  | resolveInside rejects parent traversal                                                             | safe-path.test.ts          | PASS      | 0.00s |
| 97  | resolveInside rejects traversal hidden in the middle                                               | safe-path.test.ts          | PASS      | 0.00s |
| 98  | serve target finds the project by id                                                               | serve.test.ts              | PASS      | 0.01s |
| 99  | serve target finds the project by path                                                             | serve.test.ts              | PASS      | 0.00s |
| 100 | serve target finds the project of the current folder                                               | serve.test.ts              | PASS      | 0.01s |
| 101 | serve target opens the workspace screen when the folder is not a project                           | serve.test.ts              | PASS      | 0.01s |
| 102 | serve target refuses an unknown project                                                            | serve.test.ts              | PASS      | 0.00s |
| 103 | serve target writes nothing                                                                        | serve.test.ts              | PASS      | 0.00s |
| 104 | serving builds the map address for a project                                                       | serve.test.ts              | PASS      | 0.00s |
| 105 | serving prints the address once the server answers and stops the child                             | serve.test.ts              | PASS      | 0.00s |
| 106 | server lifecycle becomes ready only after a successful answer                                      | server.test.ts             | PASS      | 0.01s |
| 107 | server lifecycle kills a child that ignores the signal                                             | server.test.ts             | PASS      | 0.03s |
| 108 | server lifecycle points at the standalone entry                                                    | server.test.ts             | PASS      | 0.00s |
| 109 | server lifecycle reports a server that never answers                                               | server.test.ts             | PASS      | 0.07s |
| 110 | server lifecycle resolves at once for a child that already exited                                  | server.test.ts             | PASS      | 0.00s |
| 111 | server lifecycle starts the standalone server on loopback with the chosen port                     | server.test.ts             | PASS      | 0.00s |
| 112 | server lifecycle stops the child on a signal and waits for it                                      | server.test.ts             | PASS      | 0.00s |
| 113 | status rows marks a folder that moved away                                                         | status.test.ts             | PASS      | 0.00s |
| 114 | status rows reports a workspace file that cannot be parsed                                         | status.test.ts             | PASS      | 0.00s |
| 115 | status rows reports an empty workspace                                                             | status.test.ts             | PASS      | 0.00s |
| 116 | status rows reports an unreadable map without partial counts                                       | status.test.ts             | PASS      | 0.00s |
| 117 | status rows reports every project with its counts                                                  | status.test.ts             | PASS      | 0.04s |
| 118 | status rows reports six projects in under two seconds                                              | status.test.ts             | PASS      | 0.01s |
| 119 | status rows serialises rows for scripts                                                            | status.test.ts             | PASS      | 0.00s |
| 120 | sync events names every kind once                                                                  | sync-events.test.ts        | PASS      | 0.00s |
| 121 | sync events reads a changed map                                                                    | sync-events.test.ts        | PASS      | 0.00s |
| 122 | sync events reads a changed map list                                                               | sync-events.test.ts        | PASS      | 0.00s |
| 123 | sync events reads an unreadable file and a missing file                                            | sync-events.test.ts        | PASS      | 0.00s |
| 124 | sync events refuses what it cannot understand                                                      | sync-events.test.ts        | PASS      | 0.00s |
| 125 | unreadable and missing files applies the file again once it can be read                            | sync-invalid.test.ts       | PASS      | 0.07s |
| 126 | unreadable and missing files reports a file that is not there when the stream opens                | sync-invalid.test.ts       | PASS      | 0.30s |
| 127 | unreadable and missing files reports a missing file once when it had content before                | sync-invalid.test.ts       | PASS      | 0.38s |
| 128 | unreadable and missing files reports one unreadable state per attempt and never the content        | sync-invalid.test.ts       | PASS      | 0.94s |
| 129 | sync stays on this machine describes events with no field beyond the contract                      | sync-local.test.ts         | PASS      | 0.00s |
| 130 | sync stays on this machine imports nothing that can reach another host                             | sync-local.test.ts         | PASS      | 0.00s |
| 131 | own writes delivers a write that no record covers                                                  | sync-own-write.test.ts     | PASS      | 0.04s |
| 132 | own writes delivers an external change that follows an own write at once                           | sync-own-write.test.ts     | PASS      | 0.30s |
| 133 | own writes records the newest text per file                                                        | sync-own-write.test.ts     | PASS      | 0.01s |
| 134 | comparison fallback delivers a change when the watcher never reports                               | sync-poll.test.ts          | PASS      | 0.17s |
| 135 | comparison fallback delivers one update however many ticks pass                                    | sync-poll.test.ts          | PASS      | 0.45s |
| 136 | comparison fallback does not go back to watching after falling back                                | sync-poll.test.ts          | PASS      | 0.16s |
| 137 | comparison fallback reports a change when the filesystem reports nothing                           | sync-poll.test.ts          | PASS      | 0.16s |
| 138 | comparison fallback settles several changes into the last state                                    | sync-poll.test.ts          | PASS      | 0.36s |
| 139 | comparison fallback stops comparing when the last subscription closes                              | sync-poll.test.ts          | PASS      | 0.25s |
| 140 | sync watcher collapses five changes into one settled update                                        | sync-watch.test.ts         | PASS      | 0.47s |
| 141 | sync watcher delivers a change made to the open map                                                | sync-watch.test.ts         | PASS      | 0.06s |
| 142 | sync watcher does not deliver a write this process made                                            | sync-watch.test.ts         | PASS      | 0.35s |
| 143 | sync watcher does not deliver an own write that normalises differently                             | sync-watch.test.ts         | PASS      | 0.40s |
| 144 | sync watcher keeps one watcher until the last subscription closes                                  | sync-watch.test.ts         | PASS      | 0.35s |
| 145 | sync watcher refuses an unreadable file and reports it once per attempt                            | sync-watch.test.ts         | PASS      | 0.45s |
| 146 | sync watcher reports a delivered file that disappears once                                         | sync-watch.test.ts         | PASS      | 0.38s |
| 147 | sync watcher says nothing when the content is identical                                            | sync-watch.test.ts         | PASS      | 0.60s |
| 148 | target resolution recognises a worktree, where .git is a file                                      | target.test.ts             | PASS      | 0.00s |
| 149 | target resolution refuses a folder outside home                                                    | target.test.ts             | PASS      | 0.00s |
| 150 | target resolution refuses a map folder that is a file                                              | target.test.ts             | PASS      | 0.00s |
| 151 | target resolution refuses a map folder without write permission                                    | target.test.ts             | PASS      | 0.00s |
| 152 | target resolution refuses a path that does not exist                                               | target.test.ts             | PASS      | 0.00s |
| 153 | target resolution refuses a path that is a file                                                    | target.test.ts             | PASS      | 0.00s |
| 154 | target resolution refuses the home folder                                                          | target.test.ts             | PASS      | 0.00s |
| 155 | target resolution takes the folder itself when there is no repository                              | target.test.ts             | PASS      | 0.00s |
| 156 | target resolution walks up to the repository root                                                  | target.test.ts             | PASS      | 0.01s |
| 157 | design tokens defines the same colour tokens in both themes                                        | theme-contrast.test.ts     | PASS      | 0.00s |
| 158 | design tokens meets 3:1 for interactive borders in dark                                            | theme-contrast.test.ts     | PASS      | 0.00s |
| 159 | design tokens meets 3:1 for interactive borders in light                                           | theme-contrast.test.ts     | PASS      | 0.00s |
| 160 | design tokens meets AA for text pairs in dark                                                      | theme-contrast.test.ts     | PASS      | 0.00s |
| 161 | design tokens meets AA for text pairs in light                                                     | theme-contrast.test.ts     | PASS      | 0.00s |
| 162 | tour validation accepts a name                                                                     | validation.test.ts         | PASS      | 0.00s |
| 163 | tour validation refuses an empty name                                                              | validation.test.ts         | PASS      | 0.00s |
| 164 | waypoint validation accepts a plain label and a relative path                                      | validation.test.ts         | PASS      | 0.00s |
| 165 | waypoint validation checks nothing it was not given                                                | validation.test.ts         | PASS      | 0.00s |
| 166 | waypoint validation refuses an absolute path                                                       | validation.test.ts         | PASS      | 0.00s |
| 167 | waypoint validation refuses an empty label                                                         | validation.test.ts         | PASS      | 0.00s |

### Сводка

| Показатель           | Значение |
| -------------------- | -------- |
| Всего                | 243      |
| PASS                 | 243      |
| FAIL                 | 0        |
| SKIP                 | 0        |
| Время (сумма тестов) | 132.09s  |
| Приёмочные           | 76       |
| Юнит + CLI           | 167      |

### Падения

нет

---

## Прогон: 2026-11-16 12:40 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run --reporter=json`, `npx playwright test` (workers=1, production build через `next build && next start`), `npx tsc --noEmit`, `npx eslint .`

### Приёмочные тесты (`playwright test`, workers=1)

| #   | Тест                                                                       | Пакет                 | Результат | Время  |
| --- | -------------------------------------------------------------------------- | --------------------- | --------- | ------ |
| 1   | adds and removes a link between two waypoints                              | editing.spec.ts       | PASS      | 2.00s  |
| 2   | creates a tour and deletes it again                                        | editing.spec.ts       | PASS      | 2.41s  |
| 3   | moves a waypoint by dragging it on the map                                 | editing.spec.ts       | PASS      | 3.04s  |
| 4   | refuses an empty label and an absolute path in the editor                  | editing.spec.ts       | PASS      | 3.39s  |
| 5   | replays twenty changes back to the beginning and forward to the end        | editing.spec.ts       | PASS      | 62.88s |
| 6   | says why a save failed and offers one retry                                | editing.spec.ts       | PASS      | 1.16s  |
| 7   | dismisses the tour before the selection                                    | keyboard.spec.ts      | PASS      | 0.35s  |
| 8   | Escape closes the inspector drawer before anything else                    | keyboard.spec.ts      | PASS      | 0.27s  |
| 9   | focuses the map search with a slash                                        | keyboard.spec.ts      | PASS      | 0.23s  |
| 10  | moves between waypoints with the arrow keys                                | keyboard.spec.ts      | PASS      | 0.29s  |
| 11  | reaches every region with the keyboard in the contract order               | keyboard.spec.ts      | PASS      | 0.33s  |
| 12  | shows a visible focus ring on a keyboard-focused control                   | keyboard.spec.ts      | PASS      | 0.21s  |
| 13  | undo inside a text field stays text undo                                   | keyboard.spec.ts      | PASS      | 0.58s  |
| 14  | clamps a stored step that no longer exists                                 | navigation.spec.ts    | PASS      | 0.19s  |
| 15  | drops a stored tour that no longer exists                                  | navigation.spec.ts    | PASS      | 0.37s  |
| 16  | returns to the same project, map, tour and stop three times                | navigation.spec.ts    | PASS      | 0.52s  |
| 17  | pans, zooms, selects and drags inside the interaction budget               | performance.spec.ts   | PASS      | 0.90s  |
| 18  | reports a map larger than the supported size                               | performance.spec.ts   | PASS      | 0.35s  |
| 19  | stays inside the interaction budget on a 250 waypoint map                  | performance.spec.ts   | PASS      | 0.36s  |
| 20  | edits are saved once at the end of a pause                                 | responsive.spec.ts    | PASS      | 3.28s  |
| 21  | gives the space of a collapsed rail back to the canvas                     | responsive.spec.ts    | PASS      | 0.25s  |
| 22  | keeps the rail labels reachable at the medium band                         | responsive.spec.ts    | PASS      | 0.28s  |
| 23  | opens one drawer at a time and returns focus to its opener                 | responsive.spec.ts    | PASS      | 0.34s  |
| 24  | rearranges itself at the wide, medium and narrow bands                     | responsive.spec.ts    | PASS      | 0.70s  |
| 25  | a control that claims to change the map changes it                         | shell.spec.ts         | PASS      | 0.26s  |
| 26  | autosaves a description to the map file                                    | shell.spec.ts         | PASS      | 2.80s  |
| 27  | creates a map and opens it empty                                           | shell.spec.ts         | PASS      | 0.37s  |
| 28  | every visible control has an accessible name                               | shell.spec.ts         | PASS      | 0.20s  |
| 29  | keeps every tour fact in the dock                                          | shell.spec.ts         | PASS      | 0.20s  |
| 30  | keeps the dock usable at 768                                               | shell.spec.ts         | PASS      | 0.19s  |
| 31  | keeps the map visible while editing                                        | shell.spec.ts         | PASS      | 0.24s  |
| 32  | never exposes the same action in two regions                               | shell.spec.ts         | PASS      | 0.21s  |
| 33  | opens a map from the rail                                                  | shell.spec.ts         | PASS      | 0.23s  |
| 34  | rearranges at 360 without horizontal scrolling                             | shell.spec.ts         | PASS      | 0.24s  |
| 35  | resolves surfaces from tokens in the dark theme                            | shell.spec.ts         | PASS      | 0.33s  |
| 36  | restores the tour and step after leaving the map                           | shell.spec.ts         | PASS      | 0.35s  |
| 37  | shows the four regions without overlap                                     | shell.spec.ts         | PASS      | 0.24s  |
| 38  | switches theme and keeps the choice after a reload                         | shell.spec.ts         | PASS      | 0.37s  |
| 39  | undoes and redoes a change                                                 | shell.spec.ts         | PASS      | 1.98s  |
| 40  | a failed load says what failed and offers one retry                        | states.spec.ts        | PASS      | 0.17s  |
| 41  | a project without a map shows one create action                            | states.spec.ts        | PASS      | 0.16s  |
| 42  | an empty workspace adds a project itself                                   | states.spec.ts        | PASS      | 0.36s  |
| 43  | an unavailable project stays listed and can be repointed                   | states.spec.ts        | PASS      | 0.72s  |
| 44  | disables the data actions while a map is loading                           | states.spec.ts        | PASS      | 1.97s  |
| 45  | opens an unreachable project read-only from the last saved copy            | states.spec.ts        | PASS      | 0.41s  |
| 46  | asks once when both sides changed and keeps the typing                     | sync-conflict.spec.ts | PASS      | 0.48s  |
| 47  | shows one notice when a change lands while saving                          | sync-conflict.spec.ts | PASS      | 1.16s  |
| 48  | takes the file version and restarts the history                            | sync-conflict.spec.ts | PASS      | 0.51s  |
| 49  | writes the person version and raises no further notice                     | sync-conflict.spec.ts | PASS      | 2.00s  |
| 50  | applies the file again once it is valid and clears the message             | sync-invalid.spec.ts  | PASS      | 0.41s  |
| 51  | does not write the map back while the person keeps typing                  | sync-invalid.spec.ts  | PASS      | 2.07s  |
| 52  | never applies content it cannot read                                       | sync-invalid.spec.ts  | PASS      | 1.45s  |
| 53  | offers to write a deleted map back and never writes nothing                | sync-invalid.spec.ts  | PASS      | 0.27s  |
| 54  | refuses a file that would lose a waypoint                                  | sync-invalid.spec.ts  | PASS      | 0.21s  |
| 55  | writes over a file that cannot be read                                     | sync-invalid.spec.ts  | PASS      | 0.28s  |
| 56  | announces an applied change without moving focus                           | sync-outside.spec.ts  | PASS      | 0.40s  |
| 57  | does nothing when the file is rewritten with the same content              | sync-outside.spec.ts  | PASS      | 0.80s  |
| 58  | keeps editing after the file is rewritten with the same content            | sync-outside.spec.ts  | PASS      | 1.66s  |
| 59  | reconciles once when the page becomes visible again                        | sync-outside.spec.ts  | PASS      | 0.24s  |
| 60  | settles five changes into the last state                                   | sync-outside.spec.ts  | PASS      | 0.22s  |
| 61  | shows an outside change within a second and keeps the person in place      | sync-outside.spec.ts  | PASS      | 0.46s  |
| 62  | keeps the map still when a field is cleared                                | sync-own.spec.ts      | PASS      | 2.60s  |
| 63  | keeps twenty undos after twenty saves                                      | sync-own.spec.ts      | PASS      | 3.39s  |
| 64  | shows nothing when the person saves                                        | sync-own.spec.ts      | PASS      | 2.09s  |
| 65  | follows a map added and removed in the folder                              | sync-rail.spec.ts     | PASS      | 0.59s  |
| 66  | keeps the open map open when another map appears                           | sync-rail.spec.ts     | PASS      | 0.40s  |
| 67  | does not follow a map it cannot write and follows it again after relinking | sync-readonly.spec.ts | PASS      | 3.00s  |
| 68  | opens a change stream for the open map                                     | sync.spec.ts          | PASS      | 0.20s  |
| 69  | follows the system theme while it is set to system                         | theme.spec.ts         | PASS      | 0.27s  |
| 70  | keeps a dialog and a tooltip on the dark surface                           | theme.spec.ts         | PASS      | 0.66s  |
| 71  | resolves every surface of the dark theme from tokens                       | theme.spec.ts         | PASS      | 0.37s  |

### Юнит-тесты (`vitest run`)

| #   | Тест                                                                                               | Пакет                      | Результат | Время |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------- | --------- | ----- |
| 1   | map fixture builder builds the requested number of waypoints and tours                             | build-map.test.ts          | PASS      | 0.00s |
| 2   | map fixture builder gives every waypoint a known type and a unique id                              | build-map.test.ts          | PASS      | 0.00s |
| 3   | map fixture builder points every stop at an existing waypoint                                      | build-map.test.ts          | PASS      | 0.00s |
| 4   | map cache lists the cached maps of one project only                                                | cache.test.ts              | PASS      | 0.00s |
| 5   | map cache reads back what was written                                                              | cache.test.ts              | PASS      | 0.00s |
| 6   | map cache returns nothing for a missing or escaping file                                           | cache.test.ts              | PASS      | 0.00s |
| 7   | change summary counts a moved stop as a tour change, not a waypoint change                         | diff.test.ts               | PASS      | 0.00s |
| 8   | change summary counts a moved waypoint as changed                                                  | diff.test.ts               | PASS      | 0.00s |
| 9   | change summary counts added, removed and changed waypoints                                         | diff.test.ts               | PASS      | 0.00s |
| 10  | change summary counts links and their labels                                                       | diff.test.ts               | PASS      | 0.00s |
| 11  | change summary describes what changed for a person                                                 | diff.test.ts               | PASS      | 0.00s |
| 12  | change summary is empty for the same document                                                      | diff.test.ts               | PASS      | 0.00s |
| 13  | change summary names at most three per kind in document order                                      | diff.test.ts               | PASS      | 0.00s |
| 14  | map history caps the history at fifty entries                                                      | history.test.ts            | PASS      | 0.00s |
| 15  | map history discards the forward branch after a new change                                         | history.test.ts            | PASS      | 0.00s |
| 16  | map history ignores a move to where the waypoint already is                                        | history.test.ts            | PASS      | 0.00s |
| 17  | map history moves a stop without losing it                                                         | history.test.ts            | PASS      | 0.00s |
| 18  | map history moves a waypoint and records one entry                                                 | history.test.ts            | PASS      | 0.00s |
| 19  | map history never records selection or status changes                                              | history.test.ts            | PASS      | 0.00s |
| 20  | map history refuses to move a stop beyond the list                                                 | history.test.ts            | PASS      | 0.00s |
| 21  | map history removes a deleted waypoint from edges and tours                                        | history.test.ts            | PASS      | 0.00s |
| 22  | map history replays a twenty-change sequence exactly                                               | history.test.ts            | PASS      | 0.00s |
| 23  | map history starts empty and records nothing on load                                               | history.test.ts            | PASS      | 0.00s |
| 24  | map history steps back and forward through a change                                                | history.test.ts            | PASS      | 0.00s |
| 25  | one history entry per committed change does not record a change that leaves the document identical | history.test.ts            | PASS      | 0.00s |
| 26  | one history entry per committed change records exactly one entry per action type                   | history.test.ts            | PASS      | 0.00s |
| 27  | map file accepts a file that loses nothing                                                         | map-file.test.ts           | PASS      | 0.00s |
| 28  | map file canonicalises a document the way a re-read will see it                                    | map-file.test.ts           | PASS      | 0.00s |
| 29  | map file coerces a broken position and drops an absolute file path                                 | map-file.test.ts           | PASS      | 0.00s |
| 30  | map file creates an empty document with the three collections                                      | map-file.test.ts           | PASS      | 0.00s |
| 31  | map file drops orphaned edges and stops when reading                                               | map-file.test.ts           | PASS      | 0.00s |
| 32  | map file maps an unknown type to Open Question and counts it                                       | map-file.test.ts           | PASS      | 0.00s |
| 33  | map file refuses a file name that escapes the project                                              | map-file.test.ts           | PASS      | 0.00s |
| 34  | map file refuses a file that would lose a waypoint                                                 | map-file.test.ts           | PASS      | 0.00s |
| 35  | map file refuses an unsupported version                                                            | map-file.test.ts           | PASS      | 0.00s |
| 36  | map file refuses to write an invalid document                                                      | map-file.test.ts           | PASS      | 0.00s |
| 37  | map file replaces the file atomically, leaving no temporary behind                                 | map-file.test.ts           | PASS      | 0.00s |
| 38  | map file reports a missing map                                                                     | map-file.test.ts           | PASS      | 0.00s |
| 39  | map file round-trips a document                                                                    | map-file.test.ts           | PASS      | 0.01s |
| 40  | map file serialises deterministically                                                              | map-file.test.ts           | PASS      | 0.00s |
| 41  | map file slugs a display name                                                                      | map-file.test.ts           | PASS      | 0.00s |
| 42  | map file writes sorted collections and keeps stop order                                            | map-file.test.ts           | PASS      | 0.00s |
| 43  | external document drops a selection that no longer exists and clamps the step                      | map-store-external.test.ts | PASS      | 0.00s |
| 44  | external document drops a tour that no longer exists                                               | map-store-external.test.ts | PASS      | 0.00s |
| 45  | external document keeps the selection, the tour and the step that still exist                      | map-store-external.test.ts | PASS      | 0.00s |
| 46  | external document leaves the history it already had alone                                          | map-store-external.test.ts | PASS      | 0.00s |
| 47  | workspace registry clamps an out-of-range step to zero on read                                     | registry.test.ts           | PASS      | 0.00s |
| 48  | workspace registry makes ids unique without clobbering an existing one                             | registry.test.ts           | PASS      | 0.00s |
| 49  | workspace registry recovers from unparseable content without overwriting it                        | registry.test.ts           | PASS      | 0.00s |
| 50  | workspace registry registers a project with a slugged unique id                                    | registry.test.ts           | PASS      | 0.00s |
| 51  | workspace registry returns the existing entry when the same path is registered twice               | registry.test.ts           | PASS      | 0.00s |
| 52  | workspace registry starts empty when there is no file                                              | registry.test.ts           | PASS      | 0.00s |
| 53  | workspace registry stores the last view and drops it with its project                              | registry.test.ts           | PASS      | 0.00s |
| 54  | workspace registry writes atomically and leaves no temporary behind                                | registry.test.ts           | PASS      | 0.00s |
| 55  | isWithinHome accepts an ancestor of home so browsing can reach the root                            | safe-path.test.ts          | PASS      | 0.00s |
| 56  | isWithinHome accepts the home directory and its children                                           | safe-path.test.ts          | PASS      | 0.00s |
| 57  | isWithinHome rejects an unrelated branch                                                           | safe-path.test.ts          | PASS      | 0.00s |
| 58  | resolveInside accepts a plain child                                                                | safe-path.test.ts          | PASS      | 0.00s |
| 59  | resolveInside accepts an absolute path inside the root                                             | safe-path.test.ts          | PASS      | 0.00s |
| 60  | resolveInside accepts the root itself                                                              | safe-path.test.ts          | PASS      | 0.00s |
| 61  | resolveInside does not confuse a sibling with a shared prefix                                      | safe-path.test.ts          | PASS      | 0.00s |
| 62  | resolveInside follows a symlink that leaves the root                                               | safe-path.test.ts          | PASS      | 0.00s |
| 63  | resolveInside rejects an absolute path outside the root                                            | safe-path.test.ts          | PASS      | 0.00s |
| 64  | resolveInside rejects parent traversal                                                             | safe-path.test.ts          | PASS      | 0.00s |
| 65  | resolveInside rejects traversal hidden in the middle                                               | safe-path.test.ts          | PASS      | 0.00s |
| 66  | sync events names every kind once                                                                  | sync-events.test.ts        | PASS      | 0.00s |
| 67  | sync events reads a changed map                                                                    | sync-events.test.ts        | PASS      | 0.00s |
| 68  | sync events reads a changed map list                                                               | sync-events.test.ts        | PASS      | 0.00s |
| 69  | sync events reads an unreadable file and a missing file                                            | sync-events.test.ts        | PASS      | 0.00s |
| 70  | sync events refuses what it cannot understand                                                      | sync-events.test.ts        | PASS      | 0.00s |
| 71  | unreadable and missing files applies the file again once it can be read                            | sync-invalid.test.ts       | PASS      | 0.09s |
| 72  | unreadable and missing files reports a file that is not there when the stream opens                | sync-invalid.test.ts       | PASS      | 0.30s |
| 73  | unreadable and missing files reports a missing file once when it had content before                | sync-invalid.test.ts       | PASS      | 0.38s |
| 74  | unreadable and missing files reports one unreadable state per attempt and never the content        | sync-invalid.test.ts       | PASS      | 0.94s |
| 75  | sync stays on this machine describes events with no field beyond the contract                      | sync-local.test.ts         | PASS      | 0.00s |
| 76  | sync stays on this machine imports nothing that can reach another host                             | sync-local.test.ts         | PASS      | 0.00s |
| 77  | own writes delivers a write that no record covers                                                  | sync-own-write.test.ts     | PASS      | 0.04s |
| 78  | own writes delivers an external change that follows an own write at once                           | sync-own-write.test.ts     | PASS      | 0.30s |
| 79  | own writes records the newest text per file                                                        | sync-own-write.test.ts     | PASS      | 0.00s |
| 80  | comparison fallback delivers a change when the watcher never reports                               | sync-poll.test.ts          | PASS      | 0.17s |
| 81  | comparison fallback delivers one update however many ticks pass                                    | sync-poll.test.ts          | PASS      | 0.46s |
| 82  | comparison fallback does not go back to watching after falling back                                | sync-poll.test.ts          | PASS      | 0.15s |
| 83  | comparison fallback reports a change when the filesystem reports nothing                           | sync-poll.test.ts          | PASS      | 0.17s |
| 84  | comparison fallback settles several changes into the last state                                    | sync-poll.test.ts          | PASS      | 0.35s |
| 85  | comparison fallback stops comparing when the last subscription closes                              | sync-poll.test.ts          | PASS      | 0.25s |
| 86  | sync watcher collapses five changes into one settled update                                        | sync-watch.test.ts         | PASS      | 0.47s |
| 87  | sync watcher delivers a change made to the open map                                                | sync-watch.test.ts         | PASS      | 0.05s |
| 88  | sync watcher does not deliver a write this process made                                            | sync-watch.test.ts         | PASS      | 0.36s |
| 89  | sync watcher does not deliver an own write that normalises differently                             | sync-watch.test.ts         | PASS      | 0.40s |
| 90  | sync watcher keeps one watcher until the last subscription closes                                  | sync-watch.test.ts         | PASS      | 0.35s |
| 91  | sync watcher refuses an unreadable file and reports it once per attempt                            | sync-watch.test.ts         | PASS      | 0.45s |
| 92  | sync watcher reports a delivered file that disappears once                                         | sync-watch.test.ts         | PASS      | 0.40s |
| 93  | sync watcher says nothing when the content is identical                                            | sync-watch.test.ts         | PASS      | 0.60s |
| 94  | design tokens defines the same colour tokens in both themes                                        | theme-contrast.test.ts     | PASS      | 0.00s |
| 95  | design tokens meets 3:1 for interactive borders in dark                                            | theme-contrast.test.ts     | PASS      | 0.00s |
| 96  | design tokens meets 3:1 for interactive borders in light                                           | theme-contrast.test.ts     | PASS      | 0.00s |
| 97  | design tokens meets AA for text pairs in dark                                                      | theme-contrast.test.ts     | PASS      | 0.00s |
| 98  | design tokens meets AA for text pairs in light                                                     | theme-contrast.test.ts     | PASS      | 0.00s |
| 99  | tour validation accepts a name                                                                     | validation.test.ts         | PASS      | 0.00s |
| 100 | tour validation refuses an empty name                                                              | validation.test.ts         | PASS      | 0.00s |
| 101 | waypoint validation accepts a plain label and a relative path                                      | validation.test.ts         | PASS      | 0.00s |
| 102 | waypoint validation checks nothing it was not given                                                | validation.test.ts         | PASS      | 0.00s |
| 103 | waypoint validation refuses an absolute path                                                       | validation.test.ts         | PASS      | 0.00s |
| 104 | waypoint validation refuses an empty label                                                         | validation.test.ts         | PASS      | 0.00s |

### Сводка

| Показатель           | Значение |
| -------------------- | -------- |
| Всего                | 175      |
| PASS                 | 175      |
| FAIL                 | 0        |
| SKIP                 | 0        |
| Время (сумма тестов) | 129.58s  |
| Приёмочные           | 71       |
| Юнит                 | 104      |

### Падения

нет

---

## Прогон: 2026-11-16 11:23 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run --reporter=json`, `npx playwright test` (workers=1, production build через `next build && next start`), `npx tsc --noEmit`, `npx eslint .`, `npx next build`

### Приёмочные тесты (`playwright test`, workers=1)

| #   | Тест                                                                       | Пакет                 | Результат | Время  |
| --- | -------------------------------------------------------------------------- | --------------------- | --------- | ------ |
| 1   | adds and removes a link between two waypoints                              | editing.spec.ts       | PASS      | 2.01s  |
| 2   | creates a tour and deletes it again                                        | editing.spec.ts       | PASS      | 2.41s  |
| 3   | moves a waypoint by dragging it on the map                                 | editing.spec.ts       | PASS      | 2.52s  |
| 4   | refuses an empty label and an absolute path in the editor                  | editing.spec.ts       | PASS      | 3.36s  |
| 5   | replays twenty changes back to the beginning and forward to the end        | editing.spec.ts       | PASS      | 62.38s |
| 6   | says why a save failed and offers one retry                                | editing.spec.ts       | PASS      | 1.13s  |
| 7   | dismisses the tour before the selection                                    | keyboard.spec.ts      | PASS      | 0.32s  |
| 8   | Escape closes the inspector drawer before anything else                    | keyboard.spec.ts      | PASS      | 0.26s  |
| 9   | focuses the map search with a slash                                        | keyboard.spec.ts      | PASS      | 0.25s  |
| 10  | moves between waypoints with the arrow keys                                | keyboard.spec.ts      | PASS      | 0.27s  |
| 11  | reaches every region with the keyboard in the contract order               | keyboard.spec.ts      | PASS      | 0.32s  |
| 12  | shows a visible focus ring on a keyboard-focused control                   | keyboard.spec.ts      | PASS      | 0.20s  |
| 13  | undo inside a text field stays text undo                                   | keyboard.spec.ts      | PASS      | 0.57s  |
| 14  | clamps a stored step that no longer exists                                 | navigation.spec.ts    | PASS      | 0.19s  |
| 15  | drops a stored tour that no longer exists                                  | navigation.spec.ts    | PASS      | 0.37s  |
| 16  | returns to the same project, map, tour and stop three times                | navigation.spec.ts    | PASS      | 0.53s  |
| 17  | pans, zooms, selects and drags inside the interaction budget               | performance.spec.ts   | PASS      | 0.88s  |
| 18  | reports a map larger than the supported size                               | performance.spec.ts   | PASS      | 0.37s  |
| 19  | stays inside the interaction budget on a 250 waypoint map                  | performance.spec.ts   | PASS      | 0.36s  |
| 20  | edits are saved once at the end of a pause                                 | responsive.spec.ts    | PASS      | 3.74s  |
| 21  | gives the space of a collapsed rail back to the canvas                     | responsive.spec.ts    | PASS      | 0.26s  |
| 22  | keeps the rail labels reachable at the medium band                         | responsive.spec.ts    | PASS      | 0.25s  |
| 23  | opens one drawer at a time and returns focus to its opener                 | responsive.spec.ts    | PASS      | 0.37s  |
| 24  | rearranges itself at the wide, medium and narrow bands                     | responsive.spec.ts    | PASS      | 0.69s  |
| 25  | a control that claims to change the map changes it                         | shell.spec.ts         | PASS      | 0.25s  |
| 26  | autosaves a description to the map file                                    | shell.spec.ts         | PASS      | 2.81s  |
| 27  | creates a map and opens it empty                                           | shell.spec.ts         | PASS      | 0.33s  |
| 28  | every visible control has an accessible name                               | shell.spec.ts         | PASS      | 0.19s  |
| 29  | keeps every tour fact in the dock                                          | shell.spec.ts         | PASS      | 0.20s  |
| 30  | keeps the dock usable at 768                                               | shell.spec.ts         | PASS      | 0.20s  |
| 31  | keeps the map visible while editing                                        | shell.spec.ts         | PASS      | 0.24s  |
| 32  | never exposes the same action in two regions                               | shell.spec.ts         | PASS      | 0.20s  |
| 33  | opens a map from the rail                                                  | shell.spec.ts         | PASS      | 0.22s  |
| 34  | rearranges at 360 without horizontal scrolling                             | shell.spec.ts         | PASS      | 0.24s  |
| 35  | resolves surfaces from tokens in the dark theme                            | shell.spec.ts         | PASS      | 0.30s  |
| 36  | restores the tour and step after leaving the map                           | shell.spec.ts         | PASS      | 0.35s  |
| 37  | shows the four regions without overlap                                     | shell.spec.ts         | PASS      | 0.20s  |
| 38  | switches theme and keeps the choice after a reload                         | shell.spec.ts         | PASS      | 0.35s  |
| 39  | undoes and redoes a change                                                 | shell.spec.ts         | PASS      | 1.99s  |
| 40  | a failed load says what failed and offers one retry                        | states.spec.ts        | PASS      | 0.17s  |
| 41  | a project without a map shows one create action                            | states.spec.ts        | PASS      | 0.15s  |
| 42  | an empty workspace adds a project itself                                   | states.spec.ts        | PASS      | 0.34s  |
| 43  | an unavailable project stays listed and can be repointed                   | states.spec.ts        | PASS      | 0.72s  |
| 44  | disables the data actions while a map is loading                           | states.spec.ts        | PASS      | 1.96s  |
| 45  | opens an unreachable project read-only from the last saved copy            | states.spec.ts        | PASS      | 0.38s  |
| 46  | asks once when both sides changed and keeps the typing                     | sync-conflict.spec.ts | PASS      | 0.46s  |
| 47  | shows one notice when a change lands while saving                          | sync-conflict.spec.ts | PASS      | 1.15s  |
| 48  | takes the file version and restarts the history                            | sync-conflict.spec.ts | PASS      | 0.51s  |
| 49  | writes the person version and raises no further notice                     | sync-conflict.spec.ts | PASS      | 2.03s  |
| 50  | applies the file again once it is valid and clears the message             | sync-invalid.spec.ts  | PASS      | 0.40s  |
| 51  | never applies content it cannot read                                       | sync-invalid.spec.ts  | PASS      | 1.42s  |
| 52  | offers to write a deleted map back and never writes nothing                | sync-invalid.spec.ts  | PASS      | 0.27s  |
| 53  | announces an applied change without moving focus                           | sync-outside.spec.ts  | PASS      | 0.40s  |
| 54  | does nothing when the file is rewritten with the same content              | sync-outside.spec.ts  | PASS      | 0.80s  |
| 55  | reconciles once when the page becomes visible again                        | sync-outside.spec.ts  | PASS      | 0.23s  |
| 56  | settles five changes into the last state                                   | sync-outside.spec.ts  | PASS      | 0.23s  |
| 57  | shows an outside change within a second and keeps the person in place      | sync-outside.spec.ts  | PASS      | 0.47s  |
| 58  | keeps twenty undos after twenty saves                                      | sync-own.spec.ts      | PASS      | 2.88s  |
| 59  | shows nothing when the person saves                                        | sync-own.spec.ts      | PASS      | 2.07s  |
| 60  | follows a map added and removed in the folder                              | sync-rail.spec.ts     | PASS      | 0.57s  |
| 61  | keeps the open map open when another map appears                           | sync-rail.spec.ts     | PASS      | 0.40s  |
| 62  | does not follow a map it cannot write and follows it again after relinking | sync-readonly.spec.ts | PASS      | 2.99s  |
| 63  | opens a change stream for the open map                                     | sync.spec.ts          | PASS      | 0.20s  |
| 64  | follows the system theme while it is set to system                         | theme.spec.ts         | PASS      | 0.24s  |
| 65  | keeps a dialog and a tooltip on the dark surface                           | theme.spec.ts         | PASS      | 0.63s  |
| 66  | resolves every surface of the dark theme from tokens                       | theme.spec.ts         | PASS      | 0.40s  |

### Юнит-тесты (`vitest run`)

| #   | Тест                                                                                               | Пакет                      | Результат | Время |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------- | --------- | ----- |
| 1   | map fixture builder builds the requested number of waypoints and tours                             | build-map.test.ts          | PASS      | 0.00s |
| 2   | map fixture builder gives every waypoint a known type and a unique id                              | build-map.test.ts          | PASS      | 0.00s |
| 3   | map fixture builder points every stop at an existing waypoint                                      | build-map.test.ts          | PASS      | 0.00s |
| 4   | map cache lists the cached maps of one project only                                                | cache.test.ts              | PASS      | 0.00s |
| 5   | map cache reads back what was written                                                              | cache.test.ts              | PASS      | 0.01s |
| 6   | map cache returns nothing for a missing or escaping file                                           | cache.test.ts              | PASS      | 0.00s |
| 7   | change summary counts a moved stop as a tour change, not a waypoint change                         | diff.test.ts               | PASS      | 0.00s |
| 8   | change summary counts a moved waypoint as changed                                                  | diff.test.ts               | PASS      | 0.00s |
| 9   | change summary counts added, removed and changed waypoints                                         | diff.test.ts               | PASS      | 0.00s |
| 10  | change summary counts links and their labels                                                       | diff.test.ts               | PASS      | 0.00s |
| 11  | change summary describes what changed for a person                                                 | diff.test.ts               | PASS      | 0.00s |
| 12  | change summary is empty for the same document                                                      | diff.test.ts               | PASS      | 0.00s |
| 13  | change summary names at most three per kind in document order                                      | diff.test.ts               | PASS      | 0.00s |
| 14  | map history caps the history at fifty entries                                                      | history.test.ts            | PASS      | 0.00s |
| 15  | map history discards the forward branch after a new change                                         | history.test.ts            | PASS      | 0.00s |
| 16  | map history ignores a move to where the waypoint already is                                        | history.test.ts            | PASS      | 0.00s |
| 17  | map history moves a stop without losing it                                                         | history.test.ts            | PASS      | 0.00s |
| 18  | map history moves a waypoint and records one entry                                                 | history.test.ts            | PASS      | 0.00s |
| 19  | map history never records selection or status changes                                              | history.test.ts            | PASS      | 0.00s |
| 20  | map history refuses to move a stop beyond the list                                                 | history.test.ts            | PASS      | 0.00s |
| 21  | map history removes a deleted waypoint from edges and tours                                        | history.test.ts            | PASS      | 0.00s |
| 22  | map history replays a twenty-change sequence exactly                                               | history.test.ts            | PASS      | 0.00s |
| 23  | map history starts empty and records nothing on load                                               | history.test.ts            | PASS      | 0.00s |
| 24  | map history steps back and forward through a change                                                | history.test.ts            | PASS      | 0.00s |
| 25  | one history entry per committed change does not record a change that leaves the document identical | history.test.ts            | PASS      | 0.00s |
| 26  | one history entry per committed change records exactly one entry per action type                   | history.test.ts            | PASS      | 0.00s |
| 27  | map file coerces a broken position and drops an absolute file path                                 | map-file.test.ts           | PASS      | 0.00s |
| 28  | map file creates an empty document with the three collections                                      | map-file.test.ts           | PASS      | 0.00s |
| 29  | map file drops orphaned edges and stops when reading                                               | map-file.test.ts           | PASS      | 0.00s |
| 30  | map file maps an unknown type to Open Question and counts it                                       | map-file.test.ts           | PASS      | 0.00s |
| 31  | map file refuses a file name that escapes the project                                              | map-file.test.ts           | PASS      | 0.00s |
| 32  | map file refuses an unsupported version                                                            | map-file.test.ts           | PASS      | 0.00s |
| 33  | map file refuses to write an invalid document                                                      | map-file.test.ts           | PASS      | 0.00s |
| 34  | map file replaces the file atomically, leaving no temporary behind                                 | map-file.test.ts           | PASS      | 0.00s |
| 35  | map file reports a missing map                                                                     | map-file.test.ts           | PASS      | 0.00s |
| 36  | map file round-trips a document                                                                    | map-file.test.ts           | PASS      | 0.02s |
| 37  | map file serialises deterministically                                                              | map-file.test.ts           | PASS      | 0.00s |
| 38  | map file slugs a display name                                                                      | map-file.test.ts           | PASS      | 0.00s |
| 39  | map file writes sorted collections and keeps stop order                                            | map-file.test.ts           | PASS      | 0.00s |
| 40  | external document drops a selection that no longer exists and clamps the step                      | map-store-external.test.ts | PASS      | 0.00s |
| 41  | external document drops a tour that no longer exists                                               | map-store-external.test.ts | PASS      | 0.00s |
| 42  | external document keeps the selection, the tour and the step that still exist                      | map-store-external.test.ts | PASS      | 0.00s |
| 43  | external document leaves the history it already had alone                                          | map-store-external.test.ts | PASS      | 0.00s |
| 44  | workspace registry clamps an out-of-range step to zero on read                                     | registry.test.ts           | PASS      | 0.00s |
| 45  | workspace registry makes ids unique without clobbering an existing one                             | registry.test.ts           | PASS      | 0.00s |
| 46  | workspace registry recovers from unparseable content without overwriting it                        | registry.test.ts           | PASS      | 0.00s |
| 47  | workspace registry registers a project with a slugged unique id                                    | registry.test.ts           | PASS      | 0.00s |
| 48  | workspace registry returns the existing entry when the same path is registered twice               | registry.test.ts           | PASS      | 0.00s |
| 49  | workspace registry starts empty when there is no file                                              | registry.test.ts           | PASS      | 0.00s |
| 50  | workspace registry stores the last view and drops it with its project                              | registry.test.ts           | PASS      | 0.00s |
| 51  | workspace registry writes atomically and leaves no temporary behind                                | registry.test.ts           | PASS      | 0.00s |
| 52  | isWithinHome accepts an ancestor of home so browsing can reach the root                            | safe-path.test.ts          | PASS      | 0.00s |
| 53  | isWithinHome accepts the home directory and its children                                           | safe-path.test.ts          | PASS      | 0.00s |
| 54  | isWithinHome rejects an unrelated branch                                                           | safe-path.test.ts          | PASS      | 0.00s |
| 55  | resolveInside accepts a plain child                                                                | safe-path.test.ts          | PASS      | 0.00s |
| 56  | resolveInside accepts an absolute path inside the root                                             | safe-path.test.ts          | PASS      | 0.00s |
| 57  | resolveInside accepts the root itself                                                              | safe-path.test.ts          | PASS      | 0.00s |
| 58  | resolveInside does not confuse a sibling with a shared prefix                                      | safe-path.test.ts          | PASS      | 0.00s |
| 59  | resolveInside follows a symlink that leaves the root                                               | safe-path.test.ts          | PASS      | 0.00s |
| 60  | resolveInside rejects an absolute path outside the root                                            | safe-path.test.ts          | PASS      | 0.00s |
| 61  | resolveInside rejects parent traversal                                                             | safe-path.test.ts          | PASS      | 0.00s |
| 62  | resolveInside rejects traversal hidden in the middle                                               | safe-path.test.ts          | PASS      | 0.00s |
| 63  | sync events names every kind once                                                                  | sync-events.test.ts        | PASS      | 0.00s |
| 64  | sync events reads a changed map                                                                    | sync-events.test.ts        | PASS      | 0.00s |
| 65  | sync events reads a changed map list                                                               | sync-events.test.ts        | PASS      | 0.00s |
| 66  | sync events reads an unreadable file and a missing file                                            | sync-events.test.ts        | PASS      | 0.00s |
| 67  | sync events refuses what it cannot understand                                                      | sync-events.test.ts        | PASS      | 0.00s |
| 68  | unreadable and missing files applies the file again once it can be read                            | sync-invalid.test.ts       | PASS      | 0.09s |
| 69  | unreadable and missing files reports a file that is not there when the stream opens                | sync-invalid.test.ts       | PASS      | 0.30s |
| 70  | unreadable and missing files reports a missing file once when it had content before                | sync-invalid.test.ts       | PASS      | 0.39s |
| 71  | unreadable and missing files reports one unreadable state per attempt and never the content        | sync-invalid.test.ts       | PASS      | 0.95s |
| 72  | sync stays on this machine describes events with no field beyond the contract                      | sync-local.test.ts         | PASS      | 0.00s |
| 73  | sync stays on this machine imports nothing that can reach another host                             | sync-local.test.ts         | PASS      | 0.00s |
| 74  | own writes delivers a write that no record covers                                                  | sync-own-write.test.ts     | PASS      | 0.04s |
| 75  | own writes delivers an external change that follows an own write at once                           | sync-own-write.test.ts     | PASS      | 0.30s |
| 76  | own writes records the newest text per file                                                        | sync-own-write.test.ts     | PASS      | 0.01s |
| 77  | comparison fallback delivers one update however many ticks pass                                    | sync-poll.test.ts          | PASS      | 0.45s |
| 78  | comparison fallback does not go back to watching after falling back                                | sync-poll.test.ts          | PASS      | 0.16s |
| 79  | comparison fallback reports a change when the filesystem reports nothing                           | sync-poll.test.ts          | PASS      | 0.17s |
| 80  | comparison fallback settles several changes into the last state                                    | sync-poll.test.ts          | PASS      | 0.36s |
| 81  | comparison fallback stops comparing when the last subscription closes                              | sync-poll.test.ts          | PASS      | 0.25s |
| 82  | sync watcher collapses five changes into one settled update                                        | sync-watch.test.ts         | PASS      | 0.46s |
| 83  | sync watcher delivers a change made to the open map                                                | sync-watch.test.ts         | PASS      | 0.05s |
| 84  | sync watcher does not deliver a write this process made                                            | sync-watch.test.ts         | PASS      | 0.35s |
| 85  | sync watcher keeps one watcher until the last subscription closes                                  | sync-watch.test.ts         | PASS      | 0.35s |
| 86  | sync watcher refuses an unreadable file and reports it once per attempt                            | sync-watch.test.ts         | PASS      | 0.45s |
| 87  | sync watcher reports a delivered file that disappears once                                         | sync-watch.test.ts         | PASS      | 0.41s |
| 88  | sync watcher says nothing when the content is identical                                            | sync-watch.test.ts         | PASS      | 0.60s |
| 89  | design tokens defines the same colour tokens in both themes                                        | theme-contrast.test.ts     | PASS      | 0.00s |
| 90  | design tokens meets 3:1 for interactive borders in dark                                            | theme-contrast.test.ts     | PASS      | 0.00s |
| 91  | design tokens meets 3:1 for interactive borders in light                                           | theme-contrast.test.ts     | PASS      | 0.00s |
| 92  | design tokens meets AA for text pairs in dark                                                      | theme-contrast.test.ts     | PASS      | 0.00s |
| 93  | design tokens meets AA for text pairs in light                                                     | theme-contrast.test.ts     | PASS      | 0.00s |
| 94  | tour validation accepts a name                                                                     | validation.test.ts         | PASS      | 0.00s |
| 95  | tour validation refuses an empty name                                                              | validation.test.ts         | PASS      | 0.00s |
| 96  | waypoint validation accepts a plain label and a relative path                                      | validation.test.ts         | PASS      | 0.00s |
| 97  | waypoint validation checks nothing it was not given                                                | validation.test.ts         | PASS      | 0.00s |
| 98  | waypoint validation refuses an absolute path                                                       | validation.test.ts         | PASS      | 0.00s |
| 99  | waypoint validation refuses an empty label                                                         | validation.test.ts         | PASS      | 0.00s |

### Сводка

| Показатель           | Значение |
| -------------------- | -------- |
| Всего                | 165      |
| PASS                 | 165      |
| FAIL                 | 0        |
| SKIP                 | 0        |
| Время (сумма тестов) | 120.82s  |
| Приёмочные           | 66       |
| Юнит                 | 99       |

### Падения

нет

---

## Прогон: 2026-11-16 09:17 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run`, `npx playwright test` (workers=1, production build через `next build && next start`), `npx tsc --noEmit`, `npx eslint .`

### Приёмочные тесты (`playwright test`, workers=1)

| #   | Тест                                                                | Пакет               | Результат | Время  |
| --- | ------------------------------------------------------------------- | ------------------- | --------- | ------ |
| 1   | adds and removes a link between two waypoints                       | editing.spec.ts     | PASS      | 2.49s  |
| 2   | creates a tour and deletes it again                                 | editing.spec.ts     | PASS      | 1.89s  |
| 3   | moves a waypoint by dragging it on the map                          | editing.spec.ts     | PASS      | 3.02s  |
| 4   | refuses an empty label and an absolute path in the editor           | editing.spec.ts     | PASS      | 3.37s  |
| 5   | replays twenty changes back to the beginning and forward to the end | editing.spec.ts     | PASS      | 63.96s |
| 6   | says why a save failed and offers one retry                         | editing.spec.ts     | PASS      | 1.11s  |
| 7   | dismisses the tour before the selection                             | keyboard.spec.ts    | PASS      | 0.30s  |
| 8   | Escape closes the inspector drawer before anything else             | keyboard.spec.ts    | PASS      | 0.25s  |
| 9   | focuses the map search with a slash                                 | keyboard.spec.ts    | PASS      | 0.22s  |
| 10  | moves between waypoints with the arrow keys                         | keyboard.spec.ts    | PASS      | 0.26s  |
| 11  | reaches every region with the keyboard in the contract order        | keyboard.spec.ts    | PASS      | 0.35s  |
| 12  | shows a visible focus ring on a keyboard-focused control            | keyboard.spec.ts    | PASS      | 0.20s  |
| 13  | undo inside a text field stays text undo                            | keyboard.spec.ts    | PASS      | 0.53s  |
| 14  | clamps a stored step that no longer exists                          | navigation.spec.ts  | PASS      | 0.17s  |
| 15  | drops a stored tour that no longer exists                           | navigation.spec.ts  | PASS      | 0.36s  |
| 16  | returns to the same project, map, tour and stop three times         | navigation.spec.ts  | PASS      | 0.49s  |
| 17  | pans, zooms, selects and drags inside the interaction budget        | performance.spec.ts | PASS      | 0.83s  |
| 18  | reports a map larger than the supported size                        | performance.spec.ts | PASS      | 0.32s  |
| 19  | stays inside the interaction budget on a 250 waypoint map           | performance.spec.ts | PASS      | 0.34s  |
| 20  | edits are saved once at the end of a pause                          | responsive.spec.ts  | PASS      | 3.76s  |
| 21  | gives the space of a collapsed rail back to the canvas              | responsive.spec.ts  | PASS      | 0.24s  |
| 22  | keeps the rail labels reachable at the medium band                  | responsive.spec.ts  | PASS      | 0.26s  |
| 23  | opens one drawer at a time and returns focus to its opener          | responsive.spec.ts  | PASS      | 0.33s  |
| 24  | rearranges itself at the wide, medium and narrow bands              | responsive.spec.ts  | PASS      | 0.65s  |
| 25  | a control that claims to change the map changes it                  | shell.spec.ts       | PASS      | 0.22s  |
| 26  | autosaves a description to the map file                             | shell.spec.ts       | PASS      | 2.79s  |
| 27  | creates a map and opens it empty                                    | shell.spec.ts       | PASS      | 0.34s  |
| 28  | every visible control has an accessible name                        | shell.spec.ts       | PASS      | 0.20s  |
| 29  | keeps every tour fact in the dock                                   | shell.spec.ts       | PASS      | 0.18s  |
| 30  | keeps the dock usable at 768                                        | shell.spec.ts       | PASS      | 0.17s  |
| 31  | keeps the map visible while editing                                 | shell.spec.ts       | PASS      | 0.22s  |
| 32  | never exposes the same action in two regions                        | shell.spec.ts       | PASS      | 0.19s  |
| 33  | opens a map from the rail                                           | shell.spec.ts       | PASS      | 0.22s  |
| 34  | rearranges at 360 without horizontal scrolling                      | shell.spec.ts       | PASS      | 0.23s  |
| 35  | resolves surfaces from tokens in the dark theme                     | shell.spec.ts       | PASS      | 0.29s  |
| 36  | restores the tour and step after leaving the map                    | shell.spec.ts       | PASS      | 0.34s  |
| 37  | shows the four regions without overlap                              | shell.spec.ts       | PASS      | 0.19s  |
| 38  | switches theme and keeps the choice after a reload                  | shell.spec.ts       | PASS      | 0.35s  |
| 39  | undoes and redoes a change                                          | shell.spec.ts       | PASS      | 1.99s  |
| 40  | a failed load says what failed and offers one retry                 | states.spec.ts      | PASS      | 0.16s  |
| 41  | a project without a map shows one create action                     | states.spec.ts      | PASS      | 0.16s  |
| 42  | an empty workspace adds a project itself                            | states.spec.ts      | PASS      | 0.33s  |
| 43  | an unavailable project stays listed and can be repointed            | states.spec.ts      | PASS      | 0.74s  |
| 44  | disables the data actions while a map is loading                    | states.spec.ts      | PASS      | 1.96s  |
| 45  | opens an unreachable project read-only from the last saved copy     | states.spec.ts      | PASS      | 0.38s  |
| 46  | follows the system theme while it is set to system                  | theme.spec.ts       | PASS      | 0.26s  |
| 47  | keeps a dialog and a tooltip on the dark surface                    | theme.spec.ts       | PASS      | 0.63s  |
| 48  | resolves every surface of the dark theme from tokens                | theme.spec.ts       | PASS      | 0.38s  |

### Юнит-тесты (`vitest run`)

| #   | Тест                                                              | Пакет                  | Результат | Время |
| --- | ----------------------------------------------------------------- | ---------------------- | --------- | ----- |
| 1   | builds the requested number of waypoints and tours                | build-map.test.ts      | PASS      | 0.00s |
| 2   | gives every waypoint a known type and a unique id                 | build-map.test.ts      | PASS      | 0.00s |
| 3   | points every stop at an existing waypoint                         | build-map.test.ts      | PASS      | 0.00s |
| 4   | lists the cached maps of one project only                         | cache.test.ts          | PASS      | 0.00s |
| 5   | reads back what was written                                       | cache.test.ts          | PASS      | 0.00s |
| 6   | returns nothing for a missing or escaping file                    | cache.test.ts          | PASS      | 0.00s |
| 7   | caps the history at fifty entries                                 | history.test.ts        | PASS      | 0.00s |
| 8   | discards the forward branch after a new change                    | history.test.ts        | PASS      | 0.00s |
| 9   | does not record a change that leaves the document identical       | history.test.ts        | PASS      | 0.00s |
| 10  | ignores a move to where the waypoint already is                   | history.test.ts        | PASS      | 0.00s |
| 11  | moves a stop without losing it                                    | history.test.ts        | PASS      | 0.00s |
| 12  | moves a waypoint and records one entry                            | history.test.ts        | PASS      | 0.00s |
| 13  | never records selection or status changes                         | history.test.ts        | PASS      | 0.00s |
| 14  | records exactly one entry per action type                         | history.test.ts        | PASS      | 0.00s |
| 15  | refuses to move a stop beyond the list                            | history.test.ts        | PASS      | 0.00s |
| 16  | removes a deleted waypoint from edges and tours                   | history.test.ts        | PASS      | 0.00s |
| 17  | replays a twenty-change sequence exactly                          | history.test.ts        | PASS      | 0.00s |
| 18  | starts empty and records nothing on load                          | history.test.ts        | PASS      | 0.00s |
| 19  | steps back and forward through a change                           | history.test.ts        | PASS      | 0.00s |
| 20  | coerces a broken position and drops an absolute file path         | map-file.test.ts       | PASS      | 0.00s |
| 21  | creates an empty document with the three collections              | map-file.test.ts       | PASS      | 0.00s |
| 22  | drops orphaned edges and stops when reading                       | map-file.test.ts       | PASS      | 0.00s |
| 23  | maps an unknown type to Open Question and counts it               | map-file.test.ts       | PASS      | 0.00s |
| 24  | refuses a file name that escapes the project                      | map-file.test.ts       | PASS      | 0.00s |
| 25  | refuses an unsupported version                                    | map-file.test.ts       | PASS      | 0.00s |
| 26  | refuses to write an invalid document                              | map-file.test.ts       | PASS      | 0.00s |
| 27  | replaces the file atomically, leaving no temporary behind         | map-file.test.ts       | PASS      | 0.00s |
| 28  | reports a missing map                                             | map-file.test.ts       | PASS      | 0.00s |
| 29  | round-trips a document                                            | map-file.test.ts       | PASS      | 0.01s |
| 30  | serialises deterministically                                      | map-file.test.ts       | PASS      | 0.00s |
| 31  | slugs a display name                                              | map-file.test.ts       | PASS      | 0.00s |
| 32  | writes sorted collections and keeps stop order                    | map-file.test.ts       | PASS      | 0.00s |
| 33  | clamps an out-of-range step to zero on read                       | registry.test.ts       | PASS      | 0.00s |
| 34  | makes ids unique without clobbering an existing one               | registry.test.ts       | PASS      | 0.00s |
| 35  | recovers from unparseable content without overwriting it          | registry.test.ts       | PASS      | 0.00s |
| 36  | registers a project with a slugged unique id                      | registry.test.ts       | PASS      | 0.00s |
| 37  | returns the existing entry when the same path is registered twice | registry.test.ts       | PASS      | 0.00s |
| 38  | starts empty when there is no file                                | registry.test.ts       | PASS      | 0.00s |
| 39  | stores the last view and drops it with its project                | registry.test.ts       | PASS      | 0.00s |
| 40  | writes atomically and leaves no temporary behind                  | registry.test.ts       | PASS      | 0.00s |
| 41  | accepts a plain child                                             | safe-path.test.ts      | PASS      | 0.00s |
| 42  | accepts an absolute path inside the root                          | safe-path.test.ts      | PASS      | 0.00s |
| 43  | accepts an ancestor of home so browsing can reach the root        | safe-path.test.ts      | PASS      | 0.00s |
| 44  | accepts the home directory and its children                       | safe-path.test.ts      | PASS      | 0.00s |
| 45  | accepts the root itself                                           | safe-path.test.ts      | PASS      | 0.00s |
| 46  | does not confuse a sibling with a shared prefix                   | safe-path.test.ts      | PASS      | 0.00s |
| 47  | follows a symlink that leaves the root                            | safe-path.test.ts      | PASS      | 0.00s |
| 48  | rejects an absolute path outside the root                         | safe-path.test.ts      | PASS      | 0.00s |
| 49  | rejects an unrelated branch                                       | safe-path.test.ts      | PASS      | 0.00s |
| 50  | rejects parent traversal                                          | safe-path.test.ts      | PASS      | 0.00s |
| 51  | rejects traversal hidden in the middle                            | safe-path.test.ts      | PASS      | 0.00s |
| 52  | defines the same colour tokens in both themes                     | theme-contrast.test.ts | PASS      | 0.00s |
| 53  | meets 3:1 for interactive borders in dark                         | theme-contrast.test.ts | PASS      | 0.00s |
| 54  | meets 3:1 for interactive borders in light                        | theme-contrast.test.ts | PASS      | 0.00s |
| 55  | meets AA for text pairs in dark                                   | theme-contrast.test.ts | PASS      | 0.00s |
| 56  | meets AA for text pairs in light                                  | theme-contrast.test.ts | PASS      | 0.00s |
| 57  | accepts a name                                                    | validation.test.ts     | PASS      | 0.00s |
| 58  | accepts a plain label and a relative path                         | validation.test.ts     | PASS      | 0.00s |
| 59  | checks nothing it was not given                                   | validation.test.ts     | PASS      | 0.00s |
| 60  | refuses an absolute path                                          | validation.test.ts     | PASS      | 0.00s |
| 61  | refuses an empty label                                            | validation.test.ts     | PASS      | 0.00s |
| 62  | refuses an empty name                                             | validation.test.ts     | PASS      | 0.00s |

### Статические проверки

| Проверка       | Результат |
| -------------- | --------- |
| `tsc --noEmit` | PASS      |
| `eslint .`     | PASS      |
| `next build`   | PASS      |

### Сводка

Всего: 110 тестов (48 приёмочных, 62 юнит) · PASS: 110 · FAIL: 0 · SKIP: 0 · время: 98.7s приёмочные + 0.1s юнит.

### Падения

нет

---

## Прогон: 2026-11-16 08:13 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run`, `npx playwright test` (workers=1), `npx tsc --noEmit`, `npx eslint .`, `npx next build`

### Приёмочные тесты (`playwright test`, workers=1)

| #   | Тест                                                       | Пакет               | Результат | Время |
| --- | ---------------------------------------------------------- | ------------------- | --------- | ----- |
| 1   | reaches every region with the keyboard and shows focus     | keyboard.spec.ts    | PASS      | 1.49s |
| 2   | shows a visible focus ring on a keyboard-focused control   | keyboard.spec.ts    | PASS      | 0.46s |
| 3   | Escape closes the inspector drawer before anything else    | keyboard.spec.ts    | PASS      | 0.60s |
| 4   | undo inside a text field stays text undo                   | keyboard.spec.ts    | PASS      | 0.89s |
| 5   | stays inside the interaction budget on a 250 waypoint map  | performance.spec.ts | PASS      | 0.78s |
| 6   | reports a map larger than the supported size               | performance.spec.ts | PASS      | 0.69s |
| 7   | keeps every region inside the window at each width         | responsive.spec.ts  | PASS      | 1.28s |
| 8   | opens one drawer at a time and returns focus to its opener | responsive.spec.ts  | PASS      | 0.63s |
| 9   | keeps the canvas at least 320 wide                         | responsive.spec.ts  | PASS      | 0.44s |
| 10  | edits are saved once at the end of a pause                 | responsive.spec.ts  | PASS      | 3.16s |
| 11  | shows the four regions without overlap                     | shell.spec.ts       | PASS      | 0.46s |
| 12  | keeps every tour fact in the dock                          | shell.spec.ts       | PASS      | 0.46s |
| 13  | every visible control has an accessible name               | shell.spec.ts       | PASS      | 0.44s |
| 14  | switches theme and keeps the choice after a reload         | shell.spec.ts       | PASS      | 0.71s |
| 15  | resolves surfaces from tokens in the dark theme            | shell.spec.ts       | PASS      | 0.55s |
| 16  | restores the tour and step after leaving the map           | shell.spec.ts       | PASS      | 0.90s |
| 17  | opens a map from the rail                                  | shell.spec.ts       | PASS      | 0.48s |
| 18  | creates a map and opens it empty                           | shell.spec.ts       | PASS      | 1.19s |
| 19  | autosaves a description to the map file                    | shell.spec.ts       | PASS      | 3.10s |
| 20  | undoes and redoes a change                                 | shell.spec.ts       | PASS      | 2.37s |
| 21  | keeps the map visible while editing                        | shell.spec.ts       | PASS      | 0.53s |
| 22  | rearranges at 360 without horizontal scrolling             | shell.spec.ts       | PASS      | 0.53s |
| 23  | keeps the dock usable at 768                               | shell.spec.ts       | PASS      | 0.45s |
| 24  | an empty workspace adds a project itself                   | states.spec.ts      | PASS      | 1.14s |
| 25  | a failed load says what failed and offers one retry        | states.spec.ts      | PASS      | 0.43s |
| 26  | an unavailable project stays listed and can be repointed   | states.spec.ts      | PASS      | 1.92s |

### Юнит-тесты (`vitest run`)

| #   | Тест                    | Пакет                                 | Результат | Время  |
| --- | ----------------------- | ------------------------------------- | --------- | ------ |
| 1   | theme contrast (5)      | tests/unit/theme-contrast.test.ts     | PASS      | 0.54s¹ |
| 2   | safe path (10)          | tests/unit/safe-path.test.ts          | PASS      | 0.54s¹ |
| 3   | map file (13)           | tests/unit/map-file.test.ts           | PASS      | 0.54s¹ |
| 4   | registry (8)            | tests/unit/registry.test.ts           | PASS      | 0.54s¹ |
| 5   | history (11)            | tests/unit/history.test.ts            | PASS      | 0.54s¹ |
| 6   | map fixture builder (3) | tests/unit/fixtures/build-map.test.ts | PASS      | 0.54s¹ |

¹ Vitest печатает только суммарное время прогона (541 ms на 6 файлов).

### Статические проверки

| #   | Проверка       | Пакет        | Результат | Время |
| --- | -------------- | ------------ | --------- | ----- |
| 1   | `tsc --noEmit` | app/         | PASS      | 3.0s  |
| 2   | `eslint .`     | app/, tests/ | PASS      | 8.0s  |
| 3   | `next build`   | app/         | PASS      | 9.0s  |

### Сводка

Всего: **80** · PASS: **80** · FAIL: **0** · SKIP: **0** · время: юнит 0.54s, e2e 26.1s, статические 20s.

### Падения

нет

---

## Прогон: 2026-11-16 08:00 MSK (+0300)

**Ветка:** `main` · **Go/Node:** Node v22.22.3 · **Команды:** `npx vitest run`, `npx playwright test --workers=1`, `npx tsc --noEmit`, `npx eslint .`, `npx next build`

### Юнит-тесты (`vitest run`)

| #   | Тест                                                              | Пакет                             | Результат | Время  |
| --- | ----------------------------------------------------------------- | --------------------------------- | --------- | ------ |
| 1   | defines the same colour tokens in both themes                     | tests/unit/theme-contrast.test.ts | PASS      | 0.56s* |
| 2   | meets AA for text pairs in light                                  | tests/unit/theme-contrast.test.ts | PASS      | 0.56s* |
| 3   | meets 3:1 for interactive borders in light                        | tests/unit/theme-contrast.test.ts | PASS      | 0.56s* |
| 4   | meets AA for text pairs in dark                                   | tests/unit/theme-contrast.test.ts | PASS      | 0.56s* |
| 5   | meets 3:1 for interactive borders in dark                         | tests/unit/theme-contrast.test.ts | PASS      | 0.56s* |
| 6   | accepts a plain child                                             | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 7   | accepts the root itself                                           | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 8   | rejects parent traversal                                          | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 9   | rejects traversal hidden in the middle                            | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 10  | rejects an absolute path outside the root                         | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 11  | accepts an absolute path inside the root                          | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 12  | does not confuse a sibling with a shared prefix                   | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 13  | follows a symlink that leaves the root                            | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 14  | accepts the home directory and its children                       | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 15  | accepts an ancestor of home so browsing can reach the root        | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 16  | rejects an unrelated branch                                       | tests/unit/safe-path.test.ts      | PASS      | 0.56s* |
| 17  | slugs a display name                                              | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 18  | round-trips a document                                            | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 19  | writes sorted collections and keeps stop order                    | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 20  | serialises deterministically                                      | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 21  | drops orphaned edges and stops when reading                       | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 22  | maps an unknown type to Open Question and counts it               | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 23  | coerces a broken position and drops an absolute file path         | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 24  | refuses an unsupported version                                    | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 25  | refuses a file name that escapes the project                      | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 26  | reports a missing map                                             | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 27  | creates an empty document with the three collections              | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 28  | refuses to write an invalid document                              | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 29  | replaces the file atomically, leaving no temporary behind         | tests/unit/map-file.test.ts       | PASS      | 0.56s* |
| 30  | starts empty when there is no file                                | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 31  | registers a project with a slugged unique id                      | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 32  | returns the existing entry when the same path is registered twice | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 33  | stores the last view and drops it with its project                | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 34  | recovers from unparseable content without overwriting it          | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 35  | writes atomically and leaves no temporary behind                  | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 36  | clamps an out-of-range step to zero on read                       | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 37  | makes ids unique without clobbering an existing one               | tests/unit/registry.test.ts       | PASS      | 0.56s* |
| 38  | starts empty and records nothing on load                          | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 39  | steps back and forward through a change                           | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 40  | replays a twenty-change sequence exactly                          | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 41  | discards the forward branch after a new change                    | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 42  | never records selection or status changes                         | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 43  | caps the history at fifty entries                                 | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 44  | removes a deleted waypoint from edges and tours                   | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 45  | moves a stop without losing it                                    | tests/unit/history.test.ts        | PASS      | 0.56s* |
| 46  | refuses to move a stop beyond the list                            | tests/unit/history.test.ts        | PASS      | 0.56s* |

\* Vitest в этом прогоне не печатал время по отдельным тестам; указана длительность всего прогона файла-набора (561 ms суммарно).

### Приёмочные тесты (`playwright test --workers=1`)

| #   | Тест                                                   | Пакет                          | Результат | Время |
| --- | ------------------------------------------------------ | ------------------------------ | --------- | ----- |
| 1   | US1 shows the four regions without overlap             | tests/acceptance/shell.spec.ts | PASS      | 1.40s |
| 2   | US1 keeps every tour fact in the dock                  | tests/acceptance/shell.spec.ts | PASS      | 0.47s |
| 3   | US1 every visible control has an accessible name       | tests/acceptance/shell.spec.ts | PASS      | 0.46s |
| 4   | US2 switches theme and keeps the choice after a reload | tests/acceptance/shell.spec.ts | PASS      | 0.72s |
| 5   | US2 resolves surfaces from tokens in the dark theme    | tests/acceptance/shell.spec.ts | PASS      | 0.59s |
| 6   | US3 restores the tour and step after leaving the map   | tests/acceptance/shell.spec.ts | PASS      | 1.20s |
| 7   | US3 opens a map from the rail                          | tests/acceptance/shell.spec.ts | PASS      | 0.51s |
| 8   | US5 creates a map and opens it empty                   | tests/acceptance/shell.spec.ts | PASS      | 1.20s |
| 9   | US6 autosaves a description to the map file            | tests/acceptance/shell.spec.ts | PASS      | 3.10s |
| 10  | US6 undoes and redoes a change                         | tests/acceptance/shell.spec.ts | PASS      | 2.40s |
| 11  | US6 keeps the map visible while editing                | tests/acceptance/shell.spec.ts | PASS      | 0.50s |
| 12  | US4 rearranges at 360 without horizontal scrolling     | tests/acceptance/shell.spec.ts | PASS      | 0.51s |
| 13  | US4 keeps the dock usable at 768                       | tests/acceptance/shell.spec.ts | PASS      | 0.44s |

### Статические проверки

| #   | Проверка       | Пакет        | Результат | Время |
| --- | -------------- | ------------ | --------- | ----- |
| 1   | `tsc --noEmit` | app/         | PASS      | 3.0s  |
| 2   | `eslint .`     | app/, tests/ | PASS      | 8.0s  |
| 3   | `next build`   | app/         | PASS      | 9.0s  |

### Сводка

Всего: **62** · PASS: **62** · FAIL: **0** · SKIP: **0** · время: юнит 0.56s, e2e 15.1s, статические 20s.

### Падения

нет

---

## Прогон: 2026-11-16 07:36 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команда:** `npx vitest run`

| #   | Тест               | Пакет                             | Результат | Время |
| --- | ------------------ | --------------------------------- | --------- | ----- |
| 1   | theme contrast (5) | tests/unit/theme-contrast.test.ts | PASS      | 0.56s |
| 2   | map file (13)      | tests/unit/map-file.test.ts       | FAIL      | 0.02s |
| 3   | registry (8)       | tests/unit/registry.test.ts       | PASS      | 0.56s |
| 4   | safe path (10)     | tests/unit/safe-path.test.ts      | PASS      | 0.56s |

### Сводка

Всего: 4 файла / 37 тестов · PASS: 36 · FAIL: 1 · SKIP: 0 · время: 0.54s.

### Падения

| Тест                                           | Причина                                                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| writes sorted collections and keeps stop order | Проверка позиции `"w-b"` в сериализованном тексте сравнивала весь документ, а не массив `stops`; порядок стопов проверялся не там. Исправлено повторным чтением документа. |
