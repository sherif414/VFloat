Status: completed

## Parent

c:\projects\VFloat\.scratch\unified-collection\PRD.md

## What to build

Implement the foundational `useCollection` primitive designed to handle 1D flat arrays of data. This module must expose reactive state for the currently active item (`activeValue`) and provide mutators for traversal (e.g., `setNext`, `setPrevious`). Alongside this, completely rewrite `useListNavigation` to abandon its current DOM-array-based logic. The rewritten `useListNavigation` must strictly require a `useCollection` instance and bind native `KeyboardEvent` keys (ArrowDown, ArrowUp, Home, End) to the collection's traversal methods.

## Acceptance criteria

- [x] `useCollection` is implemented and can be initialized with a flat array of data items and an `itemValue` key getter.
- [x] `useCollection` successfully manages a single `activeValue` and exposes pure methods to mutate it.
- [x] `useListNavigation` is rewritten to accept `collection` instead of `listRef` and `activeIndex`.
- [x] Pressing `ArrowDown` and `ArrowUp` inside a floating list correctly updates the collection's `activeValue`.
- [x] All 1D navigation tests are updated to verify collection state mutations rather than internal DOM traversal.

## Blocked by

None - can start immediately
