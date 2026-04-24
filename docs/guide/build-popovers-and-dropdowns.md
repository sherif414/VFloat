---
description: Compose popovers and dropdowns with click, focus, and dismissal patterns.
---

# Build Popovers and Dropdowns

Let's build the next common surface: a popover or dropdown.

Tooltips teach hover. Popovers usually teach click. The shape is still simple, but the rules around opening, closing, and focus are a little richer.

For a straightforward popover or dropdown, start with:

- [`useFloating`](/api/use-floating)
- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [`offset`](/api/offset)

## Step 1: Create The Positioning Context

Start with the anchor, the floating element, and a shared `context`.

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

Now add the behavior that makes the surface feel like a popover.

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

That gives you a good default:

- Anchor click toggles the panel
- Outside pointer interaction closes it
- Escape closes it

## Step 3: Render The Panel

Now render the content the user actually came for.

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

## A Safer Default For Real Panels

If the panel can run into the viewport edge, add `flip()` and `shift()`.

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

That stack is common for real dropdown-like UI because it handles spacing, fallback sides, and boundary safety in one pass.

## Where To Go Next

- Read [Keep Content in View](/guide/keep-content-in-view) if your panel can collide with the viewport.
- Read [Keyboard Navigation](/guide/keyboard-navigation) if your dropdown acts like a menu or listbox.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) if the surface starts to behave more like a dialog than a popover.
