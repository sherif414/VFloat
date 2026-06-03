---
name: issue-reviewer
description: Review one VFloat AFK workflow issue after implementation. Use when an issue is ready-for-review and needs diff review, acceptance validation, follow-up issue creation, or completion.
---

# Issue Reviewer

Use this skill to review exactly one `Status: ready-for-review` issue.

## Review Inputs

Read:

- `AGENTS.md`
- `.agents/workflows/afk-issue-loop.md`
- the issue file
- the parent PRD
- relevant source, tests, and docs
- the current diff for the worker's branch or worktree

## Review Standard

Use a code-review stance. Prioritize:

- correctness bugs
- regressions against acceptance criteria
- missing tests for risky behavior
- docs/API drift
- violations of VFloat naming, type, and Vite+ conventions

Avoid broad refactors unless they are required for the issue to be correct.

## Outcomes

If the work is acceptable:

1. Append `Review Notes` with what was checked.
2. Set `Status: completed`.

If follow-up work is needed:

1. Create one or more follow-up issue files in the same feature directory.
2. Give each follow-up `Status: ready-for-agent`, `Category`, `Parent`,
   `Blocked by`, acceptance criteria, and an agent brief.
3. Add links to those issues in the original issue's `Review Notes`.
4. Set the original issue to `Status: review-blocked`.

Do not silently fix substantial issues during review. Make review findings
durable so any agent can pick them up.
