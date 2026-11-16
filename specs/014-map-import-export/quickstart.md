# Quickstart — Maps in and out

Sixteen runnable scenarios that prove the feature end to end. Each names the
requirements it covers, the commands to run, and what must be true afterwards.
Tests automate most of them; the ones marked **by hand** are the checks a
browser is needed for.

---

## Prerequisites

```bash
npm install
npm run build:all          # web + cli, so dist/cli.mjs matches the source
export CTOUR_HOME="$PWD/.tmp/qs-home"        # never touch the real workspace
mkdir -p "$CTOUR_HOME" "$PWD/.tmp/qs-repo"   # a folder to work in
```

Temporary paths in this guide all live under `.tmp/`, which is ignored by git.

---

## 1. Save a copy of a map — FR-001, FR-004, FR-006, SC-002

```bash
cd .tmp/qs-repo && git init -q . && node ../../dist/cli.mjs init
```

Open the address the command prints, then **by hand**:

1. Click **Save a copy** in the map's action bar.
2. Choose `.tmp/qs-copies` (create it first: `mkdir -p .tmp/qs-copies`).
3. Read the announcement: `Saved main.tour.json to …/qs-copies`.

```bash
cmp .tmp/qs-repo/.ctour/main.tour.json .tmp/qs-copies/main.tour.json && echo identical
```

`identical` proves the copy is a byte copy of what the project holds, and that
the source was not reformatted (D7).

## 2. A copy carries an unsaved edit — FR-002, SC-002

**By hand**: select the seeded waypoint, type `Carries an edit` into Notes, and
click **Save a copy** without waiting for the save indicator.

```bash
grep -c 'Carries an edit' .tmp/qs-copies/main.tour.json   # 1
```

The copy contains the text because the export flushes the pending save first.

## 3. A copy of a last known version — FR-005

```bash
mv .tmp/qs-repo .tmp/qs-repo-away
```

Reload the interface. The map is shown read-only from the cache. **By hand**:
click **Save a copy** and choose `.tmp/qs-copies`.

The announcement reads `… (last known version)`, and the file matches the cached
copy. Restore the folder afterwards:

```bash
mv .tmp/qs-repo-away .tmp/qs-repo
```

## 4. The destination already holds the name — D8

Repeat scenario 1 into the same folder.

The written file is `main-2.tour.json`, `main.tour.json` in that folder is
unchanged, and the dialog reported the name it used.

## 5. Bring a file into a project — FR-007 … FR-010, FR-014 … FR-016, FR-017

```bash
cp .tmp/qs-copies/main.tour.json ".tmp/Q3 Roadmap.tour.json"
```

**By hand**: in the rail, click **Bring in maps** on the project, choose
`.tmp/Q3 Roadmap.tour.json`.

The preview says `q3-roadmap`, `1 waypoint, 0 links, 0 tours`. Confirm, then:

```bash
ls .tmp/qs-repo/.ctour        # main.tour.json, q3-roadmap.tour.json
```

The rail lists `q3-roadmap` and the map is open, without a page reload.

## 6. A taken name gets a suffix — FR-009, SC-004

Copy `main.tour.json` to `.tmp/main.tour.json` and bring it in.

The preview names it `main-2` and says why. Afterwards:

```bash
cmp .tmp/qs-repo/.ctour/main.tour.json .tmp/qs-copies/main.tour.json && echo untouched
```

## 7. A file with content that cannot be represented — FR-013, SC-003

```bash
node -e '
const fs = require("fs");
const map = JSON.parse(fs.readFileSync(".tmp/qs-copies/main.tour.json", "utf8"));
map.waypoints.push({ id: "w-x1", label: "Mystery", type: "Nonsense", position: { x: 10, y: 10 } });
map.waypoints.push({ id: "w-x2", label: "Mystery two", type: "Nonsense", position: { x: 30, y: 30 } });
fs.writeFileSync(".tmp/lossy.tour.json", JSON.stringify(map, null, 2));
'
```

Bring in `.tmp/lossy.tour.json`.

The preview says `2 waypoints cannot be represented`; the confirm button is
disabled until the sentence is acknowledged; after confirming, the imported map
holds one waypoint fewer than the source's waypoint count — exactly two fewer.

## 8. Refusals write nothing — FR-011, FR-012, FR-027, SC-005

```bash
printf 'not a map' > .tmp/broken.json
sha256sum .tmp/qs-repo/.ctour/*.json > .tmp/before.txt
```

**By hand**: try to bring in `.tmp/broken.json`; try a map into a project whose
folder has been moved away; try to export to `/etc` (not offered by the browser).

```bash
sha256sum .tmp/qs-repo/.ctour/*.json | diff - .tmp/before.txt && echo unchanged
```

Every attempt produced one sentence naming the file, and the folder digest is
identical.

## 9. A folder of maps — FR-024, FR-025, FR-026, SC-001, SC-002

```bash
mkdir -p .tmp/qs-set
node ../../dist/cli.mjs serve            # interface only, no new map
```

**By hand**: click **Export all maps** on the project's map, choose `.tmp/qs-set`;
then create a second project, and **Bring in maps** choosing `.tmp/qs-set` after
adding one file that is not a map.

The export writes one file per map. The import adds the maps, names the file it
skipped, and the project holds as many maps as the source folder had minus the
skipped one.

## 10. The performance promise — SC-001

```bash
node -e '
const fs = require("fs");
const waypoints = Array.from({ length: 250 }, (_, i) => ({ id: `w-${i + 1}`, label: `Waypoint ${i + 1}`, type: "Feature", position: { x: (i % 20) * 260, y: Math.floor(i / 20) * 180 } }));
const edges = Array.from({ length: 300 }, (_, i) => ({ id: `e-${i + 1}`, from: `w-${(i % 250) + 1}`, to: `w-${((i + 7) % 250) + 1}`, label: "" }));
const tours = Array.from({ length: 40 }, (_, i) => ({ id: `t-${i + 1}`, name: `Tour ${i + 1}`, stops: [{ waypointId: "w-1", note: "" }] }));
const doc = { version: 1, project: { name: "big" }, waypoints, edges, tours };
fs.writeFileSync(".tmp/big.tour.json", JSON.stringify(doc, null, 2));
'
```

Bring it in, then export it back, timing both:

```bash
time cp .tmp/big.tour.json .tmp/qs-copies/big.tour.json
```

Both directions finish in under two seconds, and the imported map reports
`250 waypoints, 300 links, 40 tours` — plus the statement that it is larger than
the product is built for.

## 11. Carry the workspace to another machine — FR-018, FR-023, SC-006

```bash
mkdir -p .tmp/qs-move
node dist/cli.mjs workspace export .tmp/qs-move/workspace.json
```

Expected: `wrote …/workspace.json`, then `N projects, M maps, last view …`.

```bash
CTOUR_HOME="$PWD/.tmp/qs-home-2" node dist/cli.mjs workspace import .tmp/qs-move/workspace.json
```

Into an empty machine folder: every project whose recorded folder still exists is
added, the maps are copied, and the last view is restored.

## 12. A folder that moved — FR-019, FR-022

```bash
mv .tmp/qs-repo .tmp/qs-repo-moved
CTOUR_HOME="$PWD/.tmp/qs-home-3" node dist/cli.mjs workspace import .tmp/qs-move/workspace.json
```

The moved project is reported as `missing-folder` with the rerun hint, and exit
code is `1`. Then:

```bash
CTOUR_HOME="$PWD/.tmp/qs-home-3" node dist/cli.mjs workspace import .tmp/qs-move/workspace.json \
  --project qs-repo="$PWD/.tmp/qs-repo-moved"
```

The project is added pointing at the new folder and its maps are read from there,
not from the copies that travelled.

## 13. Twice adds nothing — FR-020, SC-007

Run scenario 12's last command again.

```
already added  qs-repo  …
0 projects added, 0 maps copied
```

Exit code `0`.

## 14. A file that is not a workspace — FR-021

```bash
CTOUR_HOME="$PWD/.tmp/qs-home-4" node dist/cli.mjs workspace import .tmp/broken.json; echo $?
```

Exit code `3`, one sentence saying it is not a workspace file, and
`~/.ctour/workspace.json` in that folder either absent or unchanged.

## 15. Nothing reaches the network — FR-027

```bash
npx vitest run --project unit tests/unit/bundle.test.ts tests/unit/exchange.test.ts
```

Alongside the behaviour assertions, the unit suite scans `app/lib/workspace/exchange.ts`
and `bundle.ts` for `fetch`, `http`, `https` and `net` imports and fails if any
appears. The 013 isolation scan continues to cover `cli/mcp/`.

## 16. `status` agrees with the import — FR-023

```bash
CTOUR_HOME="$PWD/.tmp/qs-home-2" node dist/cli.mjs status
```

Every project the import added is listed with its map count, matching the
summary the import printed. This is the check that the import went through the
same registry the rest of the command uses, not around it.

---

## Coverage

| Requirement                      | Scenario                                        |
| -------------------------------- | ----------------------------------------------- |
| FR-001, FR-004, FR-006           | 1, 4                                            |
| FR-002, FR-003                   | 2, 3                                            |
| FR-005                           | 3                                               |
| FR-007 … FR-010, FR-014 … FR-016 | 5, 6                                            |
| FR-011, FR-012                   | 8                                               |
| FR-013                           | 7                                               |
| FR-017                           | 10                                              |
| FR-018, FR-023                   | 11, 16                                          |
| FR-019, FR-022                   | 12                                              |
| FR-020                           | 13                                              |
| FR-021                           | 14                                              |
| FR-024 … FR-026                  | 9                                               |
| FR-027                           | 8, 15                                           |
| FR-028, FR-029                   | every scenario asserts the sentence it produced |
| SC-001                           | 10                                              |
| SC-002                           | 1, 2                                            |
| SC-003                           | 7                                               |
| SC-004                           | 6                                               |
| SC-005                           | 8                                               |
| SC-006                           | 11, 12                                          |
| SC-007                           | 13                                              |
| SC-008                           | 5, 9 read end to end without instructions       |

## Automated equivalents

| Scenario                                    | Test                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1, 2, 4                                     | `tests/acceptance/exchange.spec.ts` — save a copy, a copy with a pending edit, a second copy into the same folder |
| 5, 6, 7, 8                                  | `tests/acceptance/exchange.spec.ts` — import, taken name, lossy confirmation, refusals                            |
| 9                                           | `tests/acceptance/exchange.spec.ts` — set export and set import with one skip                                     |
| 11, 12, 13, 14, 16                          | `tests/acceptance/workspace-bundle.spec.ts` — the real binary against two temporary machine folders               |
| 15                                          | `tests/unit/exchange.test.ts`, `tests/unit/bundle.test.ts`                                                        |
| naming, free names, exclusivity             | `tests/unit/exchange.test.ts`                                                                                     |
| plan ordering, folder matching, cache rules | `tests/unit/bundle.test.ts`                                                                                       |
| exit codes, `--json`, idempotency           | `tests/cli/workspace.test.ts`                                                                                     |
