# Make click and hover respect linked descendants

Status: ready-for-human

## What to build

Update click and hover interactions so parent-linked descendant contexts count as related surfaces for parent contexts. This should make nested floating surfaces work without manual `ignoreOutsideClick` or `ignorePointerLeave` wiring for ordinary parent-child transitions.

## Acceptance criteria

- [x] Parent outside-click ignores descendant anchor and floating targets.
- [x] Parent pointer leave into descendants does not close.
- [x] Child contexts still treat parent blank areas and sibling contexts as outside.
- [x] `ignoreOutsideClick` and `ignorePointerLeave` remain supported as advanced overrides.

## Blocked by

- `.scratch/parent-linked-floating-contexts/issues/01-add-parent-linked-floating-context-topology.md`
