Status: ready-for-agent

## Parent

c:\projects\VFloat\.scratch\unified-collection\PRD.md

## What to build

Extend the `useCollection` primitive to handle deeply nested 2D data (trees). This involves adding support for an `itemChildren` configuration option. The collection must manage `expandedValues` (which branches are open) and dynamically calculate a `flattenedItems` array representing the currently visible items based on expansion state. Update `useListNavigation` to support 2D keyboard handoffs by binding `ArrowRight` (to expand and enter a child branch) and `ArrowLeft` (to collapse the current branch and exit to the parent) to the collection's new expansion mutators.

## Acceptance criteria

- [ ] `useCollection` accepts an `itemChildren` option and calculates a reactive `flattenedItems` array.
- [ ] `useCollection` exposes mutators to expand and collapse branches (`expandBranch`, `collapseBranch`, `collapseAll`).
- [ ] `useListNavigation` correctly handles `ArrowRight` by expanding the active item's child branch (if any) and moving `activeValue` into it.
- [ ] `useListNavigation` correctly handles `ArrowLeft` by collapsing the current child branch and moving `activeValue` back to the parent item.
- [ ] Integration tests verify that 2D navigation properly maintains a single global `activeValue` across nested branches.

## Blocked by

- .scratch/unified-collection/issues/01-1d-collection-list-navigation.md
