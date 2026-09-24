---
name: architecture-decision-records
description: Create, update, and review VFloat architecture decision records using grouped folders, a minimal template, and the repository ADR generator. Use for durable architectural or API decisions, not routine implementation changes or public documentation.
---

# VFloat architecture decision records

Use this skill when a decision will shape future work, affect multiple modules, define a public API constraint, or otherwise risk being re-litigated later.

Do not create an ADR for an ordinary bug fix, a small refactor, a dependency update, or an implementation detail that does not constrain future work. Use `RFC/` for proposals that are still being explored. Create an ADR when the decision is settled.

## Repository layout

- `ADR/README.md` is the grouped, generated index.
- `ADR/_template.md` is the source template.
- `ADR/<group>/<number>-<slug>.md` contains individual records.
- `scripts/adr.ts` provides the generator and index updater.

Use an existing group when one fits. The initial groups are `architecture`, `positioning`, `interactions`, `keyboard-navigation`, `runtime`, and `tooling`. Add a new group only when the decision does not fit those areas or the new area will contain more than one related decision.

## Create an ADR

Generate the file instead of copying the template manually:

```bash
pnpm adr:new -- --group <group> --title "<decision title>"
```

The generator assigns the next number within the group, creates a kebab-case filename, fills in the date, and refreshes the index.

The document should stay minimal:

```md
---
status: accepted
date: YYYY-MM-DD
---

# Title

## Context

Why did this decision become necessary?

## Decision

What are we choosing, and what should future changes preserve?

## Alternatives considered

- Alternative: reason it was rejected.
```

Remove `Alternatives considered` when there are no meaningful alternatives. Do not add extra required sections or create a parallel decision-tracking system.

## Maintain the index

If an ADR is added, renamed, or its metadata changes, run:

```bash
pnpm adr:index
```

Do not hand-edit the generated section of `ADR/README.md`. Preserve the existing number and filename of existing decisions. Never delete historical ADR files.

## Lifecycle & avoiding the "status trap"

ADRs are **append-only, point-in-time historical records**. They document the context, constraints, and rationale of a decision at the moment it was made.

- **Do not treat ADRs as a mutable state machine**: Requiring an exhaustive retrospective audit of all historical records whenever an architectural direction changes creates maintenance paralysis (the "status trap").
- **Forward-linking over backward-auditing**: When a new decision replaces or evolves a previous one, document this in the **new** ADR's `## Context` section (e.g., "Supersedes ADR-architecture-0001 due to..."). You do not need to hunt down and re-litigate older records.
- **Source of truth separation**:
  - **Living codebase & `docs/`**: The authoritative source of truth for how VFloat behaves and is architected today.
  - **ADR archive (`ADR/`)**: A chronological record of why architectural choices were made.
- **Status updates are optional**: Historical records naturally retain `status: accepted` reflecting their historical acceptance. Retroactively changing an older ADR's status to `superseded` is acceptable if convenient, but never a mandatory blocking ceremony.

