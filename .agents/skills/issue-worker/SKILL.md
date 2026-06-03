---
name: issue-worker
description: Implement one VFloat .scratch issue from the AFK workflow. Use when an agent is assigned a ready-for-agent issue, must update Work Log and Validation Log, and should move it to ready-for-review.
---

# Issue Worker

Use this skill when assigned exactly one issue file from `.scratch/`.

## Before Editing

1. Read `AGENTS.md`.
2. Read `.agents/workflows/afk-issue-loop.md`.
3. Read the assigned issue and its parent PRD.
4. Confirm the issue is `Status: ready-for-agent` or already assigned to you as
   `Status: in-progress`.
5. Check `Blocked by`. Stop and update the issue if blockers are not complete.

## Working Loop

1. Set or confirm `Status: in-progress`, `Assignee`, and `Branch/worktree`.
2. Explore the codebase using repo terminology from `CONTEXT.md`.
3. Implement only the issue's acceptance criteria.
4. Keep `Work Log` current with durable findings and scope decisions.
5. Run focused validation first, then broader validation when feasible.
6. Record exact validation commands and outcomes in `Validation Log`.

Use supporting skills as needed:

- `diagnose` for bugs or regressions.
- `tdd` when adding behavior with a clear test seam.
- `documentation-writer` when docs must change.
- `vfloat-file-structure` when creating or reshaping composables.

## Completion

Move the issue to `Status: ready-for-review` only when:

- Every acceptance criterion is checked or explicitly explained.
- Relevant tests or checks have passed, or skipped validation is justified.
- `Work Log` summarizes what changed.
- `Validation Log` lists commands and results.
- Unrelated worktree changes are preserved.

Do not mark your own issue `completed`; that is reviewer-owned.
