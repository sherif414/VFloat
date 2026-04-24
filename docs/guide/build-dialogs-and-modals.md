---
description: Build dialogs and modals with focus trapping and dismissal behavior.
---

# Build Dialogs and Modals

Dialogs and modals are still floating surfaces, but they carry stronger behavior expectations than tooltips, popovers, or menus. Once a surface behaves like a dialog, users expect focus management to be intentional and dismissal to be explicit.

This guide shows a practical VFloat setup for dialog-like surfaces and explains when a popover should become a dialog.

## What Makes A Dialog Different

A dialog usually needs:

- click or programmatic open
- Escape to dismiss
- focus containment while open
- clear semantics such as `role="dialog"` and `aria-modal="true"` for modal flows

In VFloat terms, the core stack is usually [`useFloating`](/api/use-floating), [`useClick`](/api/use-click) or manual open state, [`useEscapeKey`](/api/use-escape-key), and [`useFocusTrap`](/api/use-focus-trap).

## Step 1: Build The Shared Context

Start with the same stable `context` shape.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);
</script>
```

## Step 2: Add Dialog Behavior

Now add the behavior layer that makes the surface act like a dialog.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating, useFocusTrap } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context, {
  closeOnOutsideClick: true,
});

useEscapeKey(context);

useFocusTrap(context, {
  modal: true,
});
</script>
```

## Step 3: Render The Dialog

Render the dialog with explicit semantics.

```vue
<template>
  <button ref="anchorEl" type="button">Open dialog</button>

  <Teleport to="body">
    <div v-if="context.state.open.value" class="backdrop">
      <div
        ref="floatingEl"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :style="context.position.styles.value"
      >
        <h2>Edit profile</h2>
        <p>Update your public display information.</p>
        <button type="button">Save</button>
        <button type="button" @click="context.state.setOpen(false)">Cancel</button>
      </div>
    </div>
  </Teleport>
</template>
```

## When A Popover Should Become A Dialog

If your surface traps workflow attention, contains several interactive controls, or needs stronger focus rules, then you are probably building a dialog, not just a popover.

## Where To Go Next

- Read [Controlled vs Uncontrolled](/guide/controlled-vs-uncontrolled) if you are deciding who should own dialog state.
- Read [Choosing the Right Pattern](/guide/choosing-the-right-pattern) if you are unsure whether your surface is really a dialog or still just a popover.
- Read [Focus Models](/guide/focus-models) for the deeper mental model behind focus handling.
