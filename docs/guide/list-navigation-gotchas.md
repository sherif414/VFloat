---
description: Handle list navigation edge cases in complex floating menus.
---

# List Navigation Gotchas

List navigation bugs can feel subtle because the UI may look correct while the keyboard or screen reader behavior is slightly off.

## Stable Item Values Matter

`useListNavigation()` depends on a collection with stable string values. With `useTree()`, that means `getItemId` should return a durable ID that does not change between renders. If item values are unstable, active state, expansion state, and keyboard movement can drift away from the item the user sees.

## Disabled Items Need Real Navigation Rules

If an item is visually disabled but not accounted for in the collection's disabled predicate, keyboard navigation can land on something the user cannot actually use. Put disabled rules in `useTree({ isItemDisabled })`, then mirror the same state into ARIA with `useRole({ disabledIndices })` when you render a list.

## Virtual Focus Needs Stable IDs

With virtual focus, your render layer should map the active value to `aria-activedescendant`. If option element IDs are unstable or missing, screen reader behavior becomes unreliable even when the visual highlight looks fine.

## Next Step

- Read [Keyboard Navigation](/guide/keyboard-navigation) for the full setup.
- Read [Build Nested Menus](/guide/build-nested-menus) if child branches are involved.
