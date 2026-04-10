# Guide Overview

VFloat helps you build floating surfaces such as tooltips, popovers, menus, dialogs, and cursor-following panels. It gives you the positioning layer, the interaction layer, and the shared state model that lets those pieces work together cleanly.

This guide section is meant to teach the library, not just list APIs. The goal is that you leave with two things:

- You can build the floating behavior you came here to build.
- You understand why the pattern works, so you can adapt it later.

## What VFloat Is And Is Not

VFloat gives you low-level building blocks for floating UI in Vue:

- [`useFloating`](/api/use-floating) computes position and exposes the shared `context`.
- Interaction composables such as [`useHover`](/api/use-hover), [`useClick`](/api/use-click), [`useFocus`](/api/use-focus), and [`useEscapeKey`](/api/use-escape-key) decide when that surface opens and closes.
- `middlewares` such as [`offset`](/api/offset), [`flip`](/api/flip), and [`shift`](/api/shift) refine the final placement.

VFloat is not:

- A component library with ready-made dropdowns and tooltips
- A design system
- A direct fork of Floating UI

It is closer to a toolkit. You bring your own markup, styles, and product rules. VFloat gives you the positioning and interaction primitives.

## How To Read These Docs

The guide is organized into five sections.

### Getting Started

Start here if you are new to VFloat. These pages are meant to be read in order.

- [First Tooltip](/guide/first-tooltip)
- [First Popover](/guide/first-popover)
- [Control Open State](/guide/control-open-state)

### Guides

Use these pages when you have a concrete job to do.

- [Build Accessible Tooltips](/guide/build-accessible-tooltips)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
- [Keep Content in View](/guide/keep-content-in-view)
- [Use Virtual Anchors](/guide/use-virtual-anchors)
- [Keyboard Navigation](/guide/keyboard-navigation)
- [Build Nested Menus](/guide/build-nested-menus)
- [Build Dialogs and Modals](/guide/build-dialogs-and-modals)

### Concepts

These pages explain how to think about VFloat.

- [Floating Context](/guide/floating-context)
- [Placement and Positioning](/guide/placement-and-positioning)
- [Middleware Pipeline](/guide/middleware-pipeline)
- [Interaction Model](/guide/interaction-model)
- [Focus Models](/guide/focus-models)

### Design Notes

These pages explain why the library is shaped the way it is and how to choose between patterns.

- [Choosing the Right Pattern](/guide/choosing-the-right-pattern)
- [Controlled vs Uncontrolled](/guide/controlled-vs-uncontrolled)
- [VFloat and Floating UI](/guide/vfloat-and-floating-ui)
- [Tree Coordination Explained](/guide/tree-coordination-explained)

### Deep Dives

These are the pages you read when something feels subtle, sticky, or surprising in a real app.

- [Safe Polygon Gotchas](/guide/safe-polygon-gotchas)
- [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas)
- [Virtual Anchor Gotchas](/guide/virtual-anchor-gotchas)
- [List Navigation Gotchas](/guide/list-navigation-gotchas)
- [Tree Debugging](/guide/tree-debugging)

## A Good Starting Path

If you are not sure where to begin, use this path:

1. Read [First Tooltip](/guide/first-tooltip).
2. Read [First Popover](/guide/first-popover).
3. Read [Floating Context](/guide/floating-context).
4. Pick the task guide that matches what you need to build.

If you already know the kind of surface you need, you can jump straight to the matching guide:

- Tooltip: [Build Accessible Tooltips](/guide/build-accessible-tooltips)
- Popover or dropdown: [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
- Context menu or cursor-following UI: [Use Virtual Anchors](/guide/use-virtual-anchors)
- Nested menu: [Build Nested Menus](/guide/build-nested-menus)
- Dialog: [Build Dialogs and Modals](/guide/build-dialogs-and-modals)

## Keep The Contract Boundary In Mind

These guide pages are intentionally explanatory and practical, but they are not the contract source.

- Use the guide when you want workflow, mental models, tradeoffs, and examples.
- Use the [API Reference](/api/) when you need exact signatures, defaults, and return shapes.

That split keeps the guides readable and the API pages precise.

## Next Step

Start with [First Tooltip](/guide/first-tooltip). It gives you the fastest path to understanding the core VFloat loop: anchor, floating element, shared `context`, interaction composable, and middleware.
