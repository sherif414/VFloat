## ADDED Requirements

### Requirement: Reasoned Open State Changes
The system SHALL provide a way to observe and distinguish why a floating element's `open` state changed, with reasons emitted by interactions.

- The `FloatingContext` MUST support `(open: boolean, reason?: OpenChangeReason, event?: Event)` when setting the open state.
- `useFloating(options)` MUST accept `onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void` to observe changes.
- All first-party interaction composables MUST pass an appropriate `reason` whenever they change `open`.
- The design MUST be backward compatible with existing `(open: boolean)` callers.

#### Scenario: Consumer observes reason for anchor activation
- GIVEN a consumer passes `onOpenChange` to `useFloating`
- AND `useClick()` is enabled on the same context
- WHEN the anchor is activated by primary mouse click
- THEN `onOpenChange` MUST be called with `(true, "anchor-click", MouseEvent)`

#### Scenario: Consumer observes reason for keyboard activation
- GIVEN `useClick()` is enabled with keyboard interactions not ignored
- WHEN the user activates via Enter/Space and it is treated distinctly
- THEN `onOpenChange` SHOULD be called with `(true, "keyboard-activate", KeyboardEvent)`

#### Scenario: Outside pointer closes with reason
- GIVEN `useClick({ outsideClick: true })`
- WHEN user triggers an outside pointer interaction that should close
- THEN `onOpenChange` MUST be called with `(false, "outside-pointer", <Pointer/MouseEvent>)`

#### Scenario: Focus opens and blur closes with reasons
- GIVEN `useFocus()` is enabled
- WHEN focus acquisition opens the floating element
- THEN `onOpenChange` MUST be called with `(true, "focus", FocusEvent)`
- AND WHEN subsequent focus transition causes closing
- THEN `onOpenChange` MUST be called with `(false, "blur", FocusEvent)`

#### Scenario: Hover toggles with reasons
- GIVEN `useHover()` is enabled
- WHEN hover opens or closes the floating element
- THEN `onOpenChange` MUST be called with `(true|false, "hover", PointerEvent)`

#### Scenario: Escape key dismisses with reason
- GIVEN `useEscapeKey()` is enabled
- WHEN Escape is pressed while the floating element is open
- THEN `onOpenChange` MUST be called with `(false, "escape-key", KeyboardEvent)`

#### Scenario: Tree ancestor closes with reason
- GIVEN nested floating nodes managed by `useFloatingTree()`
- WHEN an ancestor closes a descendant as part of tree coordination
- THEN descendant closures MUST use `(false, "tree-ancestor-close")`

#### Scenario: Programmatic changes without interaction
- GIVEN consumer code calls `context.setOpen(true|false)` without an event
- THEN the change MUST use reason `"programmatic"` if no explicit reason is provided

### Requirement: Initial Reason Set
The system SHALL define a minimal extensible union for reasons:

- `"anchor-click"`
- `"keyboard-activate"`
- `"outside-pointer"`
- `"focus"`
- `"blur"`
- `"hover"`
- `"escape-key"`
- `"tree-ancestor-close"`
- `"programmatic"`

At least one scenario per first-party interaction (click, focus, hover, escape) MUST map to one of the above reasons.

#### Scenario: Reasons union includes required literals
- GIVEN the library types are compiled
- WHEN a consumer imports `OpenChangeReason`
- THEN the union MUST include all of the following string literals:
  - "anchor-click"
  - "keyboard-activate"
  - "outside-pointer"
  - "focus"
  - "blur"
  - "hover"
  - "escape-key"
  - "tree-ancestor-close"
  - "programmatic"
