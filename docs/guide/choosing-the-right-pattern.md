---
description: Pick the floating pattern that best fits your interaction and content.
---

# Choosing the Right Pattern

Many floating UI problems look similar at first. A panel appears near an anchor, so it can be tempting to think every surface is just a popover with different content.

That usually leads to the wrong interaction model.

This page helps you choose between the main VFloat surface patterns so the behavior matches the user's expectations.

## Tooltip

Choose a tooltip when:

- the content is brief
- it behaves like a hint
- hover and focus are natural triggers

Start with [Build Accessible Tooltips](/guide/build-accessible-tooltips).

## Popover

Choose a popover when:

- the user clicks to open it
- the content is richer than a tooltip
- the user may interact with controls inside

Start with [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns).

## Dropdown Or Menu

Choose a menu-like dropdown when:

- the content is mostly a list of actions or options
- arrow-key navigation matters
- one item may lead to a child branch

Start with [Keyboard Navigation](/guide/keyboard-navigation) and [Build Nested Menus](/guide/build-nested-menus).

## Dialog

Choose a dialog when:

- the surface becomes the primary task
- focus should move into it and stay managed
- the user must meaningfully engage with the content before moving on

Start with [Build Dialogs and Modals](/guide/build-dialogs-and-modals).

## Context Menu Or Pointer-Based Surface

Choose a pointer-driven surface when:

- the anchor is really a coordinate, not a stable element
- the surface should open at the pointer location
- cursor position is part of the interaction model

Start with [Use Virtual Anchors](/guide/use-virtual-anchors).

## Next Step

Pick the matching build guide from the sections above and then move into the relevant concept page if you want the deeper mental model.
