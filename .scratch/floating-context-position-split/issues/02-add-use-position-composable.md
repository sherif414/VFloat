Status: ready-for-human

# Add `usePosition` as an opt-in geometry composable

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Create a positioning composable that accepts the floating context as its first argument and owns only JavaScript geometry behavior. `usePosition` should compute coordinates, placement, strategy, middleware data, generated styles, manual updates, middleware registration, and auto-update wiring without creating or mutating open state.

This slice should make a basic positioned tooltip or popover possible by composing `useFloatingContext` with `usePosition`.

## Acceptance criteria

- [x] `usePosition(context, options)` is exported as the public geometry entrypoint.
- [x] `usePosition` accepts placement, strategy, transform, middleware, auto-update, and enabled-style options as positioning concerns.
- [x] `usePosition` returns coordinates, resolved placement, strategy, middleware data, positioned state, styles, and an update function.
- [x] `usePosition` uses context refs for anchor and floating elements.
- [x] `usePosition` does not create, own, or mutate context open state.
- [x] Auto-update listeners are registered only when positioning is enabled and the required elements exist.
- [x] Positioning tests cover computation, styles, middleware data, manual update, option reactivity, enabled gating, and cleanup.

## Blocked by

- `.scratch/floating-context-position-split/issues/01-create-floating-context-owner.md`
