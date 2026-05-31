# Remove public useTree and migrate runtime surfaces

Status: needs-triage

## What to build

Remove public `useTree()` usage and migrate runtime surfaces to parent-linked floating contexts plus flat collections. Nested keyboard handoff should remain callback-based through `useListNavigation()` rather than being inferred from item hierarchy.

## Acceptance criteria

- [ ] `useTree()` is removed from public exports.
- [ ] Runtime tests no longer depend on tree-backed navigation.
- [ ] Nested demos use `parentContext` for floating coordination.
- [ ] Nested keyboard handoff remains callback-based through `onEnter` and `onExit`.

## Blocked by

- `.scratch/parent-linked-floating-contexts/issues/01-add-parent-linked-floating-context-topology.md`
- `.scratch/parent-linked-floating-contexts/issues/04-introduce-flat-use-collection.md`
