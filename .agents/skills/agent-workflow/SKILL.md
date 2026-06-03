---
name: agent-workflow
description: Coordinate VFloat's markdown-based AFK issue workflow. Use when creating, assigning, implementing, reviewing, committing, or monitoring .scratch PRD and issue files across Codex or other markdown-capable agents.
---

# Agent Workflow

Use this skill whenever work moves through the AFK issue loop. It is the shared
orchestration layer for planner, coordinator, worker, reviewer, and committer
agents.

## Source of Truth

Read `.agents/workflows/afk-issue-loop.md` before taking action. The issue file
in `.scratch/` owns current state. Agent memory, chat summaries, and background
thread titles are hints only.

Also read:

- `AGENTS.md` for project conventions.
- `.agents/issue-tracker.md` for local markdown issue layout.
- `.agents/triage-labels.md` for status vocabulary.
- `.agents/rules/commit-message.md` before commit proposal work.

## Coordinator Prompt

When acting as coordinator:

1. Scan `.scratch/**/issues/*.md`.
2. Select unblocked `ready-for-agent` issues.
3. Claim one issue per worker by setting `Status: in-progress`, `Assignee`,
   and `Branch/worktree`.
4. Prompt the worker with the issue path, parent PRD path, and workflow docs.
5. Assign review when a worker marks an issue `ready-for-review`.
6. Mark the parent PRD `ready-to-commit` only after every child issue is
   `completed`.

## Worker Prompt

When prompting a worker, include:

```text
Read AGENTS.md and .agents/workflows/afk-issue-loop.md.
Implement exactly one issue: <issue-path>.
Read the parent PRD before editing source.
Update Work Log and Validation Log in the issue.
Set Status: ready-for-review only when acceptance criteria are met.
Preserve unrelated worktree changes.
```

## Reviewer Prompt

When prompting a reviewer, include:

```text
Read AGENTS.md and .agents/workflows/afk-issue-loop.md.
Review exactly one issue: <issue-path>.
Compare the diff, acceptance criteria, and Validation Log.
If acceptable, set Status: completed and append Review Notes.
If not, create follow-up issue files with Status: ready-for-agent and set the original issue to review-blocked.
```

## Committer Prompt

When prompting a committer, include:

```text
Read AGENTS.md, .agents/workflows/afk-issue-loop.md, and .agents/rules/commit-message.md.
Prepare commit proposals for completed work under <feature-path>.
Run final validation or record why it cannot run.
Group changes into logical Conventional Commit messages.
Do not stage or commit without explicit human approval.
```

## Handoff Discipline

- Prefer issue-file updates over chat-only status.
- Keep each issue scoped to one worker.
- Create follow-up issues for review findings instead of hiding extra work in
  review notes.
- If a task needs human judgment, use `Status: ready-for-human`.
