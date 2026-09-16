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

const node = useFloatingNode({
  anchorEl,
  floatingEl,
  defaultOpen: true,
});

useClick(node);
</script>
```

This is usually the simplest starting point. The component stays small, and your interaction composables and template all coordinate through `node.open`.

## The controlled version

When the parent needs to read or react to the open state directly in its own logic, pass your own `open` ref.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const node = useFloatingNode({
  anchorEl,
  floatingEl,
  open,
});

useClick(node);
useDismiss(node);

// To change the state programmatically, call setOpen
function close() {
  node.setOpen(false);
}
</script>
```

When using this pattern, VFloat automatically updates the `open` ref when interaction helpers (like click or hover) trigger open changes.

To update the state programmatically, **always call `node.setOpen()`** instead of mutating the `open` ref directly. This ensures `onOpenChange` fires with the correct reason and event context. Note that closing a node never cascades to related nodes on its own. When family teardown must follow, walk open descendants explicitly using `node.traverse((child) => child.setOpen(false, "programmatic"), { order: "bottom-up" })` on your [`FloatingNode`](/api/types#floatingnode).

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

## Keep one node per surface

Whatever state model you choose, make sure every interaction composable for that surface shares the same `node`.

That shared `node` is what lets click, escape handling, and positioning cooperate instead of fighting each other.

## Where to go next

If you want to understand the shared model behind both versions, read [Floating Node](/guide/floating-node). If you are ready for practical builds, jump to [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns).
