---
description: Control floating open state from your own Vue state and event handling.
---

# Control Open State

Let's talk about open state.

Most floating surfaces are easiest when VFloat owns the open state for you. But sometimes the parent component needs to stay in charge because the floating surface has to follow routing, forms, or other application rules.

This page shows both models and when each one makes sense.

## The default: let VFloat own it

If you call [`useFloatingNode`](/api/use-floating-node) without `open`, VFloat creates and owns that state for you.

To start an uncontrolled surface open, pass `defaultOpen`. It is an initial value, not a reactive input.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  defaultOpen: true,
});

useClick(context);
</script>
```

This is usually the simplest starting point. The component stays small, and your interaction composables and template all coordinate through `context.open`.

## The controlled version

When the parent needs to read or react to the open state directly in its own logic, pass your own `open` ref.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  open,
});

useClick(context);
useDismiss(context);

// To change the state programmatically, call setOpen
function close() {
  context.setOpen(false);
}
</script>
```

When using this pattern, VFloat automatically updates the `open` ref when interaction helpers (like click or hover) trigger open changes.

To update the state programmatically, **always call `context.setOpen()`** instead of mutating the `open` ref directly. This keeps reason and event bookkeeping (`lastOpenReason`, `lastOpenEvent`, `onOpenChange`) consistent. Note that closing a node never cascades to related nodes on its own. When family teardown must follow, walk open descendants explicitly using `tree.forEach(context.id, "descendants", (node) => node.setOpen(false, "programmatic"), { order: "bottom-up" })` on your [`useFloatingTree`](/api/use-floating-tree).

> [!IMPORTANT]
> The `open` ref passed to `useFloatingNode` options must be synchronously mutable. Avoid passing read-only refs or computed properties that defer updates (such as those delegating to a parent prop), as they can cause rendering state lag.

> [!NOTE]
> `onOpenChange` is mainly for side-effects and debugging. Do not use it to synchronize or drive the `open` state.

## When each model makes sense

Choose uncontrolled when:

- The surface is local
- The component can own its own lifecycle
- Simplicity matters most

Choose controlled when:

- Another component needs to decide whether the surface may open
- Closing the surface should trigger other state updates
- Multiple related surfaces need shared coordination

## Keep one context per surface

Whatever state model you choose, make sure every interaction composable for that surface shares the same `context`.

That shared `context` is what lets click, escape handling, and positioning cooperate instead of fighting each other.

## Where to go next

If you want to understand the shared model behind both versions, read [Floating Context](/guide/floating-context). If you are ready for practical builds, jump to [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns).
