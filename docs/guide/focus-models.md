---
description: Choose the right focus behavior for anchored and floating UI.
---

# Focus Models

Focus behavior is one of the easiest places for floating UI to feel either polished or frustrating. VFloat gives you several focus-related tools, but they make more sense when you think in focus models rather than individual options.

There are two focus questions you will run into again and again:

- Where should DOM focus live?
- What should happen when focus moves?

## Model 1: Focus Stays On The Trigger

Sometimes the trigger should keep focus while the floating surface behaves like a lightweight companion. This is common for simple tooltips and combobox-like inputs with active descendants.

## Model 2: Focus Moves Into The Surface

Sometimes the floating content should become the focus destination. This is common for menus, action lists, dialogs, and modal content.

## `useFocus()` And Focus-Visible Behavior

[`useFocus`](/api/use-focus) is the composable that opens and closes a surface from focus and blur.

One important design detail is that it is keyboard-first by default. It respects focus-visible behavior, which means pointer-triggered focus does not automatically behave the same way as keyboard-triggered focus.

## Focus Trap: The Strongest Focus Model

[`useFocusTrap`](/api/use-focus-trap) is for surfaces that must hold focus inside while open.

This is what turns a generic floating panel into something dialog-like. It is especially important for modal flows, where letting focus slip behind the surface creates both usability and accessibility problems.

## Next Step

- Read [Keyboard Navigation](/guide/keyboard-navigation) for list-level focus decisions.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) for trapped focus flows.
- Read [List Navigation Gotchas](/guide/list-navigation-gotchas) for the most common focus mistakes in floating lists.
