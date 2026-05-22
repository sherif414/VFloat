Status: completed

## Problem Statement

`useListNavigation` has moved toward a data-first `useCollection` contract, but the surrounding API story and behavior are not yet stable enough for consumers. The current implementation no longer matches the documented DOM/index-based API, keeps some richer strategy code disconnected from the public composable, and has edge cases where hidden floating surfaces or nested branches can mutate active navigation state unexpectedly.

From a VFloat user's perspective, list navigation should be a predictable interaction layer for Command menus, listboxes, grids, and nested floating trees. It should not require guessing which API generation is real, and keyboard behavior should remain stable whether the floating surface is mounted, hidden, nested, or backed by disabled child items.

## Solution

Harden `useListNavigation` around the current `useCollection` direction. The public contract, docs, tests, and implementation should agree on one model: list navigation consumes a collection, maps keyboard events into collection state changes, and leaves role management and visual rendering to other composables.

The implementation should guard against closed-surface key handling, make branch expansion target the correct enabled descendant instead of accidentally escaping the branch, and either reconnect or remove stale strategy helpers so tested behavior matches shipped behavior. Documentation should be rewritten to describe the actual collection-backed API, with examples that compile against the current composable.

## User Stories

1. As a VFloat consumer, I want the `useListNavigation` API docs to match the exported TypeScript interface, so that examples compile without reverse-engineering the source.
2. As a VFloat consumer, I want to pass a `useCollection` instance into `useListNavigation`, so that keyboard navigation is driven by my data model rather than brittle DOM index bookkeeping.
3. As a Command menu builder, I want ArrowDown and ArrowUp to open a closed vertical floating surface and choose the expected first or last item, so that menus feel native from the keyboard.
4. As a menubar builder, I want horizontal arrow keys to respect left-to-right and right-to-left layout, so that navigation follows the document direction.
5. As a nested menu builder, I want ArrowRight in left-to-right layouts to expand the active branch, so that users can enter submenus intentionally.
6. As a nested menu builder, I want ArrowLeft in left-to-right layouts to return to the parent item and collapse that branch, so that users can back out of submenus predictably.
7. As a right-to-left nested menu builder, I want the expand and collapse keys reversed consistently, so that nested navigation matches user expectations in RTL layouts.
8. As a menu user, I want expanding a branch with disabled child items to keep navigation inside the branch or stay on the opener, so that focus does not jump to an unrelated sibling.
9. As a menu user, I want expanding a branch with no enabled descendants to avoid changing the active item, so that the opener remains the stable point of reference.
10. As a menu user, I want key events on a hidden or closed floating element to be ignored, so that stale mounted DOM cannot repopulate active navigation state after close.
11. As a menu user, I want Tab to close the current floating surface without preventing normal page focus movement, so that keyboard escape from the composite remains natural.
12. As a menu user, I want Home and End behavior to be consistent with the active list only while the surface is open, so that inactive composites do not intercept navigation.
13. As a developer using disabled items, I want list navigation to skip disabled values consistently, so that disabled commands do not become active accidentally.
14. As a developer using dynamic collections, I want navigation to recover when the current active value disappears, so that data updates do not strand the active state.
15. As a docs reader, I want the guide and API page to explain that list navigation owns focus movement while role management owns ARIA semantics, so that I compose the right primitives.
16. As a maintainer, I want strategy helpers to be either used by `useListNavigation` or deleted, so that tests do not create false confidence in unshipped behavior.
17. As a maintainer, I want collection branch traversal helpers to be deep and isolated, so that branch-targeting behavior can be tested without DOM events.
18. As a maintainer, I want focused regression tests for closed-surface key handling, branch expansion with disabled children, and docs/API alignment, so that this seam does not regress during the pre-1.0 API evolution.
19. As a contributor, I want the list-navigation test suite to assert externally observable behavior, so that refactors can change internals without rewriting brittle tests.
20. As a library maintainer, I want the public contract to follow VFloat naming and grouped API conventions rather than Floating UI compatibility assumptions, so that the project remains internally coherent.

## Implementation Decisions

- Treat the current collection-backed contract as the implementation baseline unless triage decides to restore the older DOM/index API.
- Keep `useListNavigation` focused on keyboard interaction and collection state transitions. Role management remains out of scope for the composable.
- Add an open-state guard for floating-surface navigation keys so closed or hidden mounted surfaces cannot mutate `activeValue`.
- Make branch expansion target the first enabled descendant in the expanded branch rather than blindly moving to the next flattened focusable item.
- Add collection-level traversal helpers if needed so branch targeting is implemented as a deep, testable data module rather than ad hoc event-handler code.
- Reconcile the strategy module with the public composable: either route `useListNavigation` through the strategies or remove strategy behavior that is no longer part of the shipped API.
- Rewrite the API documentation and example to use `collection`, `activeValue`, `expandedValues`, and collection-driven data items.
- Preserve VFloat domain boundaries: List navigation moves active state; Role management owns ARIA roles and item semantics; Floating surface positioning stays in `useFloating`.
- Keep breaking API changes acceptable under the pre-1.0 "infinite minor" evolution model, but make the intended contract explicit.

## Testing Decisions

- Good tests should assert externally observable behavior: `open` state, `activeValue`, `expandedValues`, default prevention, and documented keyboard outcomes.
- Avoid tests that assert private implementation details such as helper call order, intermediary arrays, or exact strategy class selection unless those helpers become a public or intentionally isolated module contract.
- Test `useCollection` branch traversal in isolation for disabled descendants, empty descendants, nested descendants, dynamic item updates, and parent lookup behavior.
- Test `useListNavigation` integration with real `KeyboardEvent` dispatch for closed/open states, vertical and horizontal orientation, RTL, Tab close, Home/End, and nested branch expand/collapse.
- Add regression coverage for mounted-but-closed floating elements receiving keydown events.
- Add regression coverage for branch expansion where the immediate child is disabled and where every descendant is disabled.
- Add docs/API alignment checks if the repo has an existing docs validation pattern for exported composable signatures; otherwise rely on docs build plus TypeScript examples where practical.
- Use the existing `use-list-navigation` and `use-collection` test suites as prior art, but prefer behavior-first assertions over brittle focus-target assertions unless focus itself is the behavior under test.

## Out of Scope

- Reintroducing the old implicit floating-tree registry.
- Moving ARIA role or `aria-activedescendant` ownership into list navigation unless triage explicitly reverses the current domain boundary.
- Building visual menu components or styling.
- Redesigning `useFloating()` or the grouped `refs`, `state`, and `position` return shape.
- Solving multi-select collection semantics.
- Broad documentation information architecture changes beyond making the list-navigation pages accurate and discoverable.

## Further Notes

- This PRD is intentionally narrower than the broader unified collection architecture work. It captures the stabilization work revealed by a code review of the current `useListNavigation` implementation.
- The most important triage decision is whether the collection-backed API is now the canonical public contract. Once that decision is made, the implementation, tests, and docs should be made consistent in one pass.
- If the strategy module is retained, it should become a real deep module used by the composable. If it is not retained, deleting it may reduce maintenance noise and prevent tests from covering behavior users cannot reach.
