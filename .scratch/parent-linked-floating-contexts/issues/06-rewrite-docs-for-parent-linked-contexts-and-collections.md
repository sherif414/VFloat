# Rewrite docs for parent-linked contexts and collections

Status: needs-triage

## What to build

Rewrite affected documentation around parent-linked floating contexts and `useCollection()`. The docs should present parent-linked contexts as the way to coordinate related floating surfaces and `useCollection()` as the flat item-navigation primitive.

## Acceptance criteria

- [ ] API docs describe `parentContext` and linked context behavior.
- [ ] `useCollection()` has an API page.
- [ ] `useTree()` docs and the tree-coordination guide are removed or replaced.
- [ ] Nested menu and keyboard navigation guides use the new mental model.
- [ ] Examples avoid manual `ignoreOutsideClick` and `ignorePointerLeave` wiring for linked contexts.

## Blocked by

- `.scratch/parent-linked-floating-contexts/issues/01-add-parent-linked-floating-context-topology.md`
- `.scratch/parent-linked-floating-contexts/issues/02-make-click-and-hover-respect-linked-descendants.md`
- `.scratch/parent-linked-floating-contexts/issues/03-make-focus-focus-trap-and-escape-respect-linked-contexts.md`
- `.scratch/parent-linked-floating-contexts/issues/04-introduce-flat-use-collection.md`
- `.scratch/parent-linked-floating-contexts/issues/05-remove-public-use-tree-and-migrate-runtime-surfaces.md`
