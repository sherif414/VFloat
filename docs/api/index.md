---
description: A reference index for VFloat's public composables and middleware.
---

# API Reference

These pages define the public surface of VFloat. Use the guide pages for the mental model and workflows; use the API pages when you need exact signatures, options, defaults, and return values.

## How To Read These Pages

Composable pages (`useX`) follow Type / Options / Returns / Details / Example / See Also. Middleware pages (`offset`, `flip`, `shift`) use the compact Type / Options / Details / Example / See Also.

## Start With The Guide

- [Guide Overview](/guide/) - Learn how the guide section is organized and choose a starting path
- [First Tooltip](/guide/first-tooltip) - Build your first floating surface step by step
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Add click, dismissal, and keyboard behavior
- [Keep Content in View](/guide/keep-content-in-view) - Refine positioning with offset, flip, shift, and more

## Positioning

- [`useFloatingNode`](/api/use-floating-node) - Creates a standalone node with shared refs and open state
- [`useFloatingTree`](/api/use-floating-tree) - Coordinates related nodes such as nested menus
- [`usePosition`](/api/use-position) - Positions a floating element relative to an anchor element
- [`useArrow`](/api/use-arrow) - Connects an arrow element to a floating node
- [`useClientPoint`](/api/use-client-point) - Positions a floating element relative to pointer coordinates

## Interactions

- [`useClick`](/api/use-click) - Opens and closes floating content on click
- [`useHover`](/api/use-hover) - Opens and closes floating content on hover
- [`useFocus`](/api/use-focus) - Opens and closes floating content on focus
- [`useFocusManager`](/api/use-focus-manager) - Orchestrates initial focus, trapping, guards, and return focus
- [`useEscapeKey`](/api/use-escape-key) - Closes floating content when Escape is pressed
- [`useOutsideClick`](/api/use-outside-click) - Closes floating content when pointer input lands outside
- [`useRole`](/api/use-role) - Synchronizes ARIA roles and states for floating surfaces

## Collections

- [`useCollection`](/api/use-collection) - Manages a headless string-value model for keyboard navigation
- [`useRovingFocus`](/api/use-roving-focus) - Moves physical DOM focus between items with roving tabindex
- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Highlights options virtually while focus stays on an input
- [`useTypeahead`](/api/use-typeahead) - Coordinates keyboard typeahead search and jumping across items

## Middleware

- [`arrow`](/api/arrow) - Aligns an arrow with the reference element
- [`autoPlacement`](/api/autoplacement) - Chooses a placement that fits available space
- [`flip`](/api/flip) - Switches to another placement when space is limited
- [`hide`](/api/hide) - Exposes visibility state for clipped anchors and escaped floating elements
- [`inline`](/api/inline) - Positions relative to multi-line inline anchors
- [`offset`](/api/offset) - Adds distance between the reference and floating element
- [`shift`](/api/shift) - Keeps the floating element within view
- [`size`](/api/size) - Measures available space for sizing the floating element
