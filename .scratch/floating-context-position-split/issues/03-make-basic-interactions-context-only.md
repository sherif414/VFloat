Status: ready-for-human

# Make basic interaction composables work without positioning

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Update the interaction and semantic composables that only need refs and open state so they consume the new geometry-less floating context. A developer should be able to build a static dialog, sheet, command palette, or CSS-positioned panel with context state, click behavior, focus behavior, focus trap, Escape dismissal, role management, and list navigation without invoking `usePosition`.

## Acceptance criteria

- [x] `useClick` accepts the context-owner shape and has no positioning dependency.
- [x] `useFocus` accepts the context-owner shape and has no positioning dependency.
- [x] `useFocusTrap` accepts the context-owner shape and has no positioning dependency.
- [x] `useEscapeKey` accepts the context-owner shape and has no positioning dependency.
- [x] `useRole` accepts the context-owner shape and has no positioning dependency.
- [x] `useListNavigation` accepts the context-owner shape wherever it only needs refs and open state.
- [x] Integration coverage proves a geometry-less static surface can open, close, manage role attributes, trap focus, and dismiss via Escape.

## Blocked by

- `.scratch/floating-context-position-split/issues/01-create-floating-context-owner.md`
