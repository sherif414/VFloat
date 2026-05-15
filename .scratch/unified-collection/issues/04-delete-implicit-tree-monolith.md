Status: ready-for-agent

## Parent

c:\projects\VFloat\.scratch\unified-collection\PRD.md

## What to build

Finalize the architectural migration by completely deleting the old implicit floating tree monolith. This involves removing the internal tree files, scrubbing the `FloatingContext` interfaces of tree-related types, and ensuring the repository is clean of any legacy hierarchy registry logic.

## Acceptance criteria

- [ ] `src/composables/interactions/use-floating-tree.ts` is deleted.
- [ ] `src/composables/interactions/use-floating-tree-node.ts` is deleted.
- [ ] `src/composables/interactions/internal/tree-interaction.ts` is deleted.
- [ ] `src/composables/interactions/list-navigation/tree-coordination.ts` is deleted.
- [ ] `FloatingContext` and `UseFloatingReturn` types are updated to remove `treeNode` and `FloatingTreeBridge`.
- [ ] All related internal tree tests are removed or replaced by the new collection tests.

## Blocked by

- .scratch/unified-collection/issues/01-1d-collection-list-navigation.md
- .scratch/unified-collection/issues/02-2d-collection-keyboard-handoff.md
- .scratch/unified-collection/issues/03-decouple-interaction-composables.md
