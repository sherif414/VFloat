# List Navigation Gotchas

List navigation bugs can feel subtle because the UI may look correct while the keyboard or screen reader behavior is slightly off.

## Stable Item Refs Matter

`useListNavigation()` depends on a live list of item elements in DOM order. If the refs are incomplete, stale, or out of order, the navigation model will feel inconsistent.

## Disabled Items Need Real Navigation Rules

If an item is visually disabled but not accounted for in `disabledIndices`, the active index can land on something the user cannot actually use.

## Virtual Focus Needs Stable IDs

With virtual focus, the anchor uses `aria-activedescendant` to identify the active option. If option IDs are unstable or missing, screen reader behavior becomes unreliable even when the visual highlight looks fine.

## Next Step

- Read [Keyboard Navigation](/guide/keyboard-navigation) for the full setup.
- Read [Build Nested Menus](/guide/build-nested-menus) if child branches are involved.
