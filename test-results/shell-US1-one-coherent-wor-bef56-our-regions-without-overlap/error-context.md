# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> US1 one coherent workspace >> shows the four regions without overlap
- Location: tests/acceptance/shell.spec.ts:69:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-region]')
Expected: 4
Received: 5
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-region]')
    14 × locator resolved to 5 elements
       - unexpected value "5"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e4]:
        - complementary [ref=e5]:
            - generic [ref=e7]:
                - generic [ref=e8]:
                    - generic [ref=e9]: Cognitive Tours
                    - 'button "Theme: Light" [ref=e10]':
                        - img
                - navigation "Projects and maps" [ref=e11]:
                    - list [ref=e12]:
                        - listitem [ref=e13]:
                            - generic [ref=e14]:
                                - generic [ref=e15]: e2e-fixture
                                - button "Bring in maps to e2e-fixture" [ref=e16]:
                                    - img
                                - button "Create a map in e2e-fixture" [ref=e17]:
                                    - img
                            - list [ref=e18]:
                                - listitem [ref=e19]:
                                    - link "main" [ref=e20] [cursor=pointer]:
                                        - /url: /p/e2e-fixture/main.tour.json
                                        - img [ref=e21]
                                        - generic [ref=e23]: main
                - button "Add a project" [ref=e25]:
                    - img
                    - generic [ref=e26]: Add project
            - button "Collapse navigation" [ref=e28]:
                - img
        - generic [ref=e29]:
            - generic [ref=e31]:
                - combobox "Current tour" [ref=e32]:
                    - generic: Why this exists
                    - img
                - button "New tour" [ref=e33]:
                    - img
                - paragraph [ref=e34]: Step 1 of 2
                - generic [ref=e35]:
                    - button "Previous stop" [disabled]:
                        - img
                    - button "Next stop" [ref=e36]:
                        - img
                    - button "Whole tour" [ref=e37]
                    - button "Edit tour" [ref=e38]:
                        - img
                        - text: Edit tour
                    - button "Export" [ref=e39]:
                        - img
                        - text: Export
                - generic [ref=e40]:
                    - button "Undo" [disabled]:
                        - img
                    - button "Redo" [disabled]:
                        - img
                - paragraph [ref=e41]: Up to date
            - generic [ref=e42]:
                - paragraph [ref=e43]: Map open with 3 waypoints and 1 tours
                - generic [ref=e44]:
                    - generic [ref=e45]:
                        - generic [ref=e46]:
                            - generic [ref=e47]:
                                - generic [ref=e48]: Search waypoints
                                - textbox "Search waypoints" [ref=e49]
                            - generic [ref=e50]:
                                - generic [ref=e51]: Filter by type
                                - combobox "Filter by type" [ref=e52]:
                                    - generic: All types
                                    - img
                            - paragraph [ref=e53]: 3 of 3 waypoints
                        - group "Map" [ref=e55]:
                            - application [ref=e56]:
                                - generic [ref=e58]:
                                    - generic:
                                        - generic:
                                            - img:
                                                - group "Edge from w-1 to w-2" [ref=e59] [cursor=pointer]:
                                                    - generic [ref=e62]:
                                                        - generic: requires
                                            - img:
                                                - group "Edge from w-2 to w-3" [ref=e64] [cursor=pointer]
                                        - generic:
                                            - group [ref=e67]:
                                                - generic [ref=e68]:
                                                    - paragraph [ref=e70]: User Need
                                                    - paragraph [ref=e71]: Understanding is the deliverable
                                            - group [ref=e73]:
                                                - generic [ref=e74]:
                                                    - paragraph [ref=e76]: Goal
                                                    - paragraph [ref=e77]: Waypoints carry meaning
                                            - group [ref=e79]:
                                                - generic [ref=e80]:
                                                    - paragraph [ref=e82]: Code Component
                                                    - paragraph [ref=e83]: Config is read from disk
                                - img
                                - generic "Control Panel" [ref=e85]:
                                    - button "Zoom In" [ref=e86] [cursor=pointer]:
                                        - img [ref=e87]
                                    - button "Zoom Out" [ref=e89] [cursor=pointer]:
                                        - img [ref=e90]
                                    - button "Fit View" [ref=e92] [cursor=pointer]:
                                        - img [ref=e93]
                                - link "React Flow attribution" [ref=e96] [cursor=pointer]:
                                    - /url: https://reactflow.dev
                                    - text: React Flow
                    - generic [ref=e98]:
                        - button "Save a copy" [ref=e99]:
                            - img
                            - generic [ref=e100]: Save a copy
                        - button "Export all maps" [ref=e101]:
                            - img
                            - generic [ref=e102]: Export all maps
        - complementary [ref=e103]:
            - generic [ref=e104]:
                - generic [ref=e105]: Inspector
                - button "Collapse inspector" [ref=e106]:
                    - img
            - generic [ref=e108]:
                - paragraph [ref=e109]: Select a waypoint on the map to edit it here, or open a tour from the dock.
                - button "Add a waypoint" [ref=e110]
    - alert [ref=e111]
```

# Test source

```ts
  1   | import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
  2   | import path from 'node:path';
  3   | import { expect, test, type Page } from '@playwright/test';
  4   |
  5   | const fixture = path.join(process.cwd(), '.tmp', 'e2e-fixture');
  6   | const mapPath = path.join(fixture, '.ctour', 'main.tour.json');
  7   |
  8   | const fixtureDocument = {
  9   |   version: 1,
  10  |   project: { name: 'e2e', createdAt: '2026-11-16T09:12:00.000Z' },
  11  |   waypoints: [
  12  |     {
  13  |       id: 'w-1',
  14  |       label: 'Understanding is the deliverable',
  15  |       type: 'User Need',
  16  |       description: 'People need to see how the code fits together.',
  17  |       position: { x: 0, y: 0 },
  18  |     },
  19  |     { id: 'w-2', label: 'Waypoints carry meaning', type: 'Goal', position: { x: 280, y: 40 } },
  20  |     {
  21  |       id: 'w-3',
  22  |       label: 'Config is read from disk',
  23  |       type: 'Code Component',
  24  |       file: 'app/lib/workspace/registry.ts',
  25  |       position: { x: 140, y: 240 },
  26  |     },
  27  |   ],
  28  |   edges: [
  29  |     { id: 'e-1', source: 'w-1', target: 'w-2', label: 'requires' },
  30  |     { id: 'e-2', source: 'w-2', target: 'w-3' },
  31  |   ],
  32  |   tours: [
  33  |     {
  34  |       id: 't-1',
  35  |       name: 'Why this exists',
  36  |       description: 'The short version.',
  37  |       stops: [{ waypointId: 'w-1', narrative: 'Start here.' }, { waypointId: 'w-2' }],
  38  |     },
  39  |   ],
  40  | };
  41  |
  42  | async function openMap(page: Page) {
  43  |   await page.goto('/p/e2e-fixture/main.tour.json?tour=t-1&step=0');
  44  |   await expect(page.locator('[data-region="canvas"]')).toBeVisible();
  45  |   await expect(page.getByText('Step 1 of 2')).toBeVisible();
  46  | }
  47  |
  48  | async function waitForSaved(page: Page) {
  49  |   await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });
  50  | }
  51  |
  52  | test.beforeAll(async ({ request }) => {
  53  |   rmSync(fixture, { recursive: true, force: true });
  54  |   mkdirSync(path.join(fixture, '.ctour'), { recursive: true });
  55  |   writeFileSync(mapPath, `${JSON.stringify(fixtureDocument, null, 2)}\n`, 'utf8');
  56  |   await request.post('/api/workspace', { data: { path: fixture } });
  57  | });
  58  |
  59  | test.beforeEach(async ({ page }) => {
  60  |   writeFileSync(mapPath, `${JSON.stringify(fixtureDocument, null, 2)}\n`, 'utf8');
  61  |   await page.addInitScript(() => {
  62  |     if (!window.localStorage.getItem('theme')) {
  63  |       window.localStorage.setItem('theme', 'light');
  64  |     }
  65  |   });
  66  | });
  67  |
  68  | test.describe('US1 one coherent workspace', () => {
  69  |   test('shows the four regions without overlap', async ({ page }) => {
  70  |     await openMap(page);
  71  |     const regions = page.locator('[data-region]');
> 72  |     await expect(regions).toHaveCount(4);
      |                           ^ Error: expect(locator).toHaveCount(expected) failed
  73  |     const boxes = await regions.evaluateAll(nodes =>
  74  |       nodes.map(node => {
  75  |         const rect = node.getBoundingClientRect();
  76  |         return { region: node.getAttribute('data-region'), x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  77  |       })
  78  |     );
  79  |     for (const box of boxes) {
  80  |       expect(box.w, `${box.region} has no width`).toBeGreaterThan(0);
  81  |     }
  82  |     const rail = boxes.find(box => box.region === 'rail')!;
  83  |     const canvas = boxes.find(box => box.region === 'canvas')!;
  84  |     const inspector = boxes.find(box => box.region === 'inspector')!;
  85  |     expect(rail.x + rail.w).toBeLessThanOrEqual(canvas.x + 1);
  86  |     expect(canvas.x + canvas.w).toBeLessThanOrEqual(inspector.x + 1);
  87  |   });
  88  |
  89  |   test('keeps every tour fact in the dock', async ({ page }) => {
  90  |     await openMap(page);
  91  |     const dock = page.locator('[data-region="dock"]');
  92  |     await expect(dock.getByText('Step 1 of 2')).toBeVisible();
  93  |     await expect(dock.getByRole('button', { name: 'Next stop' })).toBeVisible();
  94  |     const canvas = page.locator('[data-region="canvas"]');
  95  |     await expect(canvas.getByText('Step 1 of 2')).toHaveCount(0);
  96  |     await expect(page.locator('[data-region="rail"]').getByText('Step 1 of 2')).toHaveCount(0);
  97  |   });
  98  |
  99  |   test('every visible control has an accessible name', async ({ page }) => {
  100 |     await openMap(page);
  101 |     const unnamed = await page.locator('[data-region] button').evaluateAll(buttons =>
  102 |       buttons
  103 |         .filter(button => {
  104 |           const label = button.getAttribute('aria-label');
  105 |           const text = button.textContent?.trim();
  106 |           return !label && !text;
  107 |         })
  108 |         .map(button => button.outerHTML.slice(0, 80))
  109 |     );
  110 |     expect(unnamed).toEqual([]);
  111 |   });
  112 | });
  113 |
  114 | test.describe('US2 theme', () => {
  115 |   test('switches theme and keeps the choice after a reload', async ({ page }) => {
  116 |     await openMap(page);
  117 |     await page.getByRole('button', { name: /^Theme:/ }).click();
  118 |     await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  119 |     await expect(page.locator('html')).toHaveClass(/dark/);
  120 |     await page.reload();
  121 |     await expect(page.locator('html')).toHaveClass(/dark/);
  122 |   });
  123 |
  124 |   test('resolves surfaces from tokens in the dark theme', async ({ page }) => {
  125 |     await openMap(page);
  126 |     await page.getByRole('button', { name: /^Theme:/ }).click();
  127 |     await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  128 |     const background = await page
  129 |       .locator('[data-region="dock"]')
  130 |       .evaluate(node => getComputedStyle(node).backgroundColor);
  131 |     expect(background).not.toBe('rgb(255, 255, 255)');
  132 |     const railColor = await page
  133 |       .locator('[data-region="rail"]')
  134 |       .evaluate(node => getComputedStyle(node).backgroundColor);
  135 |     expect(railColor).not.toBe('rgb(255, 255, 255)');
  136 |   });
  137 | });
  138 |
  139 | test.describe('US3 navigation and restore', () => {
  140 |   test('restores the tour and step after leaving the map', async ({ page }) => {
  141 |     await openMap(page);
  142 |     await page.getByRole('button', { name: 'Next stop' }).click();
  143 |     await expect(page.getByText('Step 2 of 2')).toBeVisible();
  144 |     await page.goto('/');
  145 |     await page.waitForURL(/step=1/);
  146 |     await expect(page.getByText('Step 2 of 2')).toBeVisible();
  147 |   });
  148 |
  149 |   test('opens a map from the rail', async ({ page }) => {
  150 |     await openMap(page);
  151 |     await page.getByRole('link', { name: /main/ }).click();
  152 |     await expect(page.getByText('Why this exists')).toBeVisible();
  153 |   });
  154 | });
  155 |
  156 | test.describe('US5 next actions', () => {
  157 |   test('creates a map and opens it empty', async ({ page }) => {
  158 |     await openMap(page);
  159 |     await page.getByRole('button', { name: /^Create a map in e2e/ }).click();
  160 |     await page.getByLabel('Map name').fill('backend');
  161 |     await page.getByRole('button', { name: 'Create map' }).click();
  162 |     await page.waitForURL(/backend\.tour\.json/);
  163 |     await expect(page.getByText('This map has no waypoints yet.')).toBeVisible();
  164 |   });
  165 | });
  166 |
  167 | test.describe('US6 editing', () => {
  168 |   test('autosaves a description to the map file', async ({ page }) => {
  169 |     await openMap(page);
  170 |     await page.getByText('Understanding is the deliverable').click();
  171 |     const field = page.getByLabel('Description');
  172 |     await field.fill('Rewritten by the shell.');
```
