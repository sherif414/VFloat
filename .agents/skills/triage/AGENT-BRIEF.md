# Writing Agent Briefs

An agent brief is the durable contract inside a local markdown issue. It tells
an AFK worker what to do without requiring chat history or Codex-specific
context. The issue body and PRD are supporting context; the brief is the
handoff.

## Principles

### Durable Over Precise

The issue may sit in `ready-for-agent` for days or weeks. Write the brief so it
survives code movement:

- Describe behavior, interfaces, invariants, and validation expectations.
- Name public types or composables when they define the contract.
- Avoid line numbers and brittle step-by-step file edits.
- Avoid tool-specific instructions unless the repo requires the tool.

### Behavioral, Not Procedural

Describe what the system should do, not how to implement it. Workers explore the
codebase fresh and choose the implementation that best fits current structure.

### Complete Acceptance And Validation

Every brief needs testable acceptance criteria and validation expectations. A
worker should know what commands or focused checks to run, and a reviewer should
know how to judge completion.

### Explicit Logs

The issue should contain:

- `Work Log` for durable implementation notes.
- `Validation Log` for exact commands and outcomes.
- `Review Notes` for reviewer findings and follow-up issue links.

## Template

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** one-line description of what needs to happen

**Current behavior:**
Describe what happens now. For bugs, this is the broken behavior. For
enhancements, this is the status quo.

**Desired behavior:**
Describe what should happen after the work is complete, including important
edge cases.

**Key interfaces:**

- `TypeName` - what contract or behavior matters
- `useComposable()` - what callers should observe

**Validation expectations:**

- Focused tests or checks the worker should run.
- Broader checks such as `vp check`, `vp test`, or `vp run docs:build` when
  relevant.

**Acceptance criteria:**

- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2

**Out of scope:**

- Related work that should not be changed in this issue
```

## Ready-For-Agent Checklist

- [ ] Metadata is normalized using `.agents/workflows/afk-issue-loop.md`.
- [ ] `Blocked by` is `None` or all blockers are complete.
- [ ] Acceptance criteria are independently verifiable.
- [ ] Validation expectations are clear.
- [ ] Work, validation, and review log sections exist.
- [ ] The issue can be understood from markdown alone.
