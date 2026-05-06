# Interaction adapter alignment for tree semantics

Status: ready-for-human

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Align tree-aware interaction routing so outside click, Escape layering, hover transitions, blur transitions, and focus-trap integration consistently use tree containment and reason-aware close routing through the interaction adapter without duplicating orchestration policy.

## Acceptance criteria

- [ ] Tree-aware outside-click containment prevents false ancestor dismissals for descendant interactions.
- [ ] Escape closes deepest active layer first and preserves reason semantics.
- [ ] Hover/focus transitions into descendants are treated as in-branch, preventing false parent dismissals.

## Blocked by

- `01-tree-controller-core-and-reason-propagation.md`
- `02-thin-node-contract-and-explicit-linking.md`
