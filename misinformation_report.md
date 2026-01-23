# Misinformation Report

This report details the discrepancies found between the implementation/specification and the documentation.

## Summary

The `onOpenChange` feature, which provides a way to observe and distinguish why a floating element's `open` state changed, is not documented for any of the interaction composables. This feature is clearly defined in the `add-open-change-reason` specification and is implemented in the source code.

## Specification

The specification file `openspec/changes/add-open-change-reason/specs/interactions/spec.md` defines the `onOpenChange` function as follows:

- The `FloatingContext` MUST support `(open: boolean, reason?: OpenChangeReason, event?: Event)` when setting the open state.
- `useFloating(options)` MUST accept `onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void` to observe changes.
- All first-party interaction composables MUST pass an appropriate `reason` whenever they change `open`.

## Discrepancies

The following table details the discrepancies found between the implementation/specification and the documentation for each of the interaction composables:

| Composable | Implementation | Documentation |
| --- | --- | --- |
| `useClick` | Implements `onOpenChange` with `reason`. | Does **not** document `onOpenChange` or `reason`. |
| `useFocus` | Implements `onOpenChange` with `reason`. | Does **not** document `onOpenChange` or `reason`. |
| `useHover` | Implements `onOpenChange` with `reason`. | Does **not** document `onOpenChange` or `reason`. |
| `useEscapeKey` | Implements `onOpenChange` with `reason`. | Does **not** document `onOpenChange` or `reason`. |
