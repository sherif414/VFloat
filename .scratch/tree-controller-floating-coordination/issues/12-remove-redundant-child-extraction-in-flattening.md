# Remove redundant child extraction in flattening

Status: needs-triage

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Stop re-running `getItemChildren` during `getFlattenedItems()` and flatten from the indexed child map built by `TreeModel` instead, so the model has one consistent source of truth for tree structure.

## Why this matters

`TreeModel` already indexes the tree during construction, but the flattening path walks `getItemChildren` again. That duplicates work, can diverge from the indexed maps if the callback is unstable, and weakens the model’s locality. A single indexed source of truth makes the implementation easier to reason about and less sensitive to callback side effects.

## Acceptance criteria

- [ ] `getFlattenedItems()` derives visible items from the model’s indexed child structure.
- [ ] The flattening path no longer calls `getItemChildren` a second time.
- [ ] Flattening output remains identical for valid input trees.
- [ ] Tree-model invariants continue to be covered by tests.

## Suggested implementation shape

- Reuse `childrenItemsMap` for visible-tree traversal.
- Keep the model-building pass responsible for all structural child extraction.
- Preserve the current DFS ordering and expansion semantics.

## Blocked by

None - can start immediately.
