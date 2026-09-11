---
description: Build dialogs and modals with focus trapping and dismissal behavior.
---

# Build Dialogs and Modals

Dialogs and modals are floating surfaces that carry stronger behavioral expectations than tooltips, popovers, or menus. Once a surface behaves like a dialog, users expect focus to be trapped intentionally, outside content to become inert, and dismissal to be explicit.

This guide shows a practical VFloat setup for dialog-like surfaces and explains when a popover should become a dialog.

## What makes a dialog different

A dialog usually needs:

- Click or programmatic activation
- Focus containment and trapping while open
- Outside page isolation (`inert`) so screen readers and Tab keys cannot reach background content
- Safe focus return to the trigger element on close
- Explicit semantics such as `role="dialog"` and `aria-modal="true"`
- Escape key and backdrop dismissal

In VFloat, the core dialog stack pairs [`useFloatingNode`](/api/use-floating-node) with [`useFocusTrap`](/api/use-focus-trap) and [`useDismiss`](/api/use-dismiss).

## The complete example

Here is a full working modal dialog:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, useFocusTrap } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });

useClick(context);
useDismiss(context);

useFocusTrap(context, {
  modal: true,
});
</script>

<template>
  <button ref="anchorEl" type="button">Edit profile</button>

  <Teleport to="body">
    <div v-if="context.open.value" class="dialog-backdrop">
      <div
        ref="floatingEl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabindex="-1"
        class="dialog-panel"
      >
        <h2 id="dialog-title">Edit profile</h2>
        <p>Update your display name and email address.</p>

        <form @submit.prevent="context.setOpen(false)">
          <input type="text" placeholder="Your name" />
          <button type="submit">Save</button>
          <button type="button" @click="context.setOpen(false)">Cancel</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
```

## Focus trapping and page isolation

```ts
useFocusTrap(context, {
  modal: true,
});
```

[`useFocusTrap`](/api/use-focus-trap) orchestrates the entire focus lifecycle for the dialog:

- **Initial focus.** Automatically focuses the first tabbable element inside `floatingEl` when the dialog opens.
- **Tab cycling.** Traps <kbd>Tab</kbd> and <kbd>Shift+Tab</kbd> inside the dialog container so focus cannot escape into the browser chrome.
- **Page isolation.** Applies `inert` to outside page elements so assistive technology cannot interact with background content while the dialog is visible.
- **Return focus.** Safely restores focus back to the trigger button (`anchorEl`) when the dialog closes.

## Anchored dialogs vs centered modals

Modal dialogs often center in the viewport using CSS Flexbox or Grid over a full-screen backdrop. In that case, you do not need `usePosition` because the dialog does not anchor to a specific element.

When building an **anchored dialog** (such as a callout dialog, rich popover dialog, or contextual confirmation bubble next to a button), add `usePosition`:

```ts
const { styles } = usePosition(context, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});
```

And bind `:style="styles"` to `floatingEl`. VFloat allows you to mix and match focus trapping with or without JavaScript positioning based on your UI needs.

## When a popover should become a dialog

If your surface captures user attention for a critical flow, contains multiple interactive form fields, or requires focus containment so keyboard navigation does not wander off the surface, you are building a dialog, not a popover.

## Where to go next

- Read [Controlled vs Uncontrolled](/guide/controlled-vs-uncontrolled) to decide whether the component or an outside router/store should own open state.
- Read [Choosing the Right Pattern](/guide/choosing-the-right-pattern) to evaluate tradeoffs between popovers, menus, and dialogs.
- Read [Focus Models](/guide/focus-models) for the deeper mental model behind focus management.
