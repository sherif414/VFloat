---
title: API Reference
description: Canonical API reference and composable index for VFloat.
navigation:
  title: Overview
  icon: i-lucide-file-text
---

VFloat provides composable primitives for building anchored floating interfaces in Vue 3. Each composable handles one focused responsibility: lifecycle and refs, positioning calculations, interaction listeners, accessibility semantics, or keyboard navigation.

Use the [Guides](/guide/getting-started/introduction) to learn end-to-end workflows and architectural principles. Use these API reference pages when you need exact signatures, options, return shapes, and integration contracts.

## Choose Primitives by Goal

Pick the combination of composables and middleware that matches your interface pattern:

| Interface Pattern           | Primary Composables                                                                                                                                                                                                                                                      | Suggested Middleware               | Guide                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| **Tooltip**                 | [`useFloatingNode`](/api/core/use-floating-node), [`useHover`](/api/interactions/use-hover), [`usePosition`](/api/positioning/use-position)                                                                                                                              | `offset`, `flip`, `shift`, `arrow` | [Tooltips](/guide/components/build-accessible-tooltips)                |
| **Popover / Dropdown**      | [`useFloatingNode`](/api/core/use-floating-node), [`useClick`](/api/interactions/use-click), [`useOutsideClick`](/api/interactions/use-outside-click), [`useEscapeKey`](/api/interactions/use-escape-key), [`usePosition`](/api/positioning/use-position)                | `offset`, `flip`, `shift`          | [Popovers & Dropdowns](/guide/components/build-popovers-and-dropdowns) |
| **Dialog / Modal**          | [`useFloatingNode`](/api/core/use-floating-node), [`useFocusTrap`](/api/interactions/use-focus-trap), [`useEscapeKey`](/api/interactions/use-escape-key), [`useOutsideClick`](/api/interactions/use-outside-click), [`useRole`](/api/interactions/use-role)              | None (CSS centered)                | [Dialogs & Modals](/guide/components/build-dialogs-and-modals)         |
| **ContextMenu / Cursor**    | [`useFloatingNode`](/api/core/use-floating-node), [`useClientPoint`](/api/positioning/use-client-point), [`useOutsideClick`](/api/interactions/use-outside-click), [`useEscapeKey`](/api/interactions/use-escape-key), [`usePosition`](/api/positioning/use-position)    | `flip`, `shift`                    | [Virtual Anchors](/guide/positioning/virtual-anchors)                  |
| **Menu with Roving Focus**  | [`useFloatingNode`](/api/core/use-floating-node), [`useRovingFocus`](/api/keyboard-navigation/use-roving-focus), [`useClick`](/api/interactions/use-click), [`useOutsideClick`](/api/interactions/use-outside-click), [`useEscapeKey`](/api/interactions/use-escape-key) | `offset`, `flip`, `shift`          | [Keyboard Navigation](/guide/accessibility/keyboard-navigation)        |
| **Nested Menu Tree**        | [`useFloatingNode`](/api/core/use-floating-node), [`useRovingFocus`](/api/keyboard-navigation/use-roving-focus), [`useOutsideClick`](/api/interactions/use-outside-click), [`useEscapeKey`](/api/interactions/use-escape-key)                                            | `offset`, `flip`                   | [Nested Menus](/guide/components/build-nested-menus)                   |
| **Combobox / Autocomplete** | [`useAriaActivedescendant`](/api/keyboard-navigation/use-aria-activedescendant), [`useTypeahead`](/api/keyboard-navigation/use-typeahead), [`usePosition`](/api/positioning/use-position)                                                                                | `offset`, `flip`, `size`           | [Keyboard Navigation](/guide/accessibility/keyboard-navigation)        |

## Core

Core primitives manage node identity, shared element references, open/close lifecycle, and composite tree hierarchies.

| Composable                                       | Description                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`useFloatingNode`](/api/core/use-floating-node) | Creates a composite floating node managing element refs, open state, and parent-child hierarchy. |
| [Types](/api/overview/types)                     | Canonical types, navigation protocols, and data structures exported by VFloat.                   |

## Positioning

Positioning composables compute screen coordinates, run the middleware pipeline, listen to viewport changes, and generate style bindings.

| Composable                                            | Description                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`usePosition`](/api/positioning/use-position)        | Computes reactive coordinates and automatically applies inline positioning styles to the floating element. |
| [`useArrow`](/api/positioning/use-arrow)              | Registers an arrow element with the positioning pipeline and automatically applies computed arrow styles.  |
| [`useClientPoint`](/api/positioning/use-client-point) | Positions a floating element relative to pointer coordinates using a virtual anchor.                       |

## Interactions

Interaction composables attach DOM event listeners to the anchor or document to open, close, and manage focus for floating surfaces.

| Composable                                               | Description                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`useClick`](/api/interactions/use-click)                | Toggles open state from click, tap, or keyboard activation on the anchor.                           |
| [`useHover`](/api/interactions/use-hover)                | Opens and closes floating content on pointer hover with delay and safe polygon tracking.            |
| [`useFocus`](/api/interactions/use-focus)                | Opens and closes floating content when the anchor gains or loses keyboard focus.                    |
| [`useFocusTrap`](/api/interactions/use-focus-trap)       | Manages modal focus containment, boundary sentinels, background isolation, and return focus.        |
| [`useOutsideClick`](/api/interactions/use-outside-click) | Closes open floating surfaces when pointer interactions occur outside the floating family.          |
| [`useEscapeKey`](/api/interactions/use-escape-key)       | Closes open floating surfaces on Escape key presses with leaf-first hierarchy and IME coordination. |
| [`useRole`](/api/interactions/use-role)                  | Synchronizes ARIA roles, popup states, and accessibility relationships on anchor and panel.         |

## Keyboard Navigation

Primitives for managing keyboard navigation patterns in dropdowns, menus, and comboboxes.

| Composable                                                                      | Description                                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`useRovingFocus`](/api/keyboard-navigation/use-roving-focus)                   | Moves physical DOM focus between elements in composite widgets using roving `tabindex`.             |
| [`useAriaActivedescendant`](/api/keyboard-navigation/use-aria-activedescendant) | Virtual focus keeping DOM focus on an input while highlighting options via `aria-activedescendant`. |
| [`useTypeahead`](/api/keyboard-navigation/use-typeahead)                        | Captures rapid typing sequences to jump directly to matching items in a list.                       |

## Middleware

Positioning middleware runs sequentially inside `usePosition` to modify placement, prevent collisions, add spacing, or measure boundary constraints.

Configure them declaratively inside `usePosition(node, { middlewares: { ... } })` or pass middleware instances directly.

| Middleware                                       | Pipeline Phase | Declarative Key       | Description                                                                      |
| ------------------------------------------------ | -------------- | --------------------- | -------------------------------------------------------------------------------- |
| [`offset`](/api/middleware/offset)               | 1. Distance    | `offset: 8`           | Adds distance along the main and cross axes between anchor and panel.            |
| [`flip`](/api/middleware/flip)                   | 2. Collision   | `flip: true`          | Flips to the opposite or fallback placement when space is constrained.           |
| [`shift`](/api/middleware/shift)                 | 3. Boundary    | `shift: true`         | Nudges the floating element along its axis to remain inside the viewport.        |
| [`autoPlacement`](/api/middleware/autoplacement) | 4. Placement   | `autoPlacement: true` | Selects the placement with the greatest available space (alternative to `flip`). |
| [`size`](/api/middleware/size)                   | 5. Sizing      | `size: { apply }`     | Measures available space to resize or constrain panel dimensions.                |
| [`inline`](/api/middleware/inline)               | 6. Geometry    | `inline: true`        | Positions relative to individual client rects for multi-line inline triggers.    |
| [`arrow`](/api/middleware/arrow)                 | 7. Decorator   | `arrow: true`         | Positions an arrow element aligned with the anchor.                              |
| [`hide`](/api/middleware/hide)                   | 8. Visibility  | `hide: true`          | Detects when the anchor is clipped or when the panel escapes its boundary.       |

## Conventions Across APIs

- **Reactivity:** Options accept plain values, Vue refs, or getter functions (`MaybeRefOrGetter<T>`). Changes automatically re-evaluate active composables.
- **Node Coupling:** Every composable in a floating surface accepts the same `FloatingNode` created by [`useFloatingNode`](/api/core/use-floating-node).
- **Style Binding:** By default (`applyStyles: true`), `usePosition` and `useArrow` automatically synchronize positioning and arrow styles directly to `node.refs.floatingEl` and `node.refs.arrowEl`. Alternatively, set `applyStyles: false` and bind `:style="styles"` or `:style="arrowStyles"` manually in templates.
