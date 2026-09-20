---
description: Handle list navigation edge cases in complex floating menus.
---

# List Navigation Gotchas

List navigation bugs can feel subtle because the UI may look correct while the keyboard or screen reader behavior is slightly off.

## Stable DOM element arrays matter

Keyboard navigation in VFloat is split across [`useRovingFocus`](/api/use-roving-focus) (physical DOM focus), [`useAriaActivedescendant`](/api/use-aria-activedescendant) (virtual focus), and [`useTypeahead`](/api/use-typeahead) (typeahead search).

For [`useRovingFocus`](/api/use-roving-focus) and [`useAriaActivedescendant`](/api/use-aria-activedescendant), the navigation composables track element positions via `elementsList`. Ensure the array of element refs aligns with the rendered DOM order. If items are dynamically added, removed, or filtered, update `elementsList` so indices remain in sync with rendered DOM nodes.

## Disabled items need real navigation rules

If an item is visually disabled or marked with `disabled` in the data model, keyboard navigation must know to skip it.

- In [`useRole`](/api/use-role), provide `disabledIndices: (idx) => isItemDisabled(idx)` to communicate disabled status to assistive tech.
- Ensure your roving focus or virtual focus ignores disabled indices so keyboard arrow navigation cannot land on inactive items.

## Virtual focus needs stable IDs

With virtual focus ([`useAriaActivedescendant`](/api/use-aria-activedescendant)), physical focus stays on the input while `aria-activedescendant` points to the ID of the highlighted option.

If option element IDs are unstable or missing, screen reader behavior becomes unreliable even when the visual highlight looks fine. Ensure each option rendered in your list has a deterministic, unique `id` attribute.

## Where to go next

- Read [Keyboard Navigation](/guide/keyboard-navigation) for the full setup.
- Read [Build Nested Menus](/guide/build-nested-menus) for multi-level menus.
