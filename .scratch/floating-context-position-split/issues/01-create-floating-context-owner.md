Status: ready-for-human

# Create the `useFloatingContext` owner and remove the monolithic root

## Parent

`C:\Users\creaz\.codex\worktrees\6d5d\VFloat\.scratch\floating-context-position-split\PRD.md`

## What to build

Introduce the new floating context owner as the public root for refs, open state, reasoned state changes, and context identity. Remove the old `useFloating(anchorEl, floatingEl, options)` monolithic entrypoint so positioning no longer appears to be the core composable.

This slice should leave VFloat with a usable geometry-less context that other behavior composables can accept, even before `usePosition` is implemented.

## Acceptance criteria

- [x] A public context-owner composable exists under the working name `useFloatingContext`.
- [x] The context owner creates and exposes grouped `refs` and `state` data.
- [x] The context owner owns default and controlled open state.
- [x] `state.setOpen(open, reason?, event?)` preserves open-change reasons and source events.
- [x] Setting the current open state is a no-op and does not emit duplicate open-change callbacks.
- [x] The old `useFloating(anchorEl, floatingEl, options)` public entrypoint is removed rather than preserved as a compatibility wrapper.
- [x] Context-owner tests cover refs, default open state, controlled open state, reason fallback, event forwarding, and duplicate no-op behavior.

## Blocked by

None - can start immediately
