# Test Results

Формат ведения: каждый прогон добавляется сверху, сразу под этим разделом.

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
