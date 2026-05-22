Status: completed

## Problem Statement

VFloat currently manages nested menu states (Floating trees) using an implicit bottom-up DOM registry (`useFloatingTree`). This creates a monolithic, highly coupled internal architecture. It makes keyboard navigation (`useListNavigation`) incredibly complex because it is forced to infer hierarchical boundaries from DOM elements, and it denies users manual control over the data structures driving their UI. When a user wants to customize behavior (e.g., keeping a specific menu open when clicking outside), they must fight against opaque internal tree magic.

## Solution

Shift from an invisible interaction coordinator to an explicit data structure. We will delete the implicit DOM tree registry entirely and introduce `useCollection`, a data-first structural manager that unifies 1D flat lists and 2D nested trees. We will redesign `useListNavigation` to exclusively consume this collection, completely decoupling it from DOM index lookups. Furthermore, all interaction composables (`useClick`, `useHover`) will become tree-ignorant, exposing generic predicate options (like `ignoreOutsideClick`) that users can wire to the collection's APIs.

## User Stories

1. As a developer, I want to define a 1D flat list using `useCollection`, so that I have a normalized data structure to power my simple dropdown menus.
2. As a developer, I want to define a deeply nested 2D list using `useCollection` by providing an `itemChildren` configuration, so that the collection scales automatically without me needing a separate "Tree" composable.
3. As a developer, I want the collection to maintain a single global `activeValue` across all nested branches, so that there are never multiple conflicting focused items in my menu system.
4. As a developer, I want the collection to compute a flattened, navigable array of currently visible items based on what branches are expanded, so that list navigation logic remains simple.
5. As a developer, I want to pass my `collection` into a redesigned `useListNavigation`, so that keyboard events (ArrowDown, ArrowRight) automatically traverse the data structure instead of relying on brittle DOM node queries.
6. As a developer, I want to bind the open/close state of my `<Float>` components to `collection.isExpanded(id)`, so that the UI perfectly reflects the single source of truth.
7. As a developer, I want `useClick` and `useHover` to be generic and tree-ignorant, so that I understand exactly why they behave the way they do without relying on internal library magic.
8. As a developer, I want to provide an `ignoreOutsideClick: (target) => boolean` predicate to `useClick`, so that I can use `collection.isTargetWithinBranch()` to explicitly prevent parent menus from closing when a user clicks a child menu.
9. As a developer, I want to call `collection.collapseAll()` inside my `onOutsideClick` handlers, so that I control exactly when and how the entire menu system resets.
10. As a library maintainer, I want `useCollection` to be a pure, DOM-agnostic data structure, so that I can unit test traversal and state mutations with 100% reliability.

## Implementation Decisions

- **New Deep Module:** Create `useCollection`, a pure data structure manager. It will expose reactive state (`activeValue`, `expandedValues`, `flattenedItems`) and mutators (`setNext()`, `expandBranch()`, `collapseAll()`).
- **Module Rewrite:** Completely redesign `useListNavigation` to strictly require a `useCollection` instance. It will map native `KeyboardEvent` keys to the collection's pure methods.
- **Module Modification:** Update `useClick`, `useHover`, `useFocusTrap`, and `useEscapeKey` to remove all internal references to `treeNodeBridge` or `createTreeInteraction`. Add generic escape hatch options such as `ignoreOutsideClick: (target: EventTarget) => boolean`.
- **Architectural Cleanup:** Delete the following files representing the old implicit tree monolith:
  - `src/composables/interactions/use-floating-tree.ts`
  - `src/composables/interactions/use-floating-tree-node.ts`
  - `src/composables/interactions/internal/tree-interaction.ts`
  - `src/composables/interactions/list-navigation/tree-coordination.ts`
- **Context Contract:** Remove `treeNode` and `FloatingTreeBridge` from the `FloatingContext` interfaces.

## Testing Decisions

- Tests should only assert external behavior (e.g., verifying `activeValue` updates correctly given an input state), not the internal implementation of how the collection iterates over the data.
- **`useCollection` Unit Tests:** This module will be heavily tested in isolation. We will test 1D traversals, 2D traversals, expanding/collapsing branches, and active state handoffs without mounting a single Vue component.
- **`useListNavigation` Integration Tests:** We will rewrite the existing list navigation tests to ensure that simulating `keydown` events correctly invokes the collection mutators.
- Prior art: Look at existing `tree-interaction.test.ts` to identify the edge cases that the new collection will need to cover (e.g., cascade closing).

## Out of Scope

- Modifying or automatically managing ARIA attributes (e.g., `role="menu"`, `aria-expanded`). This belongs strictly to Role management composables, adhering to the domain glossary.
- Providing visual UI components or styling for the menus.
- Complex multi-selection collections (this implementation focuses strictly on the single-active-node requirement of floating navigation).

## Further Notes

This architectural pivot aligns perfectly with VFloat's philosophy of providing composable, predictable primitives instead of black-box monolithic components. By shifting the complexity from an invisible coordinator into an explicit data structure, we dramatically lower the maintenance burden of the library while empowering the end user.
