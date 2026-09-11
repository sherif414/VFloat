---
description: Canonical API reference and composable index for VFloat.
---

# API Reference

VFloat provides composable primitives for building anchored floating interfaces in Vue 3. Each composable handles one focused responsibility: lifecycle and refs, positioning calculations, interaction listeners, accessibility semantics, or keyboard navigation.

Use the [Guides](/guide/) to learn end-to-end workflows and architectural principles. Use these API reference pages when you need exact signatures, options, return shapes, and integration contracts.

## Choose Primitives by Goal

Pick the combination of composables and middleware that matches your interface pattern:

| Interface Pattern | Primary Composables | Suggested Middleware | Guide |
| --- | --- | --- | --- |
| **Tooltip** | [`useFloatingNode`](/api/use-floating-node), [`useHover`](/api/use-hover), [`usePosition`](/api/use-position) | `offset`, `flip`, `shift`, `arrow` | [Build Accessible Tooltips](/guide/build-accessible-tooltips) |
| **Popover / Dropdown** | [`useFloatingNode`](/api/use-floating-node), [`useClick`](/api/use-click), [`useDismiss`](/api/use-dismiss), [`usePosition`](/api/use-position) | `offset`, `flip`, `shift` | [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) |
| **Dialog / Modal** | [`useFloatingNode`](/api/use-floating-node), [`useFocusTrap`](/api/use-focus-trap), [`useDismiss`](/api/use-dismiss), [`useRole`](/api/use-role) | None (CSS centered) | [Build Dialogs and Modals](/guide/build-dialogs-and-modals) |
| **ContextMenu / Cursor** | [`useFloatingNode`](/api/use-floating-node), [`useClientPoint`](/api/use-client-point), [`useDismiss`](/api/use-dismiss), [`usePosition`](/api/use-position) | `flip`, `shift` | [Use Virtual Anchors](/guide/use-virtual-anchors) |
| **Menu with Roving Focus** | [`useFloatingNode`](/api/use-floating-node), [`useRovingFocus`](/api/use-roving-focus), [`useClick`](/api/use-click), [`useDismiss`](/api/use-dismiss) | `offset`, `flip`, `shift` | [Keyboard Navigation](/guide/keyboard-navigation) |
| **Nested Menu Tree** | [`useFloatingTree`](/api/use-floating-tree), [`useFloatingNode`](/api/use-floating-node), [`useRovingFocus`](/api/use-roving-focus), [`useDismiss`](/api/use-dismiss) | `offset`, `flip` | [Build Nested Menus](/guide/build-nested-menus) |
| **Combobox / Autocomplete** | [`useAriaActivedescendant`](/api/use-aria-activedescendant), [`useTypeahead`](/api/use-typeahead), [`usePosition`](/api/use-position) | `offset`, `flip`, `size` | [Keyboard Navigation](/guide/keyboard-navigation) |

## Core

Core primitives manage node identity, shared element references, open/close lifecycle, and multi-node tree hierarchies.

| Composable | Description |
| --- | --- |
| [`useFloatingNode`](/api/use-floating-node) | Creates a standalone floating node with element refs, open state, and change reasons. |
| [`useFloatingTree`](/api/use-floating-tree) | Coordinates related nodes in a tree hierarchy for nested menus, cascades, and family dismissal. |

## Positioning

Positioning composables compute screen coordinates, run the middleware pipeline, listen to viewport changes, and generate style bindings.

| Composable | Description |
| --- | --- |
| [`usePosition`](/api/use-position) | Computes reactive coordinates and inline styles for a floating node using Floating UI. |
| [`useArrow`](/api/use-arrow) | Registers an arrow element with the positioning pipeline and returns computed arrow styles. |
| [`useClientPoint`](/api/use-client-point) | Positions a floating element relative to pointer coordinates using a virtual anchor. |

## Interactions

Interaction composables attach DOM event listeners to the anchor or document to open, close, and manage focus for floating surfaces.

| Composable | Description |
| --- | --- |
| [`useClick`](/api/use-click) | Toggles open state from click, tap, or keyboard activation on the anchor. |
| [`useHover`](/api/use-hover) | Opens and closes floating content on pointer hover with delay and safe polygon tracking. |
| [`useFocus`](/api/use-focus) | Opens and closes floating content when the anchor gains or loses keyboard focus. |
| [`useFocusTrap`](/api/use-focus-trap) | Manages modal focus containment, boundary sentinels, background isolation, and return focus. |
| [`useDismiss`](/api/use-dismiss) | Dismisses open floating surfaces on Escape key presses and outside pointer interactions. |
| [`useRole`](/api/use-role) | Synchronizes ARIA roles, popup states, and accessibility relationships on anchor and panel. |

## Keyboard Navigation

Primitives for managing keyboard navigation patterns in dropdowns, menus, and comboboxes.

| Composable | Description |
| --- | --- |
| [`useRovingFocus`](/api/use-roving-focus) | Moves physical DOM focus between elements in composite widgets using roving `tabindex`. |
| [`useAriaActivedescendant`](/api/use-aria-activedescendant) | Virtual focus keeping DOM focus on an input while highlighting options via `aria-activedescendant`. |
| [`useTypeahead`](/api/use-typeahead) | Captures rapid typing sequences to jump directly to matching items in a list. |

## Middleware

Positioning middleware runs sequentially inside `usePosition` to modify placement, prevent collisions, add spacing, or measure boundary constraints.

Configure them declaratively inside `usePosition(node, { middlewares: { ... } })` or pass middleware instances directly.

| Middleware | Pipeline Phase | Declarative Key | Description |
| --- | --- | --- | --- |
| [`offset`](/api/offset) | 1. Distance | `offset: 8` | Adds distance along the main and cross axes between anchor and panel. |
| [`flip`](/api/flip) | 2. Collision | `flip: true` | Flips to the opposite or fallback placement when space is constrained. |
| [`shift`](/api/shift) | 3. Boundary | `shift: true` | Nudges the floating element along its axis to remain inside the viewport. |
| [`autoPlacement`](/api/autoplacement) | 4. Placement | `autoPlacement: true` | Selects the placement with the greatest available space (alternative to `flip`). |
| [`size`](/api/size) | 5. Sizing | `size: { apply }` | Measures available space to resize or constrain panel dimensions. |
| [`inline`](/api/inline) | 6. Geometry | `inline: true` | Positions relative to individual client rects for multi-line inline triggers. |
| [`arrow`](/api/arrow) | 7. Decorator | `arrow: true` | Positions an arrow element aligned with the anchor. |
| [`hide`](/api/hide) | 8. Visibility | `hide: true` | Detects when the anchor is clipped or when the panel escapes its boundary. |

## Conventions Across APIs

- **Reactivity:** Options accept plain values, Vue refs, or getter functions (`MaybeRefOrGetter<T>`). Changes automatically re-evaluate active composables.
- **Node Coupling:** Every composable in a floating surface accepts the same `FloatingNode` created by [`useFloatingNode`](/api/use-floating-node).
- **Style Binding:** `usePosition` returns `{ styles }`, a readonly ref to inline CSS properties (`position`, `left`, `top`, `transform`). Bind it directly in templates with `:style="styles"`.
