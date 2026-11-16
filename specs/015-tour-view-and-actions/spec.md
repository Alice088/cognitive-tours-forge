# Feature Specification: A tour that reads like a tour

**Feature Branch**: `015-tour-view-and-actions`

**Created**: 2026-11-16

**Status**: Draft

## Clarifications

### Session 2026-11-16

- Q: Где должна стоять карточка чтения на широком окне? → A: Плавающая карточка в левом нижнем углу карты, фиксированная максимальная ширина, над доком; центр карты и сфокусированный стоп остаются свободными.
- Q: Как листать тур с клавиатуры? → A: Стрелки влево и вправо переводят прогулку на предыдущий и следующий стоп, пока тур читается.
- Q: В какую строку интерфейса переезжают «Save a copy» и «Export all maps»? → A: В верхнюю строку, справа от поля поиска, как часть строки.
- Q: Должна ли карточка открываться сама и как долго держится её закрытие? → A: Открывается сама при выборе тура и при каждом шаге; закрытие держится до конца работы с этим туром, пока её не вернут кнопкой; выбор другого тура открывает снова.
- Q: Как выглядит чтение всего тура? → A: Та же поверхность раскрывается в панель на всю высоту левого края карты со своей прокруткой; карта сжимается вправо и остаётся видна.

### Session 2026-11-16 (verification)

- Q: Что делать, если сфокусированный стоп оказывается в левом нижнем углу под карточкой? → A: Карточка переезжает в ближайший свободный угол; карта при этом не панорамируется и не зумится.
- Q: Меняет ли стрелка выделение на карте? → A: Стрелка двигает прогулку, и выделение следует за новым стопом — ровно так же, как от кнопок шага; ничего другого стрелка не делает.
- Q: Что показывает поверхность чтения для тура без стопов? → A: Она показывается и говорит, что стопов нет, и указывает на редактирование тура.

**Input**: User description: "нужно еще добавить чтобы просмотр ощущался больше как просмотр тура а не просто в инспекторе показывает дискрипшион, нужно как-то это получше реализовать чтобы может pop up либо что-то покрассиее. и еще есть кнопки Save a copy и export all maps они закрывают интерфейс"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A stop carries its own words (Priority: P1)

A person picks a tour and walks it stop by stop. For every stop, the words the tour author wrote for that stop appear in front of them as a small reading card — who or what the stop is about, where they are in the walk, and the narration in full. The waypoint's own description is still there, but underneath, as the detail it is. The map stays visible behind the card, and nothing has to be selected in the inspector for the tour to make sense.

**Why this priority**: Today the narration is invisible while walking. The inspector shows the waypoint's description, so a person reads what the code is, never why the author brought them to it. Without this, a tour is a list of highlighted boxes with no voice.

**Independent Test**: Open a map with a tour whose stops carry narration, pick the tour, and press Next through every stop. Every narration is readable on screen without opening the inspector, changing stop swaps the text in the same card, and the map is still visible.

**Acceptance Scenarios**:

1. **Given** a tour with narration on its stops, **When** the person selects the tour, **Then** a reading card shows the first stop: its position in the tour, the waypoint's label and type, and the narration in full.
2. **Given** the reading card is showing a stop, **When** the person moves to the next or previous stop, **Then** the card shows the new stop's words without closing, and the map focuses the new stop.
3. **Given** a stop has both a narration and a waypoint description, **When** the card is read, **Then** the narration is the main text and the description appears below it under its own heading.
4. **Given** a stop has no narration, **When** the person reaches it, **Then** the card still appears with the waypoint's label, type and description, and says plainly that this stop has no narration yet.
5. **Given** the reading card is open, **When** the person dismisses it, **Then** the tour stays selected, the map keeps its focus, and a control in the tool strip brings the card back.
6. **Given** the person is reading a stop, **When** they press Next repeatedly, **Then** no more than one card is ever on screen and the previous text never flashes or stacks.
7. **Given** a narration longer than the card, **When** it is shown, **Then** the card scrolls and the full text is reachable; nothing is truncated with an ellipsis.
8. **Given** a tour is being read, **When** the person presses the right arrow, **Then** the walk moves to the next stop and the card shows its words; pressing the left arrow moves the walk back the same way.

---

### User Story 2 - The map's own actions stop covering the map (Priority: P2)

The two map actions — saving a copy of this map, and exporting every map of the project — are reachable from the tool strip, in the same row as the other controls. They never sit on top of the map, never hide a waypoint, and never swallow a click meant for the canvas.

**Why this priority**: The actions currently float above the top-right corner of the map. They cover whichever waypoint is drawn there, intercept drags near it, and on a narrow window they overlap the search field. A control that hides the thing it acts on is a defect, not a preference.

**Independent Test**: Open any map, and check that the top-right corner of the map shows map content only: no floating bar, no obscured waypoint, and a waypoint dragged into that corner stays visible and draggable. Both actions remain usable from the tool strip at every window width.

**Acceptance Scenarios**:

1. **Given** any map, **When** it opens, **Then** no control floats over the map area; every action lives in the tool strip or the dock.
2. **Given** a waypoint placed in the map's top-right corner, **When** the map is shown, **Then** the whole waypoint is visible and can be dragged.
3. **Given** the tool strip, **When** the person looks for the two actions, **Then** both are reachable there with the names "Save a copy" and "Export all maps", and each is disabled exactly when its work is impossible.
4. **Given** a narrow window, **When** the tool strip runs out of room, **Then** the actions stay reachable through one overflow control instead of shrinking the search field to nothing.
5. **Given** a keyboard-only person, **When** they tab through the tool strip, **Then** both actions are reached in a fixed order with visible focus, and map content is never focused behind them.

---

### User Story 3 - A tour can be read end to end (Priority: P3)

Someone who does not want to click through a walk asks for the whole tour and reads it as one piece: every stop in order, each with its narration, each still tied to its place on the map. Picking a stop in that list puts the walk there.

**Why this priority**: Reading is how a tour is reviewed and shared. Clicking is one way through; reading the whole thing is the other, and today it produces a map with everything highlighted and no words.

**Independent Test**: Open a tour of at least four stops, ask for the whole tour, and read every narration in order in one surface; choosing the third stop moves the walk to that stop and shows its card.

**Acceptance Scenarios**:

1. **Given** a selected tour, **When** the person asks for the whole tour, **Then** every stop appears in order with its narration in a panel along the left edge of the map, scrollable as one piece, with the map still visible beside it.
2. **Given** the whole-tour reading, **When** the person chooses one stop, **Then** the walk moves to that stop, its card is shown, and the map focuses it.
3. **Given** a tour where no stop has narration, **When** the whole tour is asked for, **Then** the stops are still listed with their labels and types, and the surface says once that this tour has no narration yet.
4. **Given** the whole-tour reading, **When** the person is done, **Then** leaving it returns to the single-stop card at the stop they were reading.

---

### Edge Cases

- A tour with no stops at all: the card does not pretend to show a stop; it says the tour is empty and points at editing it.
- A stop whose narration is only whitespace: treated as no narration, not as a blank line.
- A map open as a travelled copy (read-only): every narration is readable, every editing control is absent, and the card never offers to change the tour.
- A tour with forty stops and paragraph-long narration at each: the surface stays responsive, and reaching the last stop is still fast.
- Two tours in one map: switching tours shows the first stop of the new tour, never the step number of the old one.
- A window so narrow that the card and the inspector would both want the screen: only one is shown, and the other is one control away.
- A person editing a tour: editing stays where tour editing lives, and the reading card does not fight the editor for the same screen area.
- A waypoint selected while a tour is being read: the card is about the tour, so the card does not change because of an unrelated selection.

## Requirements _(mandatory)_

### Functional Requirements

**Reading a stop**

- **FR-001**: While a tour is selected, the current stop MUST be presented in a dedicated reading surface that is part of the map screen, not only in the inspector.
- **FR-002**: The reading surface MUST show, for the current stop, the stop's position in the tour (for example "Stop 3 of 7"), the waypoint's label, the waypoint's type, and the narration in full.
- **FR-003**: The reading surface MUST show the waypoint's description as secondary text under its own heading, and MUST NOT replace the narration with it.
- **FR-004**: A stop without narration MUST still be presented, with the waypoint's label, type and description, and one plain sentence stating that this stop has no narration.
- **FR-005**: Moving to the next or previous stop MUST replace the content of the reading surface in place, without closing it, without a page reload, and without a second surface appearing.
- **FR-006**: The reading surface MUST open by itself when a tour is selected and again after every move to another stop.
- **FR-007**: The reading surface MUST be dismissible; dismissing it MUST keep the tour selected and the step unchanged.
- **FR-008**: One control in the tool strip MUST bring a dismissed reading surface back for the current stop, and dismissal MUST hold for the rest of the work on that tour: later steps MUST NOT re-open it.
- **FR-009**: On a wide window the single-stop reading surface MUST sit in the bottom-left corner of the map with a fixed maximum width and above the dock; read whole, it takes the wider place FR-011 gives it. It MUST never cover the focused stop: when that stop falls under the corner it starts in, the surface takes the nearest other corner that leaves the stop and its immediate neighbours clear. Either way its appearance MUST NOT pan or zoom the map.
- **FR-010**: Text longer than the surface MUST scroll inside it; the narration MUST NOT be truncated with an ellipsis or cut at a fixed number of lines.

**Reading a whole tour**

- **FR-011**: The person MUST be able to ask for the whole tour and read every stop in order in one surface, each stop with its label, its type and its narration; in that mode the surface MUST expand into a panel along the left edge of the map, filling the map's height, and the map MUST shrink to the right of it and stay visible.
- **FR-012**: Choosing a stop in the whole-tour reading MUST move the walk to that stop and show that stop's single-stop card.
- **FR-013**: A tour whose stops carry no narration MUST be readable as a list of labels and types, with one sentence saying the tour has no narration yet.
- **FR-014**: Leaving the whole-tour reading MUST return to the single-stop card at the stop the person was reading.

**Where the map actions live**

- **FR-015**: No control for saving a copy of a map or exporting a project's maps may float above the map area.
- **FR-016**: Both actions MUST be reachable from the top row of the map screen, to the right of the search field and as part of that row rather than above the map, keeping the names "Save a copy" and "Export all maps".
- **FR-017**: The disabled state of each action MUST continue to follow the same conditions as today: each is unavailable exactly when its work cannot be done.
- **FR-018**: At narrow widths the actions MUST remain reachable through one overflow control in that same row; the search field MUST keep a usable width.
- **FR-019**: Both actions MUST be reachable and operable from the keyboard alone, in a stable order, with visible focus.
- **FR-020**: No part of the top row or dock may overlap the map content, the zoom controls, the reading surface, or the inspector.

**Consistency**

- **FR-021**: The reading surface MUST be usable on a map opened as a travelled copy: readable, with every editing control absent.
- **FR-022**: Reading a tour MUST NOT change the document: no waypoint, stop, narration or position is written, and no undo step is created.
- **FR-023**: The reading surface MUST follow the theme: readable foreground and background contrast in both the light and the dark theme.
- **FR-024**: Switching tours MUST show the first stop of the newly chosen tour, and MUST open the reading surface again even if it was dismissed for the previous tour.
- **FR-025**: The reading surface MUST announce changes to assistive technology: the stop number and the waypoint label are exposed as text, and the surface is reachable and dismissible by keyboard.
- **FR-026**: While a tour is being read, the left and right arrow keys MUST move the walk to the previous and next stop, with the same result as the on-screen step controls; at the first stop the left arrow does nothing and at the last stop the right arrow does nothing.
- **FR-027**: While a tour is being read, the arrow keys MUST move the walk and nothing beyond it: the selection follows the new stop exactly as it does when the on-screen step controls are used, and no second thing happens. On a map with no tour being read the arrow keys MUST keep the behaviour they have today.

### Key Entities

- **Tour stop**: one step of a tour — a waypoint, an optional narration, and an implicit position in the ordered list of stops.
- **Reading surface**: the place a stop's words are presented — showing one stop, or the whole tour as an ordered read.
- **Map action**: an operation offered for the open map or for the whole project, with a name, an available-or-not state, and one home in the interface.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For every stop of a tour that has narration, the narration is on screen with no click beyond selecting the tour and stepping — that is, 100% of narrated stops are readable without opening the inspector.
- **SC-002**: Reading a whole tour of forty narrated stops takes one scroll-through with no more than forty discrete stops listed, and reveals every narration.
- **SC-003**: In any map with no tour being read, zero controls overlap the map content: a waypoint placed in each of the four corners is fully visible and draggable. While a tour is read, the reading surface is the only overlay, and it keeps the focused stop clear.
- **SC-004**: With the map open at 1280 px wide or wider, both map actions are visible without opening a menu; below 768 px they are reachable in at most one extra interaction.
- **SC-005**: Moving between stops shows the new words within the same interaction — no spinner, no empty frame, and no visible re-layout of the map.
- **SC-006**: A person who has never seen the product can, without instruction, tell what a tour is about after reading two stops, measured by the narration being visible in the same screen as the map.
- **SC-007**: Contrast between the reading surface's text and its background meets the same measurable ratio the product already enforces for its text, in both themes.

## Assumptions

- The narration authored for a stop is the voice of the tour; a waypoint's description stays what the waypoint is. The two are never merged into one paragraph.
- The reading surface is a compact card in the map's bottom-left corner on wide windows — fixed maximum width, above the dock, moving to the nearest other corner when the focused stop would fall under it — and a bottom panel on narrow ones. Read whole, that same surface becomes a panel along the left edge, full height, and the map shrinks beside it. It never becomes a separate page or a route of its own.
- Existing tour controls — selecting a tour, previous, next, whole tour, edit tour, undo, redo, save status — keep their names, positions in the dock, and behaviour.
- The map's zoom controls keep their place; only the two floating actions move — into the top row, to the right of the search field.
- The two actions stay the same operations they are today; this feature moves them and does not change what they do or how a copy is written.
- A tour's narration is displayed as written, without interpreting markup, since the product already treats a narration as prose.
- Reading surfaces are for reading; authoring a narration remains the job of the tour editor.
