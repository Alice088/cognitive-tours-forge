# Specification Quality Checklist: A tour that reads like a tour

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-16
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Validation Notes

### Content Quality

| Item                                   | Verdict | Evidence                                                                                                                                                                                                                |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No implementation details              | PASS    | The spec names no language, framework, component, file or route. Surfaces are named by role: "reading surface", "tool strip", "dock", "inspector". FR-015 forbids a behaviour ("float above the map"), not a technique. |
| Focused on user value                  | PASS    | Each story states who reads what and why: US1 "a tour is a list of highlighted boxes with no voice", US2 "a control that hides the thing it acts on", US3 "reading is how a tour is reviewed and shared".               |
| Written for non-technical stakeholders | PASS    | No term from the codebase appears; the vocabulary is tour, stop, narration, map, tool strip, inspector.                                                                                                                 |
| All mandatory sections completed       | PASS    | User Scenarios & Testing, Requirements, Success Criteria, Assumptions, Edge Cases are all filled; no placeholder text remains.                                                                                          |

### Requirement Completeness

| Item                                    | Verdict | Evidence                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No [NEEDS CLARIFICATION]                | PASS    | The two decisions that could have been open were resolved by informed guesses and recorded as assumptions: the narration is primary and the description secondary; the surface is a compact card over the map on wide windows and a bottom panel on narrow ones.                    |
| Requirements are testable               | PASS    | Every FR states an observable outcome: FR-002 lists the four things shown, FR-005 forbids a second surface, FR-008 names the recovery control and how long dismissal holds, FR-017 pins the disabled state to today's conditions, FR-022 forbids a written change and an undo step. |
| Success criteria measurable             | PASS    | SC-001 100% of narrated stops, SC-002 forty stops in one scroll-through, SC-003 four corners with zero overlap, SC-004 1280 px / 768 px / one interaction, SC-005 same interaction with no empty frame, SC-007 the product's own enforced contrast ratio.                           |
| Success criteria technology-agnostic    | PASS    | No timing internal, no framework metric; the measurements are counts, viewport widths, interactions and a contrast ratio.                                                                                                                                                           |
| Acceptance scenarios defined            | PASS    | US1 seven scenarios, US2 five, US3 four — each Given/When/Then, each checkable by hand.                                                                                                                                                                                             |
| Edge cases identified                   | PASS    | Eight edge cases: empty tour, whitespace narration, read-only copy, forty long stops, switching tours, narrow window with two panels, editing versus reading, unrelated selection.                                                                                                  |
| Scope clearly bounded                   | PASS    | Assumptions fix the boundary: same two operations, only moved; the map's zoom controls stay; tour authoring stays in the editor; the surface is a card, not a route.                                                                                                                |
| Dependencies and assumptions identified | PASS    | Seven assumptions covering the voice of the tour, the shape of the surface, unchanged tour controls, unchanged zoom controls, unchanged operations, narration as prose, reading versus authoring.                                                                                   |

### Feature Readiness

| Item                               | Verdict | Evidence                                                                                                                                                                                                     |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRs have clear acceptance criteria | PASS    | FR-001–FR-010 are covered by US1's eight scenarios, FR-011–FR-014 by US3's four, FR-015–FR-020 by US2's five, FR-021–FR-027 by the edge cases plus US1 scenarios 7 and 8, US2 scenario 5 and US3 scenario 2. |
| User scenarios cover primary flows | PASS    | Walking a tour (US1), reading a tour whole (US3), using the map's own actions at any width (US2).                                                                                                            |
| Feature meets measurable outcomes  | PASS    | SC-001–SC-007 map onto the three stories: readability without the inspector, one-piece reading, no overlap at any corner.                                                                                    |
| No implementation details leak     | PASS    | Checked line by line: no file path, no state library, no component name, no API, no CSS utility.                                                                                                             |

### Constitution Cross-Check

| Principle                              | Verdict | Evidence                                                                                                                 |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| I. Local First                         | PASS    | Nothing in the spec reaches the network; FR-022 forbids writing to the document at all while reading.                    |
| II. The Map Lives With the Code        | PASS    | The narration read here is the narration already in the map file; no new field is introduced.                            |
| III. One Command to Start              | PASS    | No new command, service or setup step is required by any requirement.                                                    |
| IV. Agent Access Through MCP           | PASS    | No capability is added or changed; the map the person reads is the map the agent writes.                                 |
| V. Understanding Stays With the Person | PASS    | US1's whole point: the author's reasoning reaches the reader instead of being hidden behind the inspector.               |
| VI. The Interface Is the Product       | PASS    | FR-019, FR-023, FR-025, FR-026 and SC-007 hold the interface to keyboard reach, theme contrast and assistive technology. |

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`.
- All 16 items pass on the first iteration; no spec rewrite was needed.
- Re-validated after the clarification session of 2026-11-16: five answers (card anchored bottom-left, arrows step the walk, actions in the top row, card opens by itself and dismissal holds, whole tour becomes a left-edge panel) changed requirements but no verdict. 16/16 → 16/16.
- Re-validated after the SatisFix verification of 2026-11-16: FR-009 now lets the card take the nearest
  free corner instead of promising a corner it could not keep, FR-027 says the selection follows the
  step, and SC-003 names the no-tour case so the reading surface is not counted as a floating control.
  Three edge cases became requirements with teeth: a tour with no stops, the card never covering the
  focused stop, and forty narrated stops in one scroll. 16/16 → 16/16.
