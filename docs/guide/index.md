---
description: What VFloat is, what problem it solves, and how the pieces fit together.
---

# Introduction

## What Is VFloat?

VFloat is a Vue 3 library for building floating UI elements like tooltips, popovers, dropdown menus, and dialogs. It provides composable building blocks for positioning calculations, user interactions, focus management, and overlay coordination without imposing markup, styles, or prebuilt components.

## Why Do You Need VFloat?

Building floating UI by hand requires solving geometric collisions, event timing, and focus management from scratch. A simple tooltip needs viewport detection to avoid clipping and hover delays to avoid flickering. A dropdown menu needs keyboard navigation, outside-click detection, and Escape key handling.

Pre-built component libraries solve these problems, but they force their markup, styles, and design tokens on you. VFloat handles the positioning math, DOM listeners, and state coordination behind the scenes, letting you build custom, fully accessible floating surfaces using your own templates and styles.

## How Does It Work?

Every floating surface comes down to two questions: **where** should it appear, and **when** should it be visible? VFloat divides these responsibilities across dedicated composables connected by a shared context:

- **`useFloatingContext`** holds the shared state used by the various composables.
- **`usePosition`** handles the positioning calculations. It tells you where to place your floating element and returns reactive styles to bind to your template.
- **`useHover`** decides when the floating element should be visible and when it should hide based on hover behavior.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useHover, useEscapeKey } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// 1. Hold shared state and element refs
const context = useFloatingContext({ anchorEl, floatingEl });

// 2. WHERE: calculate coordinates and return styles
const { styles } = usePosition(context, {
  placement: "top",
  middleware: { offset: 8 },
});

// 3. WHEN: manage visibility based on user input
useHover(context);
useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" role="tooltip" :style="styles">
    Tooltip content
  </div>
</template>
```

Because both composables plug into the same `context`, they work together automatically. When `useHover` opens the tooltip, `usePosition` computes its placement. The [first tooltip guide](/guide/first-tooltip) walks through the full component step by step.

## How Do You Build Different Surfaces?

You won't find a `<Menu>` component or a `useTooltip()` composable in VFloat. That's intentional. Instead, you get a set of focused composables that you mix and match to build whatever you need.

Want to turn the tooltip from above into a popover? Swap hover for click, and add outside-click dismissal:

```ts
useClick(context);
useOutsideClick(context);
useEscapeKey(context);
```

Building a dropdown menu? Keep the click trigger and add keyboard list navigation:

```ts
const collection = useCollection();

useClick(context);
useOutsideClick(context);
useEscapeKey(context);
useListNavigation(context, { collection });
```

Need a modal dialog? Add focus management to trap focus inside the dialog while it's open:

```ts
useClick(context);
useFocusManager(context, { modal: true });
useEscapeKey(context);
```

## How Does It Relate to Floating UI?

VFloat draws heavily from [Floating UI](https://floating-ui.com). The middleware pipeline (offset, flip, shift, size, arrow, hide, autoPlacement) follows the same mental model, and some composable names will look familiar.

However, VFloat is a dedicated Vue 3 library with its own reactive API shape. If you are coming from Floating UI, the core concepts transfer, but the call sites and reactive state patterns do not.

## What About Bundle Size and Performance?

Floating UI logic should not weigh down your application. VFloat is packaged as an ESM library with clean export boundaries and full tree-shaking support. You only ship the composables and middlewares your components actually import.

<package-size-table />

VFloat has zero styling baggage and no heavy runtime dependencies. Beyond Vue 3 and `@floating-ui/dom` for geometric collision math, there is nothing else in the bundle.

## Where Should You Go Next?

If this is your first time with VFloat, [build a tooltip](/guide/first-tooltip) step by step to see how all the pieces connect in a real component.

If you already know what you're building, pick the closest guide:

- [Build Accessible Tooltips](/guide/build-accessible-tooltips) — hover and focus triggers, ARIA roles, delay behavior
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) — click triggers, outside click dismissal, richer content
- [Build Nested Menus](/guide/build-nested-menus) — keyboard navigation, submenus, tree coordination
- [Build Dialogs and Modals](/guide/build-dialogs-and-modals) — focus trapping, modal behavior, return focus
- [Use Virtual Anchors](/guide/use-virtual-anchors) — context menus, cursor-following surfaces, coordinate-based positioning

When you need exact signatures and defaults, the [API Reference](/api/) has every option and return value documented.
