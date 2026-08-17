---
description: Choose the right focus behavior for anchored and floating UI.
---

# Focus Models

Focus behavior is one of the easiest places for floating UI to feel either polished or frustrating. VFloat gives you several focus-related tools, but they make more sense when you think in focus models instead of individual options.

There are two focus questions you will run into again and again:

- Where should DOM focus live?
- What should happen when focus moves?

## Model 1: Focus Stays On The Trigger

Sometimes the trigger should keep focus while the floating surface behaves like a lightweight companion. This is common for simple tooltips and combobox-like inputs with active descendants.

- [`useFocus`](/api/use-focus) detects when the trigger receives `:focus-visible` to open the surface, and closes on blur.
- Focus never leaves the input or trigger.

## Model 2: Focus Moves Into The Surface

Sometimes the floating content should become the focus destination. This is common for menus, action lists, dialogs, and modal content.

- [`useFocusManager`](/api/use-focus-manager) handles the entire surface focus lifecycle: routing initial focus inside on open, trapping or wrapping <kbd>Tab</kbd> navigation, guarding portal boundaries from focus leaks, isolating outside content with `inert`, and returning focus to the trigger on close.

## `useFocus()` And Focus-Visible Behavior

[`useFocus`](/api/use-focus) is the composable that opens and closes a surface from anchor focus and blur.

One important detail is that it is keyboard-first by default. It respects focus-visible behavior, which means pointer-triggered focus does not automatically behave the same way as keyboard-triggered focus.

## `useFocusManager()`: Surface Focus Orchestration

[`useFocusManager`](/api/use-focus-manager) is for surfaces that take focus or must contain focus while open.

- **Modals & Dialogs**: Traps focus inside, wraps <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>, and applies `inert` to the outside page.
- **Portal Guards**: Automatically places invisible sentinels around portaled floating panels to keep focus from escaping into the browser chrome.
- **Return Focus**: Safely restores focus to the trigger on close without viewport jumps.

## Next Step

- Read [Keyboard Navigation](/guide/keyboard-navigation) for list-level focus decisions.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) for modal focus flows.
- Read [List Navigation Gotchas](/guide/list-navigation-gotchas) for the most common focus mistakes in floating lists.
