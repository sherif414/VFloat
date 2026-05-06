# Tree coordination regression tests

Status: ready-for-human

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Add focused regression coverage for tree coordination outcomes across controller behavior and interaction integrations, with emphasis on externally observable behavior: branch containment, close ordering, reason propagation, and nested interaction handoffs.

## Acceptance criteria

- [ ] Tests cover active-branch tracking, sibling collapse, descendant leaf-first close order, and reason propagation.
- [ ] Tests cover interaction integration for outside click, Escape layering, hover/blur branch transitions, and focus-trap interplay.
- [ ] Tests avoid implementation-detail assertions and focus on behavioral outcomes visible to consumers.

## Blocked by

- `04-list-navigation-handoff-and-return-index.md`
