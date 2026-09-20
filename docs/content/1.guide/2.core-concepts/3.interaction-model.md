---
description: Learn how VFloat opens, closes, and coordinates floating surfaces.
---

# Interaction Model

VFloat's interaction composables look separate on the surface, but they are meant to work together through one shared state model.

That shared model is the difference between a pile of event helpers and a composable floating system.

## The core idea

Interaction composables do not usually position anything themselves. They answer a different question:

"When should this floating surface open or close?"

Examples:

- [`useHover`](/api/use-hover) reacts to pointer movement
- [`useClick`](/api/use-click) reacts to anchor activation
- [`useOutsideClick`](/api/use-outside-click) reacts to pointer input outside the floating family
- [`useEscapeKey`](/api/use-escape-key) reacts to Escape key presses with leaf-first tree coordination
- [`useFocus`](/api/use-focus) reacts to focus and blur
- [`useFocusTrap`](/api/use-focus-trap) orchestrates focus while open

`useOutsideClick` and `useEscapeKey` are decoupled primitives. Mix and match them based on the exact UX requirements of your surface (e.g. tooltips typically only need `useEscapeKey`, whereas modals and dropdowns usually use both).

## One node, many behaviors

A floating surface often needs more than one interaction rule at once.

For example, an accessible tooltip may need hover for pointer users and focus for keyboard users. A popover may need click to open, outside click to close, and Escape to close.

Those are not competing systems if they all share one `node`. They are just different inputs acting on the same open state.

## A typical combination

This example shows a common click-driven combination:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloatingNode, useOutsideClick } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });

useClick(node);
useOutsideClick(node);
useEscapeKey(node);
</script>
```

`useOutsideClick(node)` closes when the user interacts outside the surface (with built-in family awareness so clicking inside child submenus won't dismiss the parent). `useEscapeKey(node)` dismisses on Escape, respecting IME composition and nested tree hierarchy.

## Where to go next

- Read [Floating Node](/guide/floating-node) if you want the deeper model behind the shared root.
- Read [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) for concrete combinations.
