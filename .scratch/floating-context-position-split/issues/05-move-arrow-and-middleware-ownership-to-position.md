Status: ready-for-human

# Move arrow and middleware ownership to positioning

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Adapt arrow behavior and middleware registration so they attach to the positioning composable rather than the open-state context owner. Arrow placement should be driven by positioning middleware data and resolved placement, while the shared context continues to own only refs and state.

This slice should keep arrow-positioned tooltips and popovers possible after positioning is no longer part of the core context.

## Acceptance criteria

- [x] Arrow behavior depends on a position result or positioning-specific capability rather than state ownership.
- [x] Arrow middleware registration is owned by the positioning layer.
- [x] Arrow refs still coordinate with the shared floating context where needed.
- [x] Arrow coordinate and style output still derives from middleware data and resolved placement.
- [x] Tests cover arrow middleware registration through positioning.
- [x] Tests cover arrow styles for at least the primary placement directions.

## Blocked by

- `.scratch/floating-context-position-split/issues/02-add-use-position-composable.md`
