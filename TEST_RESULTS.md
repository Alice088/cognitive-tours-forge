# Test Results

Формат ведения: каждый прогон добавляется сверху, сразу под этим разделом.

---

## Прогон: 2026-11-17 09:22 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run`, `npm run build:cli`, `node dist/cli.mjs --version`, `npx eslint .`, `npx tsc --noEmit`

`make bump-patch` до 0.1.1 уронил `dispatch.test.ts` («expected '0.1.0' to be '0.1.1'»): версия была зашита в `cli/lib/version.ts`. Теперь она читается из `package.json` во время запуска (`../package.json`, затем `../../package.json`), поэтому бамп версии больше не расходится с бинарём.

| #   | Тест                                                        | Пакет  | Результат | Время |
| --- | ----------------------------------------------------------- | ------ | --------- | ----- |
| 1   | `dispatch.test.ts` — версия совпадает с `package.json`      | vitest | PASS      | 0.10s |
| 2   | `npm run build:cli` пишет `dist/build.json` с версией 0.1.1 | cli    | PASS      | 0.60s |
| 3   | `node dist/cli.mjs --version` печатает `ctour 0.1.1`        | cli    | PASS      | 0.10s |
| 4   | `npx vitest run` — 37 файлов / 346 тестов                   | vitest | PASS      | 4.40s |
| 5   | `npx eslint .`                                              | eslint | PASS      | 2.80s |
| 6   | `npx tsc --noEmit`                                          | tsc    | PASS      | 3.10s |

### Сводка

**Всего:** 6 · **PASS:** 6 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 11.10s

### Падения

| Тест | Причина                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------- |
| —    | нет (падение `dispatch.test.ts` после `make bump-patch` было дефектом и исправлено в этом же прогоне) |

---

## Прогон: 2026-11-17 09:20 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `make pack ALLOW_DIRTY=1`, `sh install.sh --prefix …` (путь релиза), `curl … | sh` (текущий `main`), `npx vitest run`, `npx eslint .`, `npx tsc --noEmit`

Проверка вопроса «даёт ли `curl … | sh` новую версию»: сейчас **нет** — ассет `v0.1.0` собран до появления pi-адаптера и не несёт сведений о сборке, установщик честно берёт его. Добавлен механизм: сборка пишет `dist/build.json` (версия, коммит, признак грязного дерева), установщик сравнивает коммит с головой `main` и при расхождении или грязной сборке собирает из исходников; `make release` теперь отказывается при незакоммиченных изменениях и при уже существующем релизе.

| #   | Тест                                                                                | Пакет  | Результат | Время  |
| --- | ----------------------------------------------------------------------------------- | ------ | --------- | ------ |
| 1   | сборка пишет `dist/build.json` с версией и коммитом                                 | cli    | PASS      | 0.20s  |
| 2   | `make pack ALLOW_DIRTY=1` даёт tarball с `package/dist/build.json`                  | make   | PASS      | 61.00s |
| 3   | `install.sh` по пути релиза печатает «carries no build information; using it»       | sh     | PASS      | 8.40s  |
| 4   | текущая команда `curl … \| sh` из `main` ставит старый `0.1.0`                      | sh     | PASS      | 9.60s  |
| 5   | фейковый `curl`: коммит релиза не совпадает с `main` → «building from source»       | vitest | PASS      | 0.90s  |
| 6   | фейковый `curl`: релиз собран из грязного дерева → «uncommitted changes», исходники | vitest | PASS      | 0.80s  |
| 7   | `make release` отказывается при незакоммиченных изменениях                          | make   | PASS      | 0.10s  |
| 8   | `make release` отказывается при существующем релизе `v0.1.0`                        | make   | PASS      | 0.60s  |
| 9   | `npx vitest run` — 37 файлов / 346 тестов                                           | vitest | PASS      | 4.70s  |
| 10  | `npx eslint .`                                                                      | eslint | PASS      | 2.80s  |
| 11  | `npx tsc --noEmit`                                                                  | tsc    | PASS      | 3.10s  |

### Сводка

**Всего:** 11 · **PASS:** 11 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 92.20s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-17 09:11 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `make release` (дважды), `make help`, `npx vitest run`, `npx eslint .`, `npx tsc --noEmit`

Добавлен `Makefile` с целью `release`: typecheck → unit-тесты → чистая сборка → `npm pack` → установка tarball в `.tmp/release` и запуск `--version`. Первый прогон поймал дефект: в `.next/standalone` оставался прошлый `ctour-0.1.0.tgz`, и он попадал в новый пакет (38 MB вместо 19.8). Исправлено: `build:all` теперь удаляет `.next/standalone` перед сборкой, а `files` дополнительно исключает `**/*.tgz`.

| #   | Тест                                                                   | Пакет  | Результат | Время                           |
| --- | ---------------------------------------------------------------------- | ------ | --------- | ------------------------------- |
| 1   | `make release`: typecheck + 344 теста как gate                         | make   | PASS      | 3.10s + 4.60s                   |
| 2   | `make release`: чистая сборка (`build:all`)                            | make   | PASS      | 62.00s                          |
| 3   | `make release`: `npm pack` даёт `ctour-0.1.0.tgz`                      | make   | PASS      | 9.40s                           |
| 4   | `make release`: установка tarball в `.tmp/release` и `ctour --version` | make   | PASS      | 9.30s                           |
| 5   | размер пакета после исправления                                        | make   | PASS      | — (19 788 253 байта, 1441 файл) |
| 6   | в пакете нет `.tgz`, `.tmp/`, `test-results/`                          | make   | PASS      | 0.40s                           |
| 7   | `make help` перечисляет цели                                           | make   | PASS      | 0.10s                           |
| 8   | `npx vitest run` — 37 файлов / 344 теста                               | vitest | PASS      | 4.60s                           |
| 9   | `npx eslint .`                                                         | eslint | PASS      | 2.80s                           |
| 10  | `npx tsc --noEmit`                                                     | tsc    | PASS      | 3.10s                           |

### Сводка

**Всего:** 10 · **PASS:** 10 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 99.40s

### Падения

| Тест | Причина                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| —    | нет; первый прогон дал 38 MB из-за старого tarball внутри `.next/standalone`, дефект исправлен до записи результата |

---

## Прогон: 2026-11-16 18:02 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npm run build:cli`, `node dist/cli.mjs mcp install`, `node dist/cli.mjs doctor`, `/home/fworld/.pi/agent/bin/pi mcp list`, прямой JSON-RPC вызов `list_projects`, `npx vitest run`, `npx eslint .`, `npx tsc --noEmit`

Добавлен адаптер pi в `ctour mcp install`: `~/.pi/agent/mcp.json`, тот же `mcpServers`, что у остальных. Подключение выполнено на этой машине и проверено настоящим клиентом pi.

| #   | Тест                                                                                                     | Пакет  | Результат | Время |
| --- | -------------------------------------------------------------------------------------------------------- | ------ | --------- | ----- |
| 1   | `detect` находит pi по папке `~/.pi/agent`                                                               | vitest | PASS      | 0.01s |
| 2   | `installInto` пишет `mcpServers.ctour` в `~/.pi/agent/mcp.json`, не трогая `filesystem`                  | vitest | PASS      | 0.01s |
| 3   | второй прогон отвечает `unchanged`                                                                       | vitest | PASS      | 0.01s |
| 4   | два новых теста в `mcp-install.test.ts` (21 тест)                                                        | vitest | PASS      | 0.90s |
| 5   | `node dist/cli.mjs mcp install` → `pi  connected  ~/.pi/agent/mcp.json`                                  | cli    | PASS      | 0.80s |
| 6   | `pi mcp list` → `ctour: connected, 9 tools (codemode, global)`                                           | pi     | PASS      | 2.40s |
| 7   | `list_projects` через тот же путь, что прописан pi: 3 проекта, `support-inbox` с 12 waypoints и 5 турами | mcp    | PASS      | 0.70s |
| 8   | `ctour doctor` → `ok agent:pi connected in ~/.pi/agent/mcp.json`                                         | cli    | PASS      | 0.60s |
| 9   | `npx vitest run` — 37 файлов / 343 теста                                                                 | vitest | PASS      | 4.60s |
| 10  | `npx eslint .`                                                                                           | eslint | PASS      | 2.80s |
| 11  | `npx tsc --noEmit`                                                                                       | tsc    | PASS      | 3.10s |

### Сводка

**Всего:** 11 · **PASS:** 11 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 16.33s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 17:47 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `curl -fsSL …/main/install.sh | sh -s -- --prefix /tmp/release-prefix`, `curl -fsSL …/main/install.sh | sh`, `ctour --version`, `CTOUR_HOME=/tmp/release-home ctour init --port 4414`

Проверка опубликованного релиза: `install.sh` в `main` совпадает с локальным, ассет `v0.1.0/ctour-0.1.0.tgz` (19 785 867 байт) на месте, установщик берёт его вместо сборки.

| #   | Тест                                                                               | Пакет      | Результат | Время  |
| --- | ---------------------------------------------------------------------------------- | ---------- | --------- | ------ |
| 1   | `GET releases/download/v0.1.0/ctour-0.1.0.tgz` → 302 на ассет                      | github     | PASS      | 0.60s  |
| 2   | ассет в API: `ctour-0.1.0.tgz`, 19 785 867 байт                                    | github     | PASS      | 0.50s  |
| 3   | `raw.githubusercontent.com/.../main/install.sh` → 200                              | github     | PASS      | 0.40s  |
| 4   | скачанный `install.sh` байт в байт равен локальному                                | github     | PASS      | 0.30s  |
| 5   | установка из релиза с `--prefix`: сообщение `Using the packed release`, без сборки | sh         | PASS      | 13.00s |
| 6   | `ctour --version` после установки из релиза                                        | cli        | PASS      | 0.10s  |
| 7   | `ctour init --port 4414`: карта, адрес, `/api/workspace` → 200                     | cli        | PASS      | 11.00s |
| 8   | интерфейс из релиза: 4 региона, 0 ответов ≥400, обе кнопки в верхней строке        | playwright | PASS      | 2.00s  |
| 9   | та же команда без `--prefix`: `ctour` на `PATH` (`~/.nvm/…/bin/ctour`)             | sh         | PASS      | 14.00s |

### Сводка

**Всего:** 9 · **PASS:** 9 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 41.90s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 17:39 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `sh install.sh` (локальный чекаут), `sh install.sh` из пустой папки (сборка из архива GitHub), `npx vitest run`, `npx eslint .`, `npx tsc --noEmit`

Добавлен `install.sh`: одна команда ставит `ctour`, скачивая источники с GitHub и собирая пакет на машине. Проверен оба пути — из готового чекаута (без сборки) и с нуля из архива `main`.

| #   | Тест                                                                               | Пакет      | Результат | Время   |
| --- | ---------------------------------------------------------------------------------- | ---------- | --------- | ------- |
| 1   | `sh -n install.sh` — синтаксис                                                     | sh         | PASS      | 0.02s   |
| 2   | `install.sh --help` печатает строку `curl … \| sh` и `--prefix`                    | sh         | PASS      | 0.05s   |
| 3   | `install.sh --version` → `install.sh 0.1.0`                                        | sh         | PASS      | 0.03s   |
| 4   | неизвестный флаг → код 1 и `unknown option`                                        | sh         | PASS      | 0.03s   |
| 5   | без node в `PATH` → код 1 и `Node.js is not installed`                             | sh         | PASS      | 0.05s   |
| 6   | установка из чекаута (`--prefix /tmp/ctour-prefix2`)                               | sh         | PASS      | 3.20s   |
| 7   | установка из архива GitHub с нуля: `npm install` + `next build` + `esbuild` + pack | sh         | PASS      | 268.00s |
| 8   | `ctour --version` после установки из архива                                        | cli        | PASS      | 0.10s   |
| 9   | `ctour init` после установки из архива: карта, адрес, `GET /api/workspace` → 200   | cli        | PASS      | 12.40s  |
| 10  | интерфейс из установленного пакета в браузере, 0 ответов ≥ 400                     | playwright | PASS      | 2.00s   |
| 11  | `npx vitest run` — 37 файлов / 341 тест                                            | vitest     | PASS      | 4.50s   |
| 12  | `npx eslint .`                                                                     | eslint     | PASS      | 2.80s   |
| 13  | `npx tsc --noEmit`                                                                 | tsc        | PASS      | 3.10s   |

### Сводка

**Всего:** 13 · **PASS:** 13 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 296.30s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 17:26 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npm pack`, `npm install -g ./ctour-0.1.0.tgz --prefix /tmp/ctour-prefix`, `ctour --version`, `CTOUR_HOME=/tmp/scratch-home ctour init --port 4411`, `curl /api/workspace`, `npm publish --ignore-scripts`, `npm run typecheck`, `npm run test:unit`

Проверка публикации: метаданные пакета (`repository`, `homepage`, `bugs`, `keywords`, `description`) добавлены, `files` сужен — `1637 → 1438` файлов, `23.6 MB → 19.8 MB`. Собранный tarball установлен глобально и запущен как обычный пользователь.

| #   | Тест                                                                                            | Пакет      | Результат | Время  |
| --- | ----------------------------------------------------------------------------------------------- | ---------- | --------- | ------ |
| 1   | `npm pack` собирает `ctour-0.1.0.tgz`                                                           | npm        | PASS      | 4.00s  |
| 2   | глобальная установка tarball                                                                    | npm        | PASS      | 6.00s  |
| 3   | `ctour --version` печатает `ctour 0.1.0`                                                        | cli        | PASS      | 0.10s  |
| 4   | `ctour init` создаёт `.ctour/<name>.tour.json` и печатает адрес                                 | cli        | PASS      | 10.00s |
| 5   | `GET /api/workspace` отвечает 200                                                               | http       | PASS      | 0.02s  |
| 6   | интерфейс из tarball: 4 региона, 0 ответов ≥400                                                 | playwright | PASS      | 2.50s  |
| 7   | `ctour init` отказывает папке вне `$HOME`                                                       | cli        | PASS      | 0.30s  |
| 8   | `npm publish --ignore-scripts` доходит до registry и падает только на авторизации (`ENEEDAUTH`) | npm        | PASS      | 1.20s  |
| 9   | `npm run typecheck`                                                                             | tsc        | PASS      | 3.10s  |
| 10  | `npm run test:unit` — 335 тестов                                                                | vitest     | PASS      | 4.31s  |

### Сводка

**Всего:** 10 · **PASS:** 10 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 31.53s

### Падения

| Тест | Причина                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| —    | нет; публикация остановлена отсутствием учётных данных npm, а не ошибкой пакета |

---

## Прогон: 2026-11-16 17:20 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run`, `npx prettier --check README.md docs/*.md docs/guides/*.md`

Снова только документация: README сокращён с 484 до 191 строки (технические детали вынесены в `docs/ARCHITECTURE.md` и `docs/DEVELOPING.md`), установка в quickstart сведена к `npm install -g ctour`, затем `ctour init` и `ctour serve`. Кода не касались.

| #   | Тест                               | Пакет  | Результат | Время |
| --- | ---------------------------------- | ------ | --------- | ----- |
| 1   | все unit- и cli-тесты — 335 тестов | vitest | PASS      | 4.31s |

### Сводка

**Всего:** 335 · **PASS:** 335 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 4.31s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 17:15 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run`, `npx prettier --check README.md docs/QUICKSTART.md docs/guides/*.md`

Изменение только документации: README перестроен (бизнес-логика → архитектура → техника), добавлены `docs/QUICKSTART.md` (переименован из `GETTING-STARTED.md`), четыре гайда в `docs/guides/`, картинка `docs/images/graph-view.png` и раздел «The research» с источниками. Кода не касались, поэтому приёмка не перезапускалась.

| #   | Тест                               | Пакет  | Результат | Время |
| --- | ---------------------------------- | ------ | --------- | ----- |
| 1   | все unit- и cli-тесты — 335 тестов | vitest | PASS      | 4.31s |

### Сводка

**Всего:** 335 · **PASS:** 335 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0 · время 4.31s

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 16:56 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx playwright test` (полный набор), `npx vitest run`, `node .tmp/walk-015.mjs` (ручной проход `specs/015-tour-view-and-actions/quickstart.md`, 12 сценариев), `npx tsc --noEmit`, `npx eslint .`, `npm run build:all`

Закрытие 015: исправлено поведение FR-014 (закрытие панели «whole tour» возвращает карточку, а не гасит поверхность целиком) — нашлось именно на ручном проходе quickstart, сценарий 6.6. Добавлен приёмочный тест `closing the panel returns to the card at the stop being read`.

### Полный приёмочный набор

| #   | Тест                                      | Пакет      | Результат | Время   |
| --- | ----------------------------------------- | ---------- | --------- | ------- |
| 1   | все спеки `tests/acceptance` — 117 тестов | playwright | PASS      | 150.00s |

### Ручной проход quickstart (`node .tmp/walk-015.mjs`, 32 проверки)

| #   | Тест | Пакет | Результат | Время |
| --- | ---- | ----- | --------- | ----- |

| 2 | 1 card shows the stop sentence | walk-015.mjs | PASS | 0.86s |
| 3 | 1 card carries the narration | walk-015.mjs | PASS | 0.00s |
| 4 | 1 card points at the description | walk-015.mjs | PASS | 0.00s |
| 5 | 2 stepped to the last stop | walk-015.mjs | PASS | 0.71s |
| 6 | 2 one surface only | walk-015.mjs | PASS | 0.00s |
| 7 | 2 last Next is disabled | walk-015.mjs | PASS | 0.00s |
| 8 | 3 no-narration sentence | walk-015.mjs | PASS | 0.71s |
| 9 | 4 right arrow steps the walk | walk-015.mjs | PASS | 0.64s |
| 10 | 4 left arrow steps back | walk-015.mjs | PASS | 0.21s |
| 11 | 4 left arrow at the first stop changes nothing | walk-015.mjs | PASS | 0.20s |
| 12 | 5 dismissal hides the card | walk-015.mjs | PASS | 0.23s |
| 13 | 5 restore control appears in the top row | walk-015.mjs | PASS | 0.00s |
| 14 | 5 later steps do not reopen it | walk-015.mjs | PASS | 0.29s |
| 15 | 5 restore brings it back at the read stop | walk-015.mjs | PASS | 0.23s |
| 16 | 5 another tour opens again at its first stop | walk-015.mjs | PASS | 0.69s |
| 17 | 6 panel shows the tour name | walk-015.mjs | PASS | 0.34s |
| 18 | 6 panel lists every stop | walk-015.mjs | PASS | 0.00s |
| 19 | 6 choosing a stop returns to the card | walk-015.mjs | PASS | 0.41s |
| 20 | 6 closing the panel returns to the card | walk-015.mjs | PASS | 0.58s |
| 21 | 7 tour without narration says so once | walk-015.mjs | PASS | 0.67s |
| 22 | 7 a tour without stops says so | walk-015.mjs | PASS | 0.65s |
| 23 | 8 both actions in the top row | walk-015.mjs | PASS | 0.70s |
| 24 | 8 the map corner belongs to the map | walk-015.mjs | PASS | 0.00s |
| 25 | 8 the export dialog still opens | walk-015.mjs | PASS | 0.34s |
| 26 | 9 narrow window keeps the search field | walk-015.mjs | PASS | 0.33s |
| 27 | 9 one overflow control instead | walk-015.mjs | PASS | 0.00s |
| 28 | 9 both items in the menu | walk-015.mjs | PASS | 0.03s |
| 29 | 12 dark theme keeps the surface on tokens | walk-015.mjs | PASS | 1.12s |
| 30 | 11 reading left the file untouched | walk-015.mjs | PASS | 0.13s |
| 31 | 11 undo stayed disabled | walk-015.mjs | PASS | 0.01s |
| 32 | 10 a travelled copy still reads | walk-015.mjs | PASS | 1.54s |
| 33 | 10 no editing control in the surface | walk-015.mjs | PASS | 0.00s |

### Модульные тесты

`npx vitest run` — **36 файлов / 335 тестов**, все PASS (4.3s).

### Сводка

**Всего:** 150 · **PASS:** 150 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0
Приёмочные: 117 тестов, 150.0s. Ручной проход: 32 проверки, 11.63s. Модульные: 335 тестов, 4.3s.

Проверено на живом демо `http://127.0.0.1:4317/p/support-inbox`: карточка в левом нижнем углу над zoom-контролами, фокусный стоп не перекрыт, панель на всю высоту слева, действия в верхней строке, на 390 px — одно меню `More map actions`, тёмная тема на токенах (`bg` `rgb(17,17,20)` против текста `rgb(169,169,182)`), контрольная сумма файла карты неизменна, `Undo` заблокирован.

### Падения

| Тест | Причина                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| —    | нет (первый проход quickstart: 6.6 и 7 — оба оказались ошибками самого прохода, 6.6 — реальный дефект кода, исправлен) |

---

## Прогон: 2026-11-16 16:44 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run --reporter=json`, `npx playwright test tests/acceptance/tour-reading.spec.ts tests/acceptance/shell.spec.ts tests/acceptance/keyboard.spec.ts --reporter=json`, `npx playwright test` (полный набор), `npx tsc --noEmit`, `npx eslint .`, `npx next build`, `npx prettier --check`

Фича 015. Таблица ниже — прогоны с JSON-репортером (per-test durations взяты из него). Полный приёмочный прогон `npx playwright test` в этом же сеансе: **115 passed (2.5m)**, 0 падений — до него 18 спек падали из-за новой карточки, дублировавшей текст метки waypoint; в тестах клик по карточке узла заменён на `.react-flow__node` с `hasText`, после чего набор зелёный.

### Модульные тесты — `tests/unit/tour-reading.test.ts`

| #   | Тест | Пакет | Результат | Время |
| --- | ---- | ----- | --------- | ----- |

| 1 | stopView > carries the narration, the type and the description | tour-reading.test.ts | PASS | 0.00s |
| 2 | stopView > reports a missing narration as absent | tour-reading.test.ts | PASS | 0.00s |
| 3 | stopView > treats a whitespace-only narration as absent | tour-reading.test.ts | PASS | 0.00s |
| 4 | stopView > treats a whitespace-only description as absent | tour-reading.test.ts | PASS | 0.00s |
| 5 | stopView > survives a stop whose waypoint is gone | tour-reading.test.ts | PASS | 0.00s |
| 6 | stopView > reads its position and total out loud | tour-reading.test.ts | PASS | 0.00s |
| 7 | hasAnyNarration > is true when one stop carries words | tour-reading.test.ts | PASS | 0.00s |
| 8 | hasAnyNarration > is false when every narration is whitespace or missing | tour-reading.test.ts | PASS | 0.00s |
| 9 | pickCorner > keeps the bottom-left corner when the stop is elsewhere | tour-reading.test.ts | PASS | 0.00s |
| 10 | pickCorner > moves to the bottom-right corner when the stop sits in the bottom-left | tour-reading.test.ts | PASS | 0.00s |
| 11 | pickCorner > falls back to the top-right corner when both bottom corners are taken | tour-reading.test.ts | PASS | 0.00s |
| 12 | pickCorner > defaults to the bottom-left when there is no focused stop | tour-reading.test.ts | PASS | 0.00s |
| 13 | pickCorner > never chooses a corner whose card covers the stop | tour-reading.test.ts | PASS | 0.00s |
| 14 | pickCorner > keeps the bottom-left card clear of the map controls | tour-reading.test.ts | PASS | 0.00s |
| 15 | pickCorner > narrows the card on a narrow map instead of overflowing it | tour-reading.test.ts | PASS | 0.00s |
| 16 | shows the position, the type, the label and the narration | tour-reading.spec.ts | PASS | 0.21s |
| 17 | puts the description under its own heading, never in place of the narration | tour-reading.spec.ts | PASS | 0.21s |
| 18 | swaps the words in place and never stacks a second card | tour-reading.spec.ts | PASS | 0.23s |
| 19 | says so when a stop carries no narration | tour-reading.spec.ts | PASS | 0.22s |
| 20 | keeps the card clear of the focused stop at every step | tour-reading.spec.ts | PASS | 0.37s |
| 21 | dismisses without losing the walk and comes back from the top row | tour-reading.spec.ts | PASS | 0.34s |
| 22 | opens again for another tour after a dismissal | tour-reading.spec.ts | PASS | 0.35s |
| 23 | steps the walk with the arrow keys | tour-reading.spec.ts | PASS | 0.27s |
| 24 | keeps the corner free and both actions in the top row | tour-reading.spec.ts | PASS | 0.21s |
| 25 | keeps both actions one control away on a narrow window | tour-reading.spec.ts | PASS | 0.25s |
| 26 | opens the save dialog from the top row | tour-reading.spec.ts | PASS | 0.25s |
| 27 | lists every stop beside a map that stays visible | tour-reading.spec.ts | PASS | 0.23s |
| 28 | moves the walk to a stop chosen from the panel and returns to the card | tour-reading.spec.ts | PASS | 0.28s |
| 29 | says once that a tour has no narration anywhere | tour-reading.spec.ts | PASS | 0.23s |
| 30 | shows a tour that has no stops instead of silence | tour-reading.spec.ts | PASS | 0.20s |
| 31 | reads a forty-stop tour in one panel | tour-reading.spec.ts | PASS | 0.25s |
| 32 | leaves the map file untouched and the undo history empty | tour-reading.spec.ts | PASS | 1.61s |
| 33 | stays legible in the dark theme | tour-reading.spec.ts | PASS | 0.19s |
| 34 | reads a travelled copy without editing controls | tour-reading.spec.ts | PASS | 0.25s |
| 35 | shows the four regions without overlap | shell.spec.ts | PASS | 0.23s |
| 36 | leaves the map corner to the map | shell.spec.ts | PASS | 0.24s |
| 37 | keeps every tour fact in the dock | shell.spec.ts | PASS | 0.23s |
| 38 | every visible control has an accessible name | shell.spec.ts | PASS | 0.23s |
| 39 | switches theme and keeps the choice after a reload | shell.spec.ts | PASS | 0.40s |
| 40 | resolves surfaces from tokens in the dark theme | shell.spec.ts | PASS | 0.34s |
| 41 | restores the tour and step after leaving the map | shell.spec.ts | PASS | 0.39s |
| 42 | opens a map from the rail | shell.spec.ts | PASS | 0.26s |
| 43 | creates a map and opens it empty | shell.spec.ts | PASS | 0.35s |
| 44 | autosaves a description to the map file | shell.spec.ts | PASS | 2.80s |
| 45 | undoes and redoes a change | shell.spec.ts | PASS | 2.02s |
| 46 | keeps the map visible while editing | shell.spec.ts | PASS | 0.26s |
| 47 | rearranges at 360 without horizontal scrolling | shell.spec.ts | PASS | 0.26s |
| 48 | keeps the dock usable at 768 | shell.spec.ts | PASS | 0.21s |
| 49 | never exposes the same action in two regions | shell.spec.ts | PASS | 0.21s |
| 50 | a control that claims to change the map changes it | shell.spec.ts | PASS | 0.25s |
| 51 | reaches every region with the keyboard in the contract order | keyboard.spec.ts | PASS | 0.42s |
| 52 | shows a visible focus ring on a keyboard-focused control | keyboard.spec.ts | PASS | 0.23s |
| 53 | Escape closes the inspector drawer before anything else | keyboard.spec.ts | PASS | 0.29s |
| 54 | undo inside a text field stays text undo | keyboard.spec.ts | PASS | 0.60s |
| 55 | focuses the map search with a slash | keyboard.spec.ts | PASS | 0.26s |
| 56 | moves between waypoints with the arrow keys when no tour is read | keyboard.spec.ts | PASS | 0.42s |
| 57 | dismisses the tour before the selection | keyboard.spec.ts | PASS | 0.37s |

### Сводка

**Всего:** 57 · **PASS:** 57 · **FAIL:** 0 · **SKIP:** 0 · **PANIC:** 0
**Время:** модульные — 4.31s (335 тестов, 36 файлов), приёмочные в таблице — 17.42s; полный acceptance — 115 тестов за 2.5m.

`npx tsc --noEmit`, `npx eslint .`, `npx next build` — без ошибок и предупреждений (единственное предупреждение Turbopack про NFT-трейс в `next.config.ts` относится к коду 014 и было до этой фичи).

### Падения

| Тест | Причина |
| ---- | ------- |
| —    | нет     |

---

## Прогон: 2026-11-16 15:38 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run` (unit + cli), `npx playwright test tests/acceptance/exchange.spec.ts`, `npx playwright test tests/acceptance/workspace-bundle.spec.ts`, `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check`

Полный приёмочный прогон (`npx playwright test` целиком) прерван пользователем; остальные спеки приёмки в этом прогоне не выполнялись.

### Новое в фиче 014 — `exchange.spec.ts`

| #   | Тест                                                                         | Пакет            | Результат | Время |
| --- | ---------------------------------------------------------------------------- | ---------------- | --------- | ----- |
| 1   | saves a copy of the open map that holds exactly what the map holds           | exchange.spec.ts | PASS      | 0.64s |
| 2   | carries a note that has not reached the project yet                          | exchange.spec.ts | PASS      | 0.48s |
| 3   | delivers a copy from the last known version and says so                      | exchange.spec.ts | PASS      | 0.38s |
| 4   | delivers no copy when the map cannot be written back                         | exchange.spec.ts | PASS      | 0.49s |
| 5   | brings a file in, previews it and opens it without reloading                 | exchange.spec.ts | PASS      | 0.63s |
| 6   | steps aside when the name is taken and leaves the first map byte for byte    | exchange.spec.ts | PASS      | 0.50s |
| 7   | asks for the entries that cannot be represented and writes nothing on cancel | exchange.spec.ts | PASS      | 0.81s |
| 8   | refuses a file that is not a map and writes nothing                          | exchange.spec.ts | PASS      | 0.45s |
| 9   | refuses a project folder that cannot be reached                              | exchange.spec.ts | PASS      | 0.02s |
| 10  | exports every map of a project into one folder                               | exchange.spec.ts | PASS      | 0.44s |
| 11  | brings a folder of maps in, skipping a name that is already there            | exchange.spec.ts | PASS      | 0.05s |
| 12  | reports a folder entry that is not a map and still brings the rest           | exchange.spec.ts | PASS      | 0.05s |

### Новое в фиче 014 — `workspace-bundle.spec.ts`

| #   | Тест                                                         | Пакет                    | Результат | Время |
| --- | ------------------------------------------------------------ | ------------------------ | --------- | ----- |
| 13  | carries a workspace to a machine whose folders are elsewhere | workspace-bundle.spec.ts | PASS      | 0.08s |
| 14  | reports a project left out and changes nothing else          | workspace-bundle.spec.ts | PASS      | 0.07s |
| 15  | adds nothing the second time and says so                     | workspace-bundle.spec.ts | PASS      | 0.11s |
| 16  | refuses a file that is not a workspace file                  | workspace-bundle.spec.ts | PASS      | 0.03s |
| 17  | shows the imported projects in the interface                 | workspace-bundle.spec.ts | PASS      | 1.00s |

### Модульные и командные тесты (`npx vitest run`)

| #   | Тест                                          | Пакет             | Результат | Время |
| --- | --------------------------------------------- | ----------------- | --------- | ----- |
| 18  | весь набор unit + cli (35 файлов, 320 тестов) | vitest unit + cli | PASS      | 4.51s |
| 19  | `tests/unit/exchange.test.ts` (24 теста)      | vitest unit       | PASS      | 0.53s |
| 20  | `tests/unit/bundle.test.ts` (14 тестов)       | vitest unit       | PASS      | 0.52s |
| 21  | `tests/cli/workspace.test.ts` (21 тест)       | vitest cli        | PASS      | 0.22s |

### Сводка

Всего записей: 21 · PASS: 21 · FAIL: 0 · SKIP: 0 · PANIC: 0
Фактические счётчики команд: unit + cli — 35 файлов / 320 тестов, 4.51s; `exchange.spec.ts` — 12 тестов, 17.8s; `workspace-bundle.spec.ts` — 5 тестов, 11.2s.

### Падения

| Тест | Причина |
| ---- | ------- |
| нет  | —       |

**Не выполнено в этом прогоне:** полный `npx playwright test` (прерван), проверка `npm pack --dry-run`, ручной проход `quickstart.md`.

## Прогон: 2026-11-16 14:42 MSK (+0300)

**Ветка:** `main` · **Node:** v22.22.3 · **Команды:** `npx vitest run --reporter=json` (проекты unit + cli), `npx playwright test` (workers=1, production build), `npx tsc --noEmit`, `npx eslint .`, `npm pack --dry-run`

### Приёмочные тесты (`playwright test`)

| #   | Тест                                                                       | Пакет                 | Результат | Время  |
| --- | -------------------------------------------------------------------------- | --------------------- | --------- | ------ |
| 1   | changes no file when it runs a second time                                 | cli.spec.ts           | PASS      | 0.85s  |
| 2   | opens the map for a repository in one command                              | cli.spec.ts           | PASS      | 1.75s  |
| 3   | opens the workspace screen where there is no project                       | cli.spec.ts           | PASS      | 1.03s  |
| 4   | returns the terminal within a second of the interrupt                      | cli.spec.ts           | PASS      | 0.40s  |
| 5   | takes another address when the first is busy                               | cli.spec.ts           | PASS      | 1.87s  |
| 6   | adds and removes a link between two waypoints                              | editing.spec.ts       | PASS      | 2.60s  |
| 7   | creates a tour and deletes it again                                        | editing.spec.ts       | PASS      | 1.95s  |
| 8   | moves a waypoint by dragging it on the map                                 | editing.spec.ts       | PASS      | 3.67s  |
| 9   | refuses an empty label and an absolute path in the editor                  | editing.spec.ts       | PASS      | 3.40s  |
| 10  | replays twenty changes back to the beginning and forward to the end        | editing.spec.ts       | PASS      | 61.37s |
| 11  | says why a save failed and offers one retry                                | editing.spec.ts       | PASS      | 1.23s  |
| 12  | dismisses the tour before the selection                                    | keyboard.spec.ts      | PASS      | 0.32s  |
| 13  | Escape closes the inspector drawer before anything else                    | keyboard.spec.ts      | PASS      | 0.28s  |
| 14  | focuses the map search with a slash                                        | keyboard.spec.ts      | PASS      | 0.26s  |
| 15  | moves between waypoints with the arrow keys                                | keyboard.spec.ts      | PASS      | 0.29s  |
| 16  | reaches every region with the keyboard in the contract order               | keyboard.spec.ts      | PASS      | 0.37s  |
| 17  | shows a visible focus ring on a keyboard-focused control                   | keyboard.spec.ts      | PASS      | 0.22s  |
| 18  | undo inside a text field stays text undo                                   | keyboard.spec.ts      | PASS      | 0.58s  |
| 19  | lets a person keep their own edit when the agent writes meanwhile          | mcp.spec.ts           | PASS      | 0.56s  |
| 20  | removes a waypoint the agent deletes                                       | mcp.spec.ts           | PASS      | 0.42s  |
| 21  | shows a waypoint the agent adds within a second, twenty times              | mcp.spec.ts           | PASS      | 4.10s  |
| 22  | clamps a stored step that no longer exists                                 | navigation.spec.ts    | PASS      | 0.19s  |
| 23  | drops a stored tour that no longer exists                                  | navigation.spec.ts    | PASS      | 0.38s  |
| 24  | returns to the same project, map, tour and stop three times                | navigation.spec.ts    | PASS      | 0.56s  |
| 25  | pans, zooms, selects and drags inside the interaction budget               | performance.spec.ts   | PASS      | 0.90s  |
| 26  | reports a map larger than the supported size                               | performance.spec.ts   | PASS      | 0.37s  |
| 27  | stays inside the interaction budget on a 250 waypoint map                  | performance.spec.ts   | PASS      | 0.38s  |
| 28  | edits are saved once at the end of a pause                                 | responsive.spec.ts    | PASS      | 3.76s  |
| 29  | gives the space of a collapsed rail back to the canvas                     | responsive.spec.ts    | PASS      | 0.26s  |
| 30  | keeps the rail labels reachable at the medium band                         | responsive.spec.ts    | PASS      | 0.27s  |
| 31  | opens one drawer at a time and returns focus to its opener                 | responsive.spec.ts    | PASS      | 0.34s  |
| 32  | rearranges itself at the wide, medium and narrow bands                     | responsive.spec.ts    | PASS      | 0.73s  |
| 33  | a control that claims to change the map changes it                         | shell.spec.ts         | PASS      | 0.26s  |
| 34  | autosaves a description to the map file                                    | shell.spec.ts         | PASS      | 2.82s  |
| 35  | creates a map and opens it empty                                           | shell.spec.ts         | PASS      | 0.37s  |
| 36  | every visible control has an accessible name                               | shell.spec.ts         | PASS      | 0.22s  |
| 37  | keeps every tour fact in the dock                                          | shell.spec.ts         | PASS      | 0.21s  |
| 38  | keeps the dock usable at 768                                               | shell.spec.ts         | PASS      | 0.21s  |
| 39  | keeps the map visible while editing                                        | shell.spec.ts         | PASS      | 0.26s  |
| 40  | never exposes the same action in two regions                               | shell.spec.ts         | PASS      | 0.21s  |
| 41  | opens a map from the rail                                                  | shell.spec.ts         | PASS      | 0.23s  |
| 42  | rearranges at 360 without horizontal scrolling                             | shell.spec.ts         | PASS      | 0.25s  |
| 43  | resolves surfaces from tokens in the dark theme                            | shell.spec.ts         | PASS      | 0.32s  |
| 44  | restores the tour and step after leaving the map                           | shell.spec.ts         | PASS      | 0.39s  |
| 45  | shows the four regions without overlap                                     | shell.spec.ts         | PASS      | 0.21s  |
| 46  | switches theme and keeps the choice after a reload                         | shell.spec.ts         | PASS      | 0.38s  |
| 47  | undoes and redoes a change                                                 | shell.spec.ts         | PASS      | 2.46s  |
| 48  | a failed load says what failed and offers one retry                        | states.spec.ts        | PASS      | 0.18s  |
| 49  | a project without a map shows one create action                            | states.spec.ts        | PASS      | 0.17s  |
| 50  | an empty workspace adds a project itself                                   | states.spec.ts        | PASS      | 0.39s  |
| 51  | an unavailable project stays listed and can be repointed                   | states.spec.ts        | PASS      | 0.74s  |
| 52  | disables the data actions while a map is loading                           | states.spec.ts        | PASS      | 1.98s  |
| 53  | opens an unreachable project read-only from the last saved copy            | states.spec.ts        | PASS      | 0.40s  |
| 54  | asks once when both sides changed and keeps the typing                     | sync-conflict.spec.ts | PASS      | 0.48s  |
| 55  | shows one notice when a change lands while saving                          | sync-conflict.spec.ts | PASS      | 1.15s  |
| 56  | takes the file version and restarts the history                            | sync-conflict.spec.ts | PASS      | 0.50s  |
| 57  | writes the person version and raises no further notice                     | sync-conflict.spec.ts | PASS      | 2.03s  |
| 58  | applies the file again once it is valid and clears the message             | sync-invalid.spec.ts  | PASS      | 0.40s  |
| 59  | does not write the map back while the person keeps typing                  | sync-invalid.spec.ts  | PASS      | 2.08s  |
| 60  | never applies content it cannot read                                       | sync-invalid.spec.ts  | PASS      | 1.44s  |
| 61  | offers to write a deleted map back and never writes nothing                | sync-invalid.spec.ts  | PASS      | 0.30s  |
| 62  | refuses a file that would lose a waypoint                                  | sync-invalid.spec.ts  | PASS      | 0.25s  |
| 63  | writes over a file that cannot be read                                     | sync-invalid.spec.ts  | PASS      | 0.28s  |
| 64  | announces an applied change without moving focus                           | sync-outside.spec.ts  | PASS      | 0.41s  |
| 65  | does nothing when the file is rewritten with the same content              | sync-outside.spec.ts  | PASS      | 0.81s  |
| 66  | keeps editing after the file is rewritten with the same content            | sync-outside.spec.ts  | PASS      | 1.68s  |
| 67  | reconciles once when the page becomes visible again                        | sync-outside.spec.ts  | PASS      | 0.23s  |
| 68  | settles five changes into the last state                                   | sync-outside.spec.ts  | PASS      | 0.23s  |
| 69  | shows an outside change within a second and keeps the person in place      | sync-outside.spec.ts  | PASS      | 0.46s  |
| 70  | keeps the map still when a field is cleared                                | sync-own.spec.ts      | PASS      | 2.60s  |
| 71  | keeps twenty undos after twenty saves                                      | sync-own.spec.ts      | PASS      | 2.42s  |
| 72  | shows nothing when the person saves                                        | sync-own.spec.ts      | PASS      | 2.07s  |
| 73  | follows a map added and removed in the folder                              | sync-rail.spec.ts     | PASS      | 0.58s  |
| 74  | keeps the open map open when another map appears                           | sync-rail.spec.ts     | PASS      | 0.41s  |
| 75  | does not follow a map it cannot write and follows it again after relinking | sync-readonly.spec.ts | PASS      | 3.03s  |
| 76  | opens a change stream for the open map                                     | sync.spec.ts          | PASS      | 0.20s  |
| 77  | follows the system theme while it is set to system                         | theme.spec.ts         | PASS      | 0.26s  |
| 78  | keeps a dialog and a tooltip on the dark surface                           | theme.spec.ts         | PASS      | 0.63s  |
| 79  | resolves every surface of the dark theme from tokens                       | theme.spec.ts         | PASS      | 0.39s  |

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
| 16  | dispatch lists every command in help                                                               | dispatch.test.ts           | PASS      | 0.00s |
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
| 46  | init changes no file on a second run                                                               | init.test.ts               | PASS      | 0.01s |
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
| 66  | map file slugs a display name                                                                      | map-file.test.ts           | PASS      | 0.01s |
| 67  | map file writes sorted collections and keeps stop order                                            | map-file.test.ts           | PASS      | 0.00s |
| 68  | external document drops a selection that no longer exists and clamps the step                      | map-store-external.test.ts | PASS      | 0.00s |
| 69  | external document drops a tour that no longer exists                                               | map-store-external.test.ts | PASS      | 0.00s |
| 70  | external document keeps the selection, the tour and the step that still exist                      | map-store-external.test.ts | PASS      | 0.00s |
| 71  | external document leaves the history it already had alone                                          | map-store-external.test.ts | PASS      | 0.00s |
| 72  | agent checks carries the same checks through --json                                                | mcp-doctor.test.ts         | PASS      | 0.00s |
| 73  | agent checks changes nothing on any run                                                            | mcp-doctor.test.ts         | PASS      | 0.01s |
| 74  | agent checks fails and names the fix when the command is gone                                      | mcp-doctor.test.ts         | PASS      | 0.00s |
| 75  | agent checks passes when the agent is connected and the command exists                             | mcp-doctor.test.ts         | PASS      | 0.00s |
| 76  | agent checks passes with a hint when the agent is not connected                                    | mcp-doctor.test.ts         | PASS      | 0.00s |
| 77  | agent checks reports a configuration it cannot read                                                | mcp-doctor.test.ts         | PASS      | 0.00s |
| 78  | agent checks says nothing about agents that are not on the machine                                 | mcp-doctor.test.ts         | PASS      | 0.00s |
| 79  | detection finds an agent by its configuration file                                                 | mcp-install.test.ts        | PASS      | 0.00s |
| 80  | detection finds an agent by its configuration folder                                               | mcp-install.test.ts        | PASS      | 0.00s |
| 81  | detection finds nothing on a machine without agents                                                | mcp-install.test.ts        | PASS      | 0.00s |
| 82  | JSON configuration adds the entry and keeps every other byte                                       | mcp-install.test.ts        | PASS      | 0.00s |
| 83  | JSON configuration adds the group when the file has none                                           | mcp-install.test.ts        | PASS      | 0.00s |
| 84  | JSON configuration creates the file when only the folder exists                                    | mcp-install.test.ts        | PASS      | 0.00s |
| 85  | JSON configuration reads back what it wrote                                                        | mcp-install.test.ts        | PASS      | 0.00s |
| 86  | JSON configuration replaces a stale entry in place                                                 | mcp-install.test.ts        | PASS      | 0.00s |
| 87  | JSON configuration reports a file it cannot read and leaves it alone                               | mcp-install.test.ts        | PASS      | 0.00s |
| 88  | JSON configuration touches nothing on a second run                                                 | mcp-install.test.ts        | PASS      | 0.00s |
| 89  | the configured command is an absolute path when the running file is one, otherwise the name        | mcp-install.test.ts        | PASS      | 0.00s |
| 90  | the install command connects every detected agent and tells the person to restart                  | mcp-install.test.ts        | PASS      | 0.00s |
| 91  | the install command exits 3 and still names the entry when a file cannot be read                   | mcp-install.test.ts        | PASS      | 0.00s |
| 92  | the install command prints the entries and writes nothing when no agent is present                 | mcp-install.test.ts        | PASS      | 0.00s |
| 93  | the install command says already connected on a second run                                         | mcp-install.test.ts        | PASS      | 0.00s |
| 94  | TOML configuration appends the block at the end                                                    | mcp-install.test.ts        | PASS      | 0.00s |
| 95  | TOML configuration does not append twice                                                           | mcp-install.test.ts        | PASS      | 0.00s |
| 96  | TOML configuration reads the block back                                                            | mcp-install.test.ts        | PASS      | 0.00s |
| 97  | TOML configuration refuses a file that writes mcp_servers inline                                   | mcp-install.test.ts        | PASS      | 0.00s |
| 98  | nothing leaves the machine imports no network client                                               | mcp-isolation.test.ts      | PASS      | 0.00s |
| 99  | nothing leaves the machine mentions no remote address                                              | mcp-isolation.test.ts      | PASS      | 0.00s |
| 100 | standard output belongs to the protocol does not log to the console                                | mcp-isolation.test.ts      | PASS      | 0.00s |
| 101 | standard output belongs to the protocol keeps the command layer out of the protocol output         | mcp-isolation.test.ts      | PASS      | 0.00s |
| 102 | standard output belongs to the protocol writes frames from one place only                          | mcp-isolation.test.ts      | PASS      | 0.00s |
| 103 | freePosition fills downwards before moving right                                                   | mcp-placement.test.ts      | PASS      | 0.00s |
| 104 | freePosition finds a slot between the waypoints of a 250-waypoint map                              | mcp-placement.test.ts      | PASS      | 0.00s |
| 105 | freePosition gives the same answer twice for the same map                                          | mcp-placement.test.ts      | PASS      | 0.00s |
| 106 | freePosition is not fooled by a waypoint drawn off the grid                                        | mcp-placement.test.ts      | PASS      | 0.00s |
| 107 | freePosition moves to the next column when the first is full                                       | mcp-placement.test.ts      | PASS      | 0.00s |
| 108 | freePosition never covers an existing waypoint                                                     | mcp-placement.test.ts      | PASS      | 0.00s |
| 109 | freePosition starts at the grid origin                                                             | mcp-placement.test.ts      | PASS      | 0.00s |
| 110 | handshake answers a notification with nothing                                                      | mcp-protocol.test.ts       | PASS      | 0.00s |
| 111 | handshake answers an unknown protocol version with the newest it knows                             | mcp-protocol.test.ts       | PASS      | 0.00s |
| 112 | handshake answers ping before initializing                                                         | mcp-protocol.test.ts       | PASS      | 0.00s |
| 113 | handshake declares tools without list changes                                                      | mcp-protocol.test.ts       | PASS      | 0.00s |
| 114 | handshake describes when to use each tool                                                          | mcp-protocol.test.ts       | PASS      | 0.00s |
| 115 | handshake echoes a protocol version it knows                                                       | mcp-protocol.test.ts       | PASS      | 0.00s |
| 116 | handshake lists nine tools in the contract order                                                   | mcp-protocol.test.ts       | PASS      | 0.00s |
| 117 | handshake names the loop, the types and the refusals in the instructions                           | mcp-protocol.test.ts       | PASS      | 0.00s |
| 118 | handshake refuses a line that is not JSON                                                          | mcp-protocol.test.ts       | PASS      | 0.00s |
| 119 | handshake refuses a request before initializing                                                    | mcp-protocol.test.ts       | PASS      | 0.00s |
| 120 | handshake refuses an unknown method by name                                                        | mcp-protocol.test.ts       | PASS      | 0.00s |
| 121 | handshake refuses an unknown tool by name                                                          | mcp-protocol.test.ts       | PASS      | 0.00s |
| 122 | handshake takes the instruction text from the module, not from inline prose                        | mcp-protocol.test.ts       | PASS      | 0.00s |
| 123 | handshake writes frames and nothing else to the output                                             | mcp-protocol.test.ts       | PASS      | 0.00s |
| 124 | list_projects answers with no projects on a fresh machine                                          | mcp-read.test.ts           | PASS      | 0.00s |
| 125 | list_projects lists a project whose folder is gone instead of hiding it                            | mcp-read.test.ts           | PASS      | 0.00s |
| 126 | list_projects names every project with its folder and maps                                         | mcp-read.test.ts           | PASS      | 0.02s |
| 127 | list_projects refuses a workspace file it cannot read instead of repairing it                      | mcp-read.test.ts           | PASS      | 0.00s |
| 128 | read_map opens the only map when none is named                                                     | mcp-read.test.ts           | PASS      | 0.00s |
| 129 | read_map reads a 250-waypoint map in under a second                                                | mcp-read.test.ts           | PASS      | 0.01s |
| 130 | read_map refuses a file that is not JSON instead of returning an empty map                         | mcp-read.test.ts           | PASS      | 0.00s |
| 131 | read_map refuses a folder that is gone                                                             | mcp-read.test.ts           | PASS      | 0.00s |
| 132 | read_map refuses a map that is not there                                                           | mcp-read.test.ts           | PASS      | 0.00s |
| 133 | read_map refuses an ambiguous project name                                                         | mcp-read.test.ts           | PASS      | 0.00s |
| 134 | read_map refuses to choose between several maps                                                    | mcp-read.test.ts           | PASS      | 0.00s |
| 135 | read_map returns the whole document and a state token                                              | mcp-read.test.ts           | PASS      | 0.00s |
| 136 | read_map says how many entries it could not represent                                              | mcp-read.test.ts           | PASS      | 0.00s |
| 137 | read_map works with no interface involved                                                          | mcp-read.test.ts           | PASS      | 0.02s |
| 138 | create_waypoint adds a waypoint with the given position                                            | mcp-write.test.ts          | PASS      | 0.02s |
| 139 | create_waypoint chooses a free slot when no position is given                                      | mcp-write.test.ts          | PASS      | 0.01s |
| 140 | create_waypoint keeps every other waypoint untouched                                               | mcp-write.test.ts          | PASS      | 0.01s |
| 141 | delete_waypoint takes links and tour stops with it and counts them                                 | mcp-write.test.ts          | PASS      | 0.02s |
| 142 | links connects two waypoints with a label                                                          | mcp-write.test.ts          | PASS      | 0.01s |
| 143 | links removes a link                                                                               | mcp-write.test.ts          | PASS      | 0.01s |
| 144 | refusals answers unchanged rather than refusing when the same content was written outside          | mcp-write.test.ts          | PASS      | 0.01s |
| 145 | refusals refuses a link from a waypoint to itself                                                  | mcp-write.test.ts          | PASS      | 0.00s |
| 146 | refusals refuses a link that is not there                                                          | mcp-write.test.ts          | PASS      | 0.01s |
| 147 | refusals refuses a path outside the project                                                        | mcp-write.test.ts          | PASS      | 0.00s |
| 148 | refusals refuses a stop on a waypoint that is not on the map                                       | mcp-write.test.ts          | PASS      | 0.00s |
| 149 | refusals refuses a write based on a stale reading and carries the current map                      | mcp-write.test.ts          | PASS      | 0.00s |
| 150 | refusals refuses an ambiguous label                                                                | mcp-write.test.ts          | PASS      | 0.00s |
| 151 | refusals refuses an empty label                                                                    | mcp-write.test.ts          | PASS      | 0.00s |
| 152 | refusals refuses an empty tour name                                                                | mcp-write.test.ts          | PASS      | 0.00s |
| 153 | refusals refuses an unknown tour                                                                   | mcp-write.test.ts          | PASS      | 0.01s |
| 154 | refusals refuses an unknown type and lists the ten                                                 | mcp-write.test.ts          | PASS      | 0.00s |
| 155 | refusals refuses an unknown waypoint                                                               | mcp-write.test.ts          | PASS      | 0.00s |
| 156 | refusals refuses an update with no fields                                                          | mcp-write.test.ts          | PASS      | 0.00s |
| 157 | refusals refuses the same waypoint twice in one tour                                               | mcp-write.test.ts          | PASS      | 0.01s |
| 158 | tours clears the stops when the list is empty                                                      | mcp-write.test.ts          | PASS      | 0.00s |
| 159 | tours creates a tour and sets its stops in order                                                   | mcp-write.test.ts          | PASS      | 0.01s |
| 160 | update_waypoint changes only the fields named                                                      | mcp-write.test.ts          | PASS      | 0.00s |
| 161 | update_waypoint clears a field sent as null                                                        | mcp-write.test.ts          | PASS      | 0.01s |
| 162 | update_waypoint does not rewrite the file when nothing changes                                     | mcp-write.test.ts          | PASS      | 0.02s |
| 163 | update_waypoint finds a waypoint by its exact label                                                | mcp-write.test.ts          | PASS      | 0.00s |
| 164 | writes stay inside the project changes nothing outside the map folder                              | mcp-write.test.ts          | PASS      | 0.01s |
| 165 | writes stay inside the project writes twenty times in a row                                        | mcp-write.test.ts          | PASS      | 0.14s |
| 166 | nothing leaves the machine imports no network client                                               | no-network.test.ts         | PASS      | 0.00s |
| 167 | nothing leaves the machine mentions no remote address                                              | no-network.test.ts         | PASS      | 0.00s |
| 168 | nothing leaves the machine only ever talks to loopback                                             | no-network.test.ts         | PASS      | 0.00s |
| 169 | address selection fails when the whole range is taken                                              | port.test.ts               | PASS      | 0.00s |
| 170 | address selection skips an address that is taken                                                   | port.test.ts               | PASS      | 0.00s |
| 171 | address selection skips several taken addresses                                                    | port.test.ts               | PASS      | 0.00s |
| 172 | address selection takes the first free address                                                     | port.test.ts               | PASS      | 0.01s |
| 173 | workspace registry clamps an out-of-range step to zero on read                                     | registry.test.ts           | PASS      | 0.00s |
| 174 | workspace registry makes ids unique without clobbering an existing one                             | registry.test.ts           | PASS      | 0.00s |
| 175 | workspace registry recovers from unparseable content without overwriting it                        | registry.test.ts           | PASS      | 0.00s |
| 176 | workspace registry registers a project with a slugged unique id                                    | registry.test.ts           | PASS      | 0.00s |
| 177 | workspace registry returns the existing entry when the same path is registered twice               | registry.test.ts           | PASS      | 0.00s |
| 178 | workspace registry starts empty when there is no file                                              | registry.test.ts           | PASS      | 0.00s |
| 179 | workspace registry stores the last view and drops it with its project                              | registry.test.ts           | PASS      | 0.00s |
| 180 | workspace registry writes atomically and leaves no temporary behind                                | registry.test.ts           | PASS      | 0.00s |
| 181 | isWithinHome accepts an ancestor of home so browsing can reach the root                            | safe-path.test.ts          | PASS      | 0.00s |
| 182 | isWithinHome accepts the home directory and its children                                           | safe-path.test.ts          | PASS      | 0.00s |
| 183 | isWithinHome rejects an unrelated branch                                                           | safe-path.test.ts          | PASS      | 0.00s |
| 184 | resolveInside accepts a plain child                                                                | safe-path.test.ts          | PASS      | 0.00s |
| 185 | resolveInside accepts an absolute path inside the root                                             | safe-path.test.ts          | PASS      | 0.00s |
| 186 | resolveInside accepts the root itself                                                              | safe-path.test.ts          | PASS      | 0.00s |
| 187 | resolveInside does not confuse a sibling with a shared prefix                                      | safe-path.test.ts          | PASS      | 0.00s |
| 188 | resolveInside follows a symlink that leaves the root                                               | safe-path.test.ts          | PASS      | 0.00s |
| 189 | resolveInside rejects an absolute path outside the root                                            | safe-path.test.ts          | PASS      | 0.00s |
| 190 | resolveInside rejects parent traversal                                                             | safe-path.test.ts          | PASS      | 0.00s |
| 191 | resolveInside rejects traversal hidden in the middle                                               | safe-path.test.ts          | PASS      | 0.00s |
| 192 | serve target finds the project by id                                                               | serve.test.ts              | PASS      | 0.00s |
| 193 | serve target finds the project by path                                                             | serve.test.ts              | PASS      | 0.00s |
| 194 | serve target finds the project of the current folder                                               | serve.test.ts              | PASS      | 0.01s |
| 195 | serve target opens the workspace screen when the folder is not a project                           | serve.test.ts              | PASS      | 0.00s |
| 196 | serve target refuses an unknown project                                                            | serve.test.ts              | PASS      | 0.00s |
| 197 | serve target writes nothing                                                                        | serve.test.ts              | PASS      | 0.00s |
| 198 | serving builds the map address for a project                                                       | serve.test.ts              | PASS      | 0.00s |
| 199 | serving prints the address once the server answers and stops the child                             | serve.test.ts              | PASS      | 0.00s |
| 200 | server lifecycle becomes ready only after a successful answer                                      | server.test.ts             | PASS      | 0.01s |
| 201 | server lifecycle kills a child that ignores the signal                                             | server.test.ts             | PASS      | 0.03s |
| 202 | server lifecycle points at the standalone entry                                                    | server.test.ts             | PASS      | 0.00s |
| 203 | server lifecycle reports a server that never answers                                               | server.test.ts             | PASS      | 0.06s |
| 204 | server lifecycle resolves at once for a child that already exited                                  | server.test.ts             | PASS      | 0.00s |
| 205 | server lifecycle starts the standalone server on loopback with the chosen port                     | server.test.ts             | PASS      | 0.00s |
| 206 | server lifecycle stops the child on a signal and waits for it                                      | server.test.ts             | PASS      | 0.00s |
| 207 | status rows marks a folder that moved away                                                         | status.test.ts             | PASS      | 0.00s |
| 208 | status rows reports a workspace file that cannot be parsed                                         | status.test.ts             | PASS      | 0.00s |
| 209 | status rows reports an empty workspace                                                             | status.test.ts             | PASS      | 0.00s |
| 210 | status rows reports an unreadable map without partial counts                                       | status.test.ts             | PASS      | 0.00s |
| 211 | status rows reports every project with its counts                                                  | status.test.ts             | PASS      | 0.02s |
| 212 | status rows reports six projects in under two seconds                                              | status.test.ts             | PASS      | 0.01s |
| 213 | status rows serialises rows for scripts                                                            | status.test.ts             | PASS      | 0.00s |
| 214 | sync events names every kind once                                                                  | sync-events.test.ts        | PASS      | 0.00s |
| 215 | sync events reads a changed map                                                                    | sync-events.test.ts        | PASS      | 0.00s |
| 216 | sync events reads a changed map list                                                               | sync-events.test.ts        | PASS      | 0.00s |
| 217 | sync events reads an unreadable file and a missing file                                            | sync-events.test.ts        | PASS      | 0.00s |
| 218 | sync events refuses what it cannot understand                                                      | sync-events.test.ts        | PASS      | 0.00s |
| 219 | unreadable and missing files applies the file again once it can be read                            | sync-invalid.test.ts       | PASS      | 0.08s |
| 220 | unreadable and missing files reports a file that is not there when the stream opens                | sync-invalid.test.ts       | PASS      | 0.30s |
| 221 | unreadable and missing files reports a missing file once when it had content before                | sync-invalid.test.ts       | PASS      | 0.38s |
| 222 | unreadable and missing files reports one unreadable state per attempt and never the content        | sync-invalid.test.ts       | PASS      | 0.95s |
| 223 | sync stays on this machine describes events with no field beyond the contract                      | sync-local.test.ts         | PASS      | 0.00s |
| 224 | sync stays on this machine imports nothing that can reach another host                             | sync-local.test.ts         | PASS      | 0.00s |
| 225 | own writes delivers a write that no record covers                                                  | sync-own-write.test.ts     | PASS      | 0.04s |
| 226 | own writes delivers an external change that follows an own write at once                           | sync-own-write.test.ts     | PASS      | 0.30s |
| 227 | own writes records the newest text per file                                                        | sync-own-write.test.ts     | PASS      | 0.01s |
| 228 | comparison fallback delivers a change when the watcher never reports                               | sync-poll.test.ts          | PASS      | 0.17s |
| 229 | comparison fallback delivers one update however many ticks pass                                    | sync-poll.test.ts          | PASS      | 0.46s |
| 230 | comparison fallback does not go back to watching after falling back                                | sync-poll.test.ts          | PASS      | 0.15s |
| 231 | comparison fallback reports a change when the filesystem reports nothing                           | sync-poll.test.ts          | PASS      | 0.16s |
| 232 | comparison fallback settles several changes into the last state                                    | sync-poll.test.ts          | PASS      | 0.36s |
| 233 | comparison fallback stops comparing when the last subscription closes                              | sync-poll.test.ts          | PASS      | 0.25s |
| 234 | sync watcher collapses five changes into one settled update                                        | sync-watch.test.ts         | PASS      | 0.47s |
| 235 | sync watcher delivers a change made to the open map                                                | sync-watch.test.ts         | PASS      | 0.06s |
| 236 | sync watcher does not deliver a write this process made                                            | sync-watch.test.ts         | PASS      | 0.34s |
| 237 | sync watcher does not deliver an own write that normalises differently                             | sync-watch.test.ts         | PASS      | 0.40s |
| 238 | sync watcher keeps one watcher until the last subscription closes                                  | sync-watch.test.ts         | PASS      | 0.35s |
| 239 | sync watcher refuses an unreadable file and reports it once per attempt                            | sync-watch.test.ts         | PASS      | 0.46s |
| 240 | sync watcher reports a delivered file that disappears once                                         | sync-watch.test.ts         | PASS      | 0.39s |
| 241 | sync watcher says nothing when the content is identical                                            | sync-watch.test.ts         | PASS      | 0.60s |
| 242 | target resolution recognises a worktree, where .git is a file                                      | target.test.ts             | PASS      | 0.00s |
| 243 | target resolution refuses a folder outside home                                                    | target.test.ts             | PASS      | 0.00s |
| 244 | target resolution refuses a map folder that is a file                                              | target.test.ts             | PASS      | 0.00s |
| 245 | target resolution refuses a map folder without write permission                                    | target.test.ts             | PASS      | 0.00s |
| 246 | target resolution refuses a path that does not exist                                               | target.test.ts             | PASS      | 0.00s |
| 247 | target resolution refuses a path that is a file                                                    | target.test.ts             | PASS      | 0.00s |
| 248 | target resolution refuses the home folder                                                          | target.test.ts             | PASS      | 0.00s |
| 249 | target resolution takes the folder itself when there is no repository                              | target.test.ts             | PASS      | 0.00s |
| 250 | target resolution walks up to the repository root                                                  | target.test.ts             | PASS      | 0.01s |
| 251 | design tokens defines the same colour tokens in both themes                                        | theme-contrast.test.ts     | PASS      | 0.00s |
| 252 | design tokens meets 3:1 for interactive borders in dark                                            | theme-contrast.test.ts     | PASS      | 0.00s |
| 253 | design tokens meets 3:1 for interactive borders in light                                           | theme-contrast.test.ts     | PASS      | 0.00s |
| 254 | design tokens meets AA for text pairs in dark                                                      | theme-contrast.test.ts     | PASS      | 0.00s |
| 255 | design tokens meets AA for text pairs in light                                                     | theme-contrast.test.ts     | PASS      | 0.00s |
| 256 | tour validation accepts a name                                                                     | validation.test.ts         | PASS      | 0.00s |
| 257 | tour validation refuses an empty name                                                              | validation.test.ts         | PASS      | 0.00s |
| 258 | waypoint validation accepts a plain label and a relative path                                      | validation.test.ts         | PASS      | 0.00s |
| 259 | waypoint validation checks nothing it was not given                                                | validation.test.ts         | PASS      | 0.00s |
| 260 | waypoint validation refuses an absolute path                                                       | validation.test.ts         | PASS      | 0.00s |
| 261 | waypoint validation refuses an empty label                                                         | validation.test.ts         | PASS      | 0.00s |

### Сводка

| Показатель           | Значение |
| -------------------- | -------- |
| Всего                | 340      |
| PASS                 | 340      |
| FAIL                 | 0        |
| SKIP                 | 0        |
| Время (сумма тестов) | 141.21s  |
| Приёмочные           | 79       |
| Юнит + CLI           | 261      |

### Падения

нет

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
