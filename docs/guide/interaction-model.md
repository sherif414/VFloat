---
description: Learn how VFloat opens, closes, and coordinates floating surfaces.
---

# Interaction Model

VFloat's interaction composables look separate on the surface, but they are meant to work together through one shared state model.

That shared model is the difference between a pile of event helpers and a composable floating system.

## The Core Idea

Interaction composables do not usually position anything themselves. They answer a different question:

"When should this floating surface open or close?"

Examples:

- [`useHover`](/api/use-hover) reacts to pointer movement
- [`useClick`](/api/use-click) reacts to anchor activation
- [`useDismiss`](/api/use-dismiss) reacts to Escape and outside pointer input through one gate
- [`useFocus`](/api/use-focus) reacts to focus and blur
- [`useFocusTrap`](/api/use-focus-trap) orchestrates focus while open

[`useDismiss`](/api/use-dismiss) is itself a thin grouping over [`useOutsideClick`](/api/use-outside-click) and [`useEscapeKey`](/api/use-escape-key). Reach for the grouping by default and drop to the primitives only when each channel needs its own reactive gate.

## One Context, Many Behaviors

A floating surface often needs more than one interaction rule at once.

For example, an accessible tooltip may need hover for pointer users and focus for keyboard users. A popover may need click to open, outside click to close, and Escape to close.

Those are not competing systems if they all share one `context`. They are just different inputs acting on the same open state.

## A Typical Combination

This example shows a common click-driven combination.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });

useClick(context);
useDismiss(context);
</script>
```

`useDismiss(context)` closes on Escape and outside pointer input with one shared `enabled` gate and one shared `tree`. When a surface needs only one channel, disable the other (`useDismiss(context, { outsidePress: false })`) or compose [`useEscapeKey`](/api/use-escape-key) and [`useOutsideClick`](/api/use-outside-click) directly.

## Next Step

- Read [Choosing the Right Pattern](/guide/choosing-the-right-pattern) if you are deciding which interaction mix a surface should use.
- Read [Floating Context](/guide/floating-context) if you want the deeper model behind the shared root.
- Read [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) for concrete combinations.
