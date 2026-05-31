# Add regression coverage and validation gates

Status: needs-triage

## What to build

Add integrated regression coverage for parent-linked floating contexts, flat collections, and migrated nested floating examples. Validate the final refactor through the repo's normal checks and docs build.

## Acceptance criteria

- [ ] Tests cover nested outside click, hover transit, focus transit, Escape ordering, descendant cascade, and flat collection navigation.
- [ ] Updated playground and docs examples are manually verifiable.
- [ ] `vp check` passes.
- [ ] `vp test` passes.
- [ ] `vp run docs:build` passes.

## Blocked by

- `.scratch/parent-linked-floating-contexts/issues/02-make-click-and-hover-respect-linked-descendants.md`
- `.scratch/parent-linked-floating-contexts/issues/03-make-focus-focus-trap-and-escape-respect-linked-contexts.md`
- `.scratch/parent-linked-floating-contexts/issues/04-introduce-flat-use-collection.md`
- `.scratch/parent-linked-floating-contexts/issues/05-remove-public-use-tree-and-migrate-runtime-surfaces.md`
