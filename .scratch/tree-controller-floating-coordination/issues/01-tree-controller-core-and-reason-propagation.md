# Tree controller core and reason propagation

Status: wontfix

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Build the deep tree controller seam that owns node registration, parent/child topology, active branch tracking, branch/tree containment queries, and reason-aware close orchestration. Ensure all tree-driven close paths preserve the initiating open-change reason rather than degrading to generic programmatic closes.

## Acceptance criteria

- [ ] Tree controller centralizes topology and active-branch orchestration for tree-aware floating contexts.
- [ ] Tree-driven close actions (node, branch, children, siblings) preserve the initiating close reason end-to-end.
- [ ] Existing standalone non-tree behavior remains unchanged when no tree membership exists.

## Blocked by

None - can start immediately.
