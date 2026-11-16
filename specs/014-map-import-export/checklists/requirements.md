# Specification Quality Checklist: Maps in and out

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

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`

### Validation pass, iteration 1

| #   | Item                         | Result | Evidence                                                                                                                                                                                                                                                                                            |
| --- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No implementation details    | PASS   | The spec names files, folders, counts and outcomes. No framework, protocol, route or library is named. "JSON" appears only as the format of the file the person handles, not as a mechanism.                                                                                                        |
| 2   | User value first             | PASS   | Each story states the cost today: copying by hand, an import that quietly loses half a map, re-adding projects after a move, one map at a time when there are four.                                                                                                                                 |
| 3   | Non-technical reader         | PASS   | Every requirement is phrased as an outcome on a file, a rail entry or a sentence the person reads.                                                                                                                                                                                                  |
| 4   | Mandatory sections           | PASS   | User Scenarios & Testing, Requirements, Success Criteria, Assumptions all present; Edge Cases filled with ten concrete situations.                                                                                                                                                                  |
| 5   | No [NEEDS CLARIFICATION]     | PASS   | Three decisions that could have been questions are resolved and recorded in Assumptions: files are chosen from the home folder, copies are delivered through the browser's saving, the map format version does not change.                                                                          |
| 6   | Testable and unambiguous     | PASS   | Every FR carries a number, a name, or a sentence that can be asserted. FR-003, FR-011, FR-012 and FR-021 all say "nothing is written", which is verified by comparing the folder before and after.                                                                                                  |
| 7   | Success criteria measurable  | PASS   | SC-001 and SC-006 carry time limits; SC-002, SC-003, SC-004 and SC-005 carry percentages and exact counts; SC-008 carries a task completion time.                                                                                                                                                   |
| 8   | Technology-agnostic criteria | PASS   | No criterion names a tool, a protocol or a component. SC-002 says "identical", SC-005 says "identical to the byte" — both verifiable without knowing how.                                                                                                                                           |
| 9   | Acceptance scenarios         | PASS   | Four stories carry 18 scenarios between them, each in Given/When/Then form with a perceivable result.                                                                                                                                                                                               |
| 10  | Edge cases                   | PASS   | Naming that does not fit, unsupported size, duplicate identifiers, absolute paths, an open map during an import, case-only name differences, a failed write, an unusable folder, an interrupted set import, an unreachable project on export, a folder whose maps differ from the travelled copies. |
| 11  | Scope bounded                | PASS   | "What travels" is a map file and a workspace file. Out of scope, by absence and by assumption: remote sharing, accounts, permissions, format conversion, the browser's own file picker, any change to the map format.                                                                               |
| 12  | Dependencies and assumptions | PASS   | Ten assumptions name the existing browsing limit, the delivery route, the version rule, the meaning of last known copies, and the sharing model.                                                                                                                                                    |

### Consistency check against the rest of the system

- **Principle I (everything local)** — nothing in the spec introduces a server, an account or an upload; the workspace file is a file the person carries.
- **Principle II (the map lives in the repository)** — import writes only inside `.ctour/` of the chosen project (FR-014, FR-027); export never writes outside it.
- **Principle V (nothing decides for the person)** — FR-009, FR-013, FR-019, FR-025: every overwrite, every dropped entry and every folder match is confirmed or skipped by name, never assumed.
- **Principle VI (the interface is the product)** — FR-016, FR-028, FR-029: every outcome is a sentence in the product's language.
