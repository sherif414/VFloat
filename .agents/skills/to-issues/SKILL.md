---
name: to-issues
description: Break a VFloat PRD, plan, or spec into AFK workflow issue files under .scratch. Use when creating implementation tickets, vertical slices, or issue-worker tasks.
---

# To Issues

Break a PRD or plan into independently grabbable vertical slices for the AFK
issue loop.

## Workflow Integration

Read before writing:

- `AGENTS.md`
- `.agents/workflows/afk-issue-loop.md`
- `.agents/issue-tracker.md`
- `.agents/triage-labels.md`
- the source PRD or plan

Issues must be understandable by any markdown-capable agent. Avoid Codex-only
language in issue bodies.

## Process

### 1. Gather Context

If the user passes a PRD, issue number, or path, read it fully. If the source is
conversation context, explore the codebase enough to use VFloat terminology and
respect relevant ADRs.

### 2. Draft Vertical Slices

Break the plan into tracer-bullet issues. Each issue should deliver a narrow,
complete behavior path with its own acceptance criteria and validation
expectations.

Classify each slice:

- **AFK** - can become `ready-for-agent` after triage.
- **HITL** - should become `ready-for-human` because it needs human judgment,
  design approval, credentials, or manual verification.

Present the draft breakdown with title, type, blockers, and covered user
stories. Iterate until approved.

### 3. Publish Issues

Create files at `.scratch/<feature-slug>/issues/<NN>-<slug>.md` in dependency
order. New issues start as `Status: needs-triage`, even when they look AFK, so
`triage` can verify readiness and add the final agent brief.

## Issue Template

```markdown
Status: needs-triage
Category: enhancement
Assignee: unassigned
Branch/worktree: not-started
Parent: .scratch/<feature-slug>/PRD.md
Blocked by: None

# <Issue Title>

## What to build

A concise description of the end-to-end behavior this slice delivers.

## Acceptance criteria

- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] Specific, testable criterion 3

## Agent Brief

To be completed by triage before moving to `ready-for-agent`.

## Work Log

- Not started.

## Validation Log

- Not run.

## Review Notes

- Not reviewed.

## Comments
```

Do not close or mark the parent PRD complete while publishing issues.
