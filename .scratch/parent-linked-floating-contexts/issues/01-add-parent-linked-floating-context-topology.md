# Add parent-linked floating context topology

Status: ready-for-human

## What to build

Add `parentContext` support to `useFloatingContext()` so floating contexts can declare parent-child topology without expanding the public `FloatingContext` interface. Store the topology in hidden internals and use it to close descendants when a parent context closes through VFloat state helpers.

## Acceptance criteria

- [x] `useFloatingContext({ refs, parentContext })` links child contexts to their parent.
- [x] Child links unregister on Vue scope disposal.
- [x] `context.state.setOpen(false, reason, event)` closes descendants deepest-first.
- [x] Opening a child does not open ancestors.
- [x] Direct controlled `open.value = false` writes do not cascade.

## Blocked by

None - can start immediately.
