# Make focus, focus trap, and escape respect linked contexts

Status: ready-for-human

## What to build

Extend focus-driven interactions and Escape dismissal to understand parent-linked floating context families. Focus movement into descendants should stay inside the parent interaction model, and Escape should close the deepest open linked descendant before closing ancestors.

## Acceptance criteria

- [x] Focus movement into descendants is treated as related for parent contexts.
- [x] Focus trap behavior includes linked descendant surfaces where appropriate.
- [x] Escape closes the deepest open descendant first.
- [x] Repeated Escape walks upward through the linked family.
- [x] Standalone behavior remains unchanged.

## Blocked by

- `.scratch/parent-linked-floating-contexts/issues/01-add-parent-linked-floating-context-topology.md`
