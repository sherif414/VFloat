Status: ready-for-human

# Refresh docs and migration examples for context plus position

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Update the documentation and examples so the new mental model is the first thing users see: create a floating context, add behavior composables, and opt into positioning only when JavaScript geometry is needed. Include migration guidance from the removed monolithic entrypoint to the new context-plus-position flow.

This slice should leave the docs with both a geometry-less surface example and a positioned tooltip or menu example.

## Acceptance criteria

- [x] API docs exist for the context owner and `usePosition`.
- [x] The old monolithic root documentation is removed or rewritten to the new model.
- [x] Interaction docs show context-only usage where positioning is not required.
- [x] Positioning docs show `usePosition(context, options)` as one optional behavior composable.
- [x] At least one geometry-less dialog, sheet, or command-palette example is documented.
- [x] At least one positioned tooltip or menu example is documented.
- [x] Migration notes show how to move from old monolithic usage to context plus position.
- [x] Docs navigation and related links are updated so the new pages are discoverable.

## Blocked by

- `.scratch/floating-context-position-split/issues/07-update-public-exports-types-and-breaking-api-surface.md`
