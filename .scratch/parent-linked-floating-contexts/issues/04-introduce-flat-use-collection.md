# Introduce flat useCollection

Status: ready-for-human

## What to build

Add `useCollection()` as the flat value-list primitive for list navigation. It should provide the `NavigableCollection` behavior that `useListNavigation()` needs without requiring callers to model full item trees.

## Acceptance criteria

- [x] `useCollection({ values, isValueDisabled })` returns a `NavigableCollection`.
- [x] Collection owns uncontrolled `activeValue`.
- [x] Movement methods support first, last, next, previous, loop, and disabled skipping.
- [x] `useListNavigation(context, { collection })` works with the new collection.

## Blocked by

None - can start immediately.
