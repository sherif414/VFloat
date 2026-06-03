# AFK Issue Loop

This workflow lets Codex coordinate work while keeping the implementation
protocol readable by any markdown-capable agent. The source of truth is the
issue file in `.scratch/`, not any agent's memory.

## Lifecycle

Use exactly one `Status:` value near the top of every PRD and issue file.

| Status             | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `needs-triage`     | Maintainer or triage agent must clarify scope, category, readiness, or blockers.                |
| `needs-info`       | Waiting for human input or missing reproduction details.                                        |
| `ready-for-agent`  | Fully specified and safe for an AFK worker agent.                                               |
| `in-progress`      | A worker agent has claimed the issue.                                                           |
| `ready-for-review` | The worker believes acceptance criteria and validation are complete.                            |
| `review-blocked`   | Review found follow-up work. Linked review issues must complete before this issue can complete. |
| `completed`        | The issue is implemented, reviewed, and validated.                                              |
| `ready-to-commit`  | All issues for a feature are complete and commit proposals can be prepared.                     |
| `ready-for-human`  | Needs human judgment or implementation before AFK agents can continue.                          |
| `wontfix`          | The issue will not be actioned.                                                                 |

## Issue Contract

New and touched issues should use this structure:

```markdown
Status: needs-triage
Category: enhancement
Assignee: unassigned
Branch/worktree: not-started
Parent: .scratch/<feature-slug>/PRD.md
Blocked by: None

# Issue title

## What to build

Describe the end-to-end behavior this issue delivers.

## Acceptance criteria

- [ ] Specific, testable criterion

## Agent Brief

**Summary:** One-line task summary.

**Current behavior:**
What happens now.

**Desired behavior:**
What should happen when complete.

**Key interfaces:**

- `InterfaceName` - behavior or contract to preserve/change.

**Validation expectations:**

- Focused tests or checks the worker should run.
- Broader checks that should run when feasible.

**Out of scope:**

- Work that should not happen in this issue.

## Work Log

- Not started.

## Validation Log

- Not run.

## Review Notes

- Not reviewed.

## Comments
```

Existing issues do not need bulk migration. When an agent touches an old issue,
it should preserve useful content and add any missing sections needed for the
current state transition.

## Roles

### Coordinator

Codex is the default coordinator for this repo, but the coordinator should only
depend on markdown state:

1. Scan `.scratch/**/issues/*.md`.
2. Find `ready-for-agent` issues whose `Blocked by` entries are all
   `completed`.
3. Record `Assignee` and `Branch/worktree`, then set `Status: in-progress`.
4. Start or prompt a worker agent with the issue path and this workflow file.
5. When an issue becomes `ready-for-review`, assign a reviewer.
6. When all issues under a feature are `completed`, mark the PRD
   `ready-to-commit` and assign a committer for proposal prep.

### Worker

A worker handles exactly one issue. It reads `AGENTS.md`, this workflow, the
parent PRD, the issue body, and relevant code/docs. It updates `Work Log` as it
learns and `Validation Log` with exact commands and outcomes. It sets
`Status: ready-for-review` only when every acceptance criterion is satisfied or
explicitly explained.

### Reviewer

A reviewer checks one `ready-for-review` issue against the issue contract,
acceptance criteria, validation log, and diff. It either sets `Status:
completed` or creates follow-up issues with `Status: ready-for-agent` and sets
the original issue to `review-blocked`.

### Committer

A committer runs final validation for a completed feature, groups the diff into
logical commits, and proposes Conventional Commit messages using
`.agents/rules/commit-message.md`. It must not stage or commit without explicit
human approval.

## Validation Defaults

- Run focused tests for the touched behavior whenever practical.
- Run `vp check` and `vp test` before declaring a feature ready to commit.
- If docs changed, run `vp run docs:build`.
- Record skipped validation with the reason and residual risk.

## Safety Rules

- Preserve unrelated worktree changes.
- Do not start blocked issues.
- Do not use package-manager commands directly; use Vite+ (`vp`).
- Keep issue comments and logs durable: write what the next agent needs, not
  a transcript of every thought.
