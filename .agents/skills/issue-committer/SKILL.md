---
name: issue-committer
description: Prepare final validation and Conventional Commit proposals for completed VFloat AFK workflow work. Use when all feature issues are completed or a PRD is ready-to-commit.
---

# Issue Committer

Use this skill after all issues for a feature are `completed` or the parent PRD
is `ready-to-commit`.

## Inputs

Read:

- `AGENTS.md`
- `.agents/workflows/afk-issue-loop.md`
- `.agents/rules/commit-message.md`
- the parent PRD
- all child issues and review notes
- the final diff

## Validation

Run or verify final checks:

- `vp check`
- `vp test`
- `vp run docs:build` when docs changed

If a command cannot run, record the reason and residual risk in the commit
proposal summary.

## Commit Proposal

Group changes into logical commits. For each proposed commit, include:

- commit message header using `type(scope)!: description`
- optional body explaining why
- files or behavior included
- related issue paths
- validation that supports it

Do not stage or commit unless the user explicitly approves that action.
