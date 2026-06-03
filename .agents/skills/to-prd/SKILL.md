---
name: to-prd
description: Turn conversation context into a VFloat PRD in .scratch for the AFK issue workflow. Use when creating a PRD, feature brief, or parent planning file that will later be broken into issue-worker tasks.
---

# To PRD

This skill synthesizes the current conversation and codebase understanding into
a PRD file for the local markdown issue tracker. Do not interview the user
unless a product decision is genuinely missing.

## Workflow Integration

Read before writing:

- `AGENTS.md`
- `.agents/workflows/afk-issue-loop.md`
- `.agents/issue-tracker.md`
- `.agents/triage-labels.md`
- `CONTEXT.md` and relevant ADRs, if present

The PRD should be ready for `to-issues` to split into independently grabbable
AFK issues. It should not assume Codex-only tooling.

## Process

1. Explore the repo enough to describe the current state accurately. Use the
   project's domain glossary vocabulary and respect relevant ADRs.
2. Identify the major modules or public interfaces likely to change. Prefer
   behavioral contracts over file paths.
3. Look for deep modules that can be tested in isolation, but keep the PRD at
   the product and architectural decision level.
4. Write `.scratch/<feature-slug>/PRD.md` using the template below.
5. Set `Status: needs-triage` unless the user explicitly says the plan is
   already approved for issue breakdown.

## PRD Template

```markdown
Status: needs-triage
Category: enhancement

# <Feature Title>

## Problem Statement

The problem from the user's perspective.

## Solution

The intended solution from the user's perspective.

## User Stories

1. As an <actor>, I want <feature>, so that <benefit>.

## Implementation Decisions

- Durable decisions about behavior, contracts, modules, or architecture.
- Avoid brittle file paths and line numbers.

## Testing Decisions

- Behaviors that need regression coverage.
- Existing test patterns or seams to reuse.
- Validation expectations for downstream issues.

## Out of Scope

- Related work that should not be included.

## Further Notes

- Context useful for `to-issues`, `triage`, workers, reviewers, or committers.
```

## Handoff

After publishing, tell the user the PRD path and that `to-issues` is the next
skill for breaking it into AFK-ready vertical slices.
