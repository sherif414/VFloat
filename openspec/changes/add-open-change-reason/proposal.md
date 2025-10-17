# Change: add-open-change-reason

- Status: Draft
- Owner: VFloat
- Tracker: VEX-67 — "Add some sort of way for different interactions to state their reason for changing open"

## Summary
Introduce a minimal, consistent mechanism for interactions to declare why they open/close a floating element, and allow consumers to observe these changes.

## Motivation
Today, composables like `useClick`, `useFocus`, `useHover`, and `useEscapeKey` call `context.setOpen(boolean)` without conveying the interaction source. Consumers cannot distinguish between changes caused by clicks vs. focus vs. escape, which limits analytics, a11y-adaptive UIs, and complex coordination (e.g., nested menus, modality).

## Scope (Minimal First)
- Add a strict union type `OpenChangeReason` to represent primary interaction causes.
- Extend `useFloating()` to accept `onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void`.
- Extend `FloatingContext.setOpen` to accept an optional `(reason?: OpenChangeReason, event?: Event)` argument and invoke the callback when provided.
- Update interaction composables to pass a concrete `reason` when they change `open`.

## Non-Goals (for this change)
- No new public event bus or global store.
- No deprecation of current boolean-only `setOpen`; back-compat preserved via optional params.
- No attempt to encode every possible sub-reason; keep the initial union small and extensible.

## Initial Reason Set
```ts
export type OpenChangeReason =
  | "anchor-click"        // clicking/tapping the anchor (mouse/touch) or synthetic click via keyboard
  | "keyboard-activate"   // Enter/Space activation when treated distinctly from pointer click
  | "outside-pointer"     // pointer-based outside interaction (click/mousedown/pointerdown)
  | "focus"               // focus acquisition opened the floating element
  | "blur"                // focus loss/transition closed it
  | "hover"               // pointer hover state toggled it
  | "escape-key"          // ESC key dismissed it
  | "tree-ancestor-close" // a parent/menu ancestor closed this node
  | "programmatic"        // consumer code changed it directly without an interaction context
```
Notes:
- "anchor-click" covers anchor pointer activation; if Enter/Space should be distinct, interactions can emit "keyboard-activate" instead.
- "outside-pointer" is intentionally generic across pointerdown/mousedown/click; the specific DOM event may be provided via the optional `event` parameter.

## API Changes (backward-compatible)
- FloatingContext
  - setOpen: from `(open: boolean)` to `(open: boolean, reason?: OpenChangeReason, event?: Event) => void`
- useFloating(options)
  - NEW: `onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void`

All existing code that calls `setOpen(boolean)` remains valid. Interactions will be updated to pass a reason. Consumers can start subscribing via `onOpenChange`.

## Affected Areas
- `src/composables/use-floating.ts` (types + `setOpen` implementation)
- `src/types.ts` (add `OpenChangeReason`)
- `src/composables/interactions/*` (pass appropriate reasons)
- Tests under `src/composables/__tests__/` (new/updated coverage)
- README/docs (API notes)

## Alternatives Considered
- Only adding an `onOpenChange` callback without modifying `setOpen`: rejected since interactions would still need a place to provide the reason; extending `setOpen` keeps a single authority for state mutations and preserves existing ergonomics.
- Emitting highly granular reasons per DOM event: deferred; the union can be expanded later if needed.

## Risks
- Minor refactors across interactions; mitigate via targeted tests.
- Over-specifying the union early. We keep the set minimal and additive.
