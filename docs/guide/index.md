---
description: An overview of the guide section and a suggested path through the VFloat docs.
---

# Guide Overview

This guide is here to help you build tooltips, popovers, menus, dialogs, and other floating surfaces in Vue with VFloat.

You can read it straight through if you are new to the library, or jump to the part that matches what you are building.

The goal is simple:

- You can build the floating behavior you came here to build.
- You understand why the pattern works, so you can adapt it later.

## What VFloat Is And Is Not

VFloat gives you low-level building blocks for floating UI in Vue.

It is heavily inspired by [Floating UI](https://floating-ui.com/), so some ideas and API names may look familiar. At the same time, VFloat has its own shape, so it is worth learning it as VFloat.

The basic pieces are:

- [`useFloating`](/api/use-floating) computes position and exposes the shared `context`.
- Interaction composables such as [`useHover`](/api/use-hover), [`useClick`](/api/use-click), [`useFocus`](/api/use-focus), and [`useEscapeKey`](/api/use-escape-key) decide when that surface opens and closes.
- `middlewares` such as [`offset`](/api/offset), [`flip`](/api/flip), and [`shift`](/api/shift) refine the final placement.

VFloat is not:

- A component library with ready-made dropdowns and tooltips
- A design system

It is closer to a toolkit. You bring the markup, styles, and product decisions. VFloat handles the positioning and interaction primitives.

## How To Read These Docs

The guide is split into five sections.

### Getting Started

Start here if you are new to VFloat. These pages walk through the basic shape of the library one step at a time.

### Guides

Use these when you have a concrete job to do, like building a tooltip, dropdown, dialog, or nested menu.

### Concepts

These pages explain the mental model behind VFloat: the shared context, positioning, middleware, and interaction patterns.

### Design Notes

These pages explain why the library is shaped the way it is, and where some of the design tradeoffs come from.

### Deep Dives

These are the pages to read when something feels subtle, surprising, or hard to debug in a real app.

## A Good Starting Path

If you are not sure where to begin, this is a good path:

1. Read [First Tooltip](/guide/first-tooltip).
2. Read [First Popover](/guide/first-popover).
3. Read [Floating Context](/guide/floating-context).
4. Pick the task guide that matches what you need to build.

If you already know what you want to build, you can jump straight to the matching guide:

- Tooltip: [Build Accessible Tooltips](/guide/build-accessible-tooltips)
- Popover or dropdown: [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
- Context menu or cursor-following UI: [Use Virtual Anchors](/guide/use-virtual-anchors)
- Nested menu: [Build Nested Menus](/guide/build-nested-menus)
- Dialog: [Build Dialogs and Modals](/guide/build-dialogs-and-modals)

## Keep The Contract Boundary In Mind

These guide pages are meant to teach the workflow and the mental model. They are not the contract source.

- Use the guide when you want workflow, mental models, tradeoffs, and examples.
- Use the [API Reference](/api/) when you need exact signatures, defaults, and return shapes.

That split keeps the guides easier to read and the API pages precise.

## Next Step

Start with [First Tooltip](/guide/first-tooltip). It is the smallest example, and it gives you a good feel for how the main pieces fit together.
