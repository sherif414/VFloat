Status: ready-for-human

# Adapt client-point virtual anchors to context plus position

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Update pointer-driven virtual anchor behavior so it mutates the shared context refs and optionally requests positioning updates when a position result is present. Client-point behavior should remain independent from open-state ownership and should not require positioning unless the consumer wants JavaScript geometry updates.

This slice should preserve cursor-following and static pointer-anchor workflows under the new split.

## Acceptance criteria

- [x] Client-point behavior accepts the context-owner shape for anchor ref coordination.
- [x] Client-point behavior can optionally receive a position result or update function for geometry refreshes.
- [x] Client-point behavior does not create, own, or mutate open state.
- [x] Disabling client-point behavior restores the preserved anchor ref.
- [x] Tests cover pointer coordinate tracking with the new context shape.
- [x] Tests cover optional position update calls when a positioning result is provided.

## Blocked by

- `.scratch/floating-context-position-split/issues/01-create-floating-context-owner.md`
- `.scratch/floating-context-position-split/issues/02-add-use-position-composable.md`
