Status: ready-for-agent

## Parent

c:\projects\VFloat\.scratch\unified-collection\PRD.md

## What to build

Update the existing interaction composables (`useClick`, `useHover`, `useFocusTrap`, `useEscapeKey`) to be completely tree-ignorant. They should no longer import or rely on `treeNodeBridge` or internal implicit tree logic. Instead, expose generic predicate options (such as `ignoreOutsideClick: (target: EventTarget) => boolean`) that allow end-users to explicitly wire these interactions to the new `useCollection` API (e.g., `collection.isTargetWithinBranch()`).

## Acceptance criteria

- [ ] `useClick` is updated to accept an `ignoreOutsideClick` predicate function.
- [ ] `useHover` is updated to accept a similar predicate for keeping branches alive during hover cascades.
- [ ] Internal references to `treeNodeBridge` or `createTreeInteraction` are completely removed from the interaction composables.
- [ ] The composables function perfectly as generic, single-level overlay handlers when no predicates are provided.

## Blocked by

None - can start immediately
