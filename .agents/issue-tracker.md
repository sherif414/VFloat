# Issue Tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Layout

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Standalone issues may live in `.scratch/issues/`

## Workflow Contract

The canonical workflow is `.agents/workflows/afk-issue-loop.md`. New and
touched issues should follow that metadata and section contract.

Required metadata near the top of each issue:

- `Status: <workflow-status>`
- `Category: bug` or `Category: enhancement`
- `Assignee: <agent/tool name or unassigned>`
- `Branch/worktree: <branch, worktree, local, or not-started>`
- `Parent: <PRD path or None>`
- `Blocked by: <issue paths or None>`

Required sections for AFK-ready issues:

- `## What to build`
- `## Acceptance criteria`
- `## Agent Brief`
- `## Work Log`
- `## Validation Log`
- `## Review Notes`
- `## Comments`

Existing issues do not need bulk migration. When an agent touches an older issue,
it should add missing metadata or sections needed for the transition it is
performing.

## Publishing

When a skill says "publish to the issue tracker", create a markdown file under
`.scratch/<feature-slug>/` or `.scratch/<feature-slug>/issues/`.

New PRDs and issues normally start with `Status: needs-triage`. Triage moves
fully specified AFK issues to `ready-for-agent`.

## Fetching

When a skill says "fetch the relevant ticket", read the referenced markdown file.
The user will normally pass the path, feature slug, or issue number.

## Comments And Logs

Append durable notes to the relevant issue section:

- Triage writes `## Triage Notes` under `## Comments`.
- Workers update `Work Log` and `Validation Log`.
- Reviewers update `Review Notes` and create follow-up issues for actionable
  findings.
- Committers summarize final validation and commit proposals without committing
  unless the user approves.
