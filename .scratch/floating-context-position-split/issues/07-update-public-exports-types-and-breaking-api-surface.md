Status: ready-for-human

# Update public exports, types, and breaking API surface

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Align the public package surface with the new context-plus-position architecture. The exported composables and public companion types should make the new responsibility boundary obvious, remove stale monolithic-root types, and keep VFloat's grouped vocabulary for context-owned refs and state plus position-owned geometry.

This slice is the API cleanup pass that makes the breaking change coherent for consumers.

## Acceptance criteria

- [x] Public exports expose the context owner and positioning composable under the agreed working names.
- [x] Public exports no longer expose the old monolithic `useFloating(anchorEl, floatingEl, options)` API.
- [x] Public types distinguish the context-owner shape from positioning return data.
- [x] Interaction context types use the narrowest required context shape.
- [x] Positioning-specific types do not imply ownership of open state.
- [x] Type-focused tests or compile checks catch old monolithic usage where practical.

## Blocked by

- `.scratch/floating-context-position-split/issues/01-create-floating-context-owner.md`
- `.scratch/floating-context-position-split/issues/02-add-use-position-composable.md`
- `.scratch/floating-context-position-split/issues/03-make-basic-interactions-context-only.md`
- `.scratch/floating-context-position-split/issues/04-decouple-hover-safe-polygon-geometry.md`
- `.scratch/floating-context-position-split/issues/05-move-arrow-and-middleware-ownership-to-position.md`
- `.scratch/floating-context-position-split/issues/06-adapt-client-point-to-context-plus-position.md`
