---
description: Compose popovers and dropdowns with click, focus, and dismissal patterns.
---

# Build Popovers and Dropdowns

Popovers and dropdowns are where many VFloat apps start to feel real. They are still just floating surfaces, but the interaction rules are richer than a tooltip:

- The user usually clicks to open
- The panel often contains actions or focusable content
- Outside clicks and Escape usually dismiss it

This guide shows a practical baseline for click-driven surfaces and explains how to extend it without losing the mental model.

## The Baseline Stack

For a straightforward popover or dropdown, start with:

- [`useFloating`](/api/use-floating)
- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [`offset`](/api/offset)

## Step 1: Build The Positioning Context

Start with refs and a shared `context`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
});
</script>
```

## Step 2: Add Open And Dismissal Behavior

Add the click-driven interaction layer next.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
});

useClick(context, {
  closeOnOutsideClick: true,
});

useEscapeKey(context);
</script>
```

This gives you a strong default:

- Anchor click toggles the panel
- Outside pointer interaction closes it
- Escape closes it

## Step 3: Render A Real Panel

Now render the panel content.

```vue
<template>
  <button ref="anchorEl" type="button" class="trigger">Open actions</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    class="panel"
    :style="context.position.styles.value"
  >
    <h2>Quick actions</h2>
    <p>Choose the next step for this record.</p>
    <div class="actions">
      <button type="button">Edit</button>
      <button type="button">Duplicate</button>
      <button type="button">Archive</button>
    </div>
  </div>
</template>
```

## A Safer Default For Production Panels

This version adds viewport resilience without changing the mental model.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

useClick(context, {
  closeOnOutsideClick: true,
});

useEscapeKey(context);
</script>
```

This stack is common for real dropdown-like UI because it handles spacing, side fallback, and boundary safety in one pass.

## Where To Go Next

- Read [Keep Content in View](/guide/keep-content-in-view) if your panel can collide with the viewport.
- Read [Keyboard Navigation](/guide/keyboard-navigation) if your dropdown acts like a menu or listbox.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) if the surface starts to behave more like a dialog than a popover.
