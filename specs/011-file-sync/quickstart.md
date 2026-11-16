# Quickstart: Live Map Sync

**Feature**: `011-file-sync` | **Prerequisites**: Node 22+, a checkout, `npm install`

Everything below runs against this repository. Nothing leaves the machine.

---

## Automated checks

```bash
npm run test:unit
npm run test:e2e
```

`test:unit` covers the watcher and the change summary against real temporary
directories; `test:e2e` builds the application, starts it, and drives a browser
while writing to the fixture map from the test process.

Expected: the unit suite includes `tests/unit/sync-watch.test.ts` and
`tests/unit/diff.test.ts`; the acceptance suite includes
`tests/acceptance/sync.spec.ts`. Both are green, and the run is recorded in
`TEST_RESULTS.md`.

---

## Manual scenarios

Start the application and open the fixture map:

```bash
npm run dev
```

Open `http://localhost:3000/p/e2e-fixture/main.tour.json?tour=t-1&step=0`. The
fixture lives at `.tmp/e2e-fixture/.tours/main.tour.json`; `MAP` below is that
path.

### 1. An outside change appears (FR-001, FR-002, SC-001)

```bash
node -e "
const fs=require('fs');const p=process.env.MAP;
const d=JSON.parse(fs.readFileSync(p,'utf8'));
d.waypoints[0].label='Changed outside';
fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
"
```

Expected: within one second the canvas shows `Changed outside`, the selected
waypoint is still selected, the tour and step are unchanged, and no notice
appears.

### 2. Own saves do not echo (FR-003, SC-002)

Edit a waypoint's description in the inspector, wait for the save, then press
`Ctrl/Cmd+Z` four times.

Expected: no notice at any point, the map never reloads, and each undo step
returns a state the person produced.

### 3. Neither side is lost (FR-004…FR-007, SC-003)

Select a waypoint, type in its description and keep focus in the field, then in
another terminal:

```bash
MAP=$MAP node -e "
const fs=require('fs');const p=process.env.MAP;
const d=JSON.parse(fs.readFileSync(p,'utf8'));
d.waypoints[1].label='Renamed outside';
fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
"
```

Expected: one notice says the file changed and names the changed waypoint, with
two actions. Typing further leaves the text alone. Choosing **Reload** shows the
file's version and says the history restarted. Choosing **Keep mine** writes the
person's version and the notice disappears without a second notice.

### 4. An unreadable file is not applied (FR-008, FR-009, SC-004)

```bash
printf '<<<<<<< HEAD\n' > "$MAP"
```

Expected: the map stays on screen, one notice names the file and says it is not
valid JSON, no save is performed, and nothing empties the document. Restoring a
valid file makes the notice disappear and the content update.

### 5. A deleted file is not empty content (FR-010)

```bash
cp "$MAP" /tmp/map-backup.json && rm "$MAP"
```

Expected: the map stays on screen and the notice offers to write it back;
choosing that restores the file. Waiting changes nothing.

### 6. The rail follows the folder (FR-013, SC-006)

```bash
cp "$MAP" "$(dirname "$MAP")/second.tour.json"
rm "$(dirname "$MAP")/second.tour.json"
```

Expected: `second` appears in the rail within a second and disappears within a
second. No reload.

### 7. Read-only maps do not sync (FR-014)

Rename the project folder away, reopen the application, and point it back at the
map. Expected: the existing read-only notice, no errors from the stream, and the
map still follows nothing on disk until the project is relinked.

### 8. Idle is idle (SC-009)

Leave the map open for ten minutes. Expected: no notices, no requests in the
network panel except the 25-second keep-alive comments, and no growth in memory.

---

## Where the design lives

- Event shapes and server rules: [contracts/sync-events.md](./contracts/sync-events.md)
- Failure cases and notice precedence: [contracts/map-file-errors.md](./contracts/map-file-errors.md)
- Runtime state and invariants: [data-model.md](./data-model.md)
- Why each mechanism was chosen, and what was rejected: [research.md](./research.md)
