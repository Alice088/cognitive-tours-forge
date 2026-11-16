<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1
Bump rationale: PATCH. The map folder was renamed from `.tours/` to `.ctour/` in
feature `012-ctour-cli`, so one name covers both the repository artefact and the
machine-local workspace. No principle or rule changed; only the path in
Principle II moved.

Modified principles: none (no principles were previously defined)
Added principles:
  - I. Local First (NON-NEGOTIABLE)
  - II. The Map Lives With the Code
  - III. One Command to Start
  - IV. Agent Access Through MCP
  - V. Understanding Stays With the Person
  - VI. The Interface Is the Product
Added sections:
  - Additional Constraints
  - Development Workflow
  - Governance
Removed sections: none
Deferred items: none
Template placeholders remaining: none
-->

# Cognitive Tours Constitution

## Core Principles

### I. Local First (NON-NEGOTIABLE)

Cognitive Tours runs on the user's machine, as an application the user starts
and stops.

- No hosted deployment, no per-team sites, no accounts, no login, no edit
  passcode.
- Every durable state MUST be a file on local disk that the user can read,
  diff, copy and back up. There is no remote database and no network call whose
  purpose is storing product data.
- Any feature that requires a server we operate is out of scope by definition.

Rationale: hosting forced a database, migrations, credentials and backup
scripts onto a tool whose subject is a single textual artifact. Disk is
already available and already versioned.

### II. The Map Lives With the Code

A map is a JSON file in the repository it describes.

- Location: `.ctour/<name>.tour.json`. One repository MAY hold more than one
  map; the file name is the map name.
- The file MUST be human-readable and diff-friendly: stable key order, sorted
  collections, two-space indentation, no timestamps that change on every read.
- Writes MUST be atomic (write a temporary file, then rename). A reader MUST
  never observe a half-written map.
- Every path stored inside a map MUST be relative to the repository root, so a
  clone at a different location opens unchanged.
- The file is the source of truth. The interface is a view over it, never a
  second copy held somewhere else.

Rationale: a map is an explanation of the code. It is only useful if it is
reviewed, reviewed in the same place, and travels with the code that it
explains.

### III. One Command to Start

Reaching a working map MUST NOT require a chain of manual steps.

- `npx ctour init` MUST be sufficient to create the map, connect the AI agent
  and register the project for the interface.
- Every command MUST be idempotent: running it twice changes nothing and
  destroys nothing.
- No README instruction may require the user to copy a URL or a generated
  command from the interface into a terminal, or the reverse.
- `ctour doctor` MUST be able to explain, without guessing, why a project is
  not working.

Rationale: the most common failure of this product was not the idea, it was
the distance between "I have an idea for a map" and "I am writing one".

### IV. Agent Access Through MCP

An AI agent reaches a map only through the `ctour` MCP server.

- Agents MUST NOT depend on a running web server, a public URL or a credential.
- Read and write tools share one implementation with the interface; no tool
  may bypass the file contract in Principle II.
- Every mutating tool call MUST return a plan the human can read before the
  change is applied. Silent writes are forbidden.
- The MCP surface is part of the public contract: removing or renaming a tool
  is a breaking change.

Rationale: the agent is a collaborator on the artifact, not a remote client of
a deployment.

### V. Understanding Stays With the Person

The product exists to repair the reader's understanding. That cannot be
outsourced.

- AI MAY draft, ask questions, propose structure and audit drift.
- AI MUST NOT be the sole author of a waypoint description or a tour
  narrative presented as the user's understanding.
- Generated content MUST be attributable and MUST be reviewable before it
  becomes part of the map.
- No feature may be justified by "the AI will handle it".

Rationale: the research foundation of this project rests on cognitive and
intent debt being repaid by the person reading the code. A tool that hides
that work removes the reason it exists.

### VI. The Interface Is the Product

The interface is judged by whether a person can use it without instruction.

- Components MUST come from shadcn/ui on Tailwind. Hand-rolled primitives,
  dialogs, menus, and form controls are not acceptable replacements.
- Color, spacing, radius and typography MUST be design tokens. Literal color
  utilities (`bg-white`, `text-gray-700`) in components are a defect.
- Light, dark and system themes MUST all be correct at every supported width.
- The layout MUST be responsive: full three-pane at desktop widths, collapsed
  navigation at tablet widths, drawers and a bottom bar at phone widths.
- Every action MUST have exactly one obvious place. Duplicated controls and
  controls without effect are defects, not conveniences.

Rationale: the concept was already good while the product was not usable. The
gap was interface quality, not feature count.

## Additional Constraints

- **Runtime**: Node.js 20 or newer; the package is published to npm as `ctour`.
- **Framework**: Next.js (App Router) with React and TypeScript; strict types,
  no `any` in shipped code.
- **Language of the product**: English, in the interface, the map format and
  the documentation.
- **No comments in code.** Naming, structure and types carry the meaning. If a
  block needs an explanation, rewrite the block.
- **Documentation order** in `README.md` is fixed: business logic first, then
  architecture, then technical detail.
- **Dead code must be deleted in the same change that makes it dead**, not left
  behind behind a flag or a TODO.

## Development Workflow

- Every change ships with tests. A change without a test run is not done.
- Test runs are recorded in `TEST_RESULTS.md` at the repository root, newest
  first, with the command, the branch and the result of each test.
- Changes are minimal diffs. No refactor rides along with a feature, and no
  renaming rides along with a fix.
- A plan precedes a write. Structural changes are described before files are
  touched, and the description is what the work is reviewed against.
- Each phase lands as a working application. A phase that leaves the app
  unusable is not finished.

## Governance

This constitution supersedes other practices, conventions and habits in this
repository. Where it conflicts with a document, the constitution wins and the
document is corrected.

Amendments:

1. An amendment is proposed as a written change to this file, with the reason
   and the migration cost stated.
2. Conflicts with the project brief in `docs/PRODUCT-BRIEF.md` MUST be resolved
   explicitly; one of the two documents is wrong.
3. The version is incremented before the change lands.

Versioning: semantic. MAJOR for a removed or redefined principle, MINOR for a
new principle or materially expanded rule, PATCH for wording only.

Compliance: review verifies two things, in this order — does the change obey
these principles, and does it do what the originating intent asked. A change
that fails either is returned, not merged. Complexity that needs a principle
exception is rejected rather than excepted.

**Version**: 1.0.1 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
