Status: ready-for-human

# Decouple hover state from safe-polygon geometry

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Update hover behavior so basic hover-triggered open and close logic works with the geometry-less floating context. Geometry-sensitive safe-polygon behavior should receive placement or position data explicitly rather than requiring the context owner to contain positioning state.

This slice should make hover usable for static and CSS-positioned surfaces while keeping positioned safe-polygon flows available for tooltips, menus, and nested floating surfaces.

## Acceptance criteria

- [x] Basic `useHover(context, options)` works with the context-owner shape and no position result.
- [x] Safe-polygon behavior declares its geometry input explicitly through options or an attached positioning result.
- [x] `useHover` no longer assumes the context owner exposes placement.
- [x] Existing hover delay, enabled, close, and pointer-intent behavior remains covered.
- [x] Tests cover a geometry-less hover surface.
- [x] Tests cover a safe-polygon hover surface with explicit placement or position data.

## Blocked by

- `.scratch/floating-context-position-split/issues/01-create-floating-context-owner.md`
- `.scratch/floating-context-position-split/issues/02-add-use-position-composable.md`
