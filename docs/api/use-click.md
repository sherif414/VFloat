---
description: Opens and closes floating content on click, tap, or keyboard activation.
---

# useClick

`useClick` toggles a floating node from pointer and keyboard activation on the anchor element. Pair it with [`useDismiss`](/api/use-dismiss) when the surface should close on outside clicks or Escape key presses.

## Type

```ts
function useClick(node: UseClickContext, options?: UseClickOptions): void;

interface UseClickContext extends Pick<
  FloatingNode,
  "refs" | "open" | "setOpen" | "lastOpenReason"
> {}

interface UseClickOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  event?: MaybeRefOrGetter<"click" | "mousedown">;
  toggle?: MaybeRefOrGetter<boolean>;
  stickIfOpen?: MaybeRefOrGetter<boolean>;
  ignoreMouse?: MaybeRefOrGetter<boolean>;
  ignoreKeyboard?: MaybeRefOrGetter<boolean>;
  ignoreTouch?: MaybeRefOrGetter<boolean>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Disabling removes all anchor listeners. |
| `event` | `MaybeRefOrGetter<"click" \| "mousedown">` | `"click"` | Which DOM event triggers opening. `"mousedown"` fires immediately on press. |
| `toggle` | `MaybeRefOrGetter<boolean>` | `true` | When `false`, clicking opens the surface but never toggles it closed. |
| `stickIfOpen` | `MaybeRefOrGetter<boolean>` | `false` | Pins an open surface when first opened by hover or focus. |
| `ignoreMouse` | `MaybeRefOrGetter<boolean>` | `false` | Ignores mouse clicks only; pen and touch events still trigger. |
| `ignoreKeyboard` | `MaybeRefOrGetter<boolean>` | `false` | Disables Enter and Space keyboard activation. |
| `ignoreTouch` | `MaybeRefOrGetter<boolean>` | `false` | Ignores touch taps only. |

## Returns

`useClick` returns `void`. It manages listeners on `node.refs.anchorEl` that automatically reattach when elements change or unmount.

## Details

### Pointer and Keyboard Activation

`useClick` attaches listeners directly to `node.refs.anchorEl`. It handles mouse clicks, touchscreen taps, and keyboard activation:

- Pressing Enter or Space on non-button elements (e.g. a `<div>` with `tabindex="0"`) dispatches `node.setOpen(..., "keyboard-activate")`.
- Native `<button>` and `<a>` elements retain native activation semantics and emit `"anchor-click"`.

### Pinning with `stickIfOpen`

When combining hover previews with click actions (such as an interactive tooltip or popover card):

1. User hovers over the trigger &rarr; [`useHover`](/api/use-hover) opens the surface with reason `"hover"`.
2. User clicks the trigger &rarr; `useClick` with `stickIfOpen: true` catches the click and changes the reason to `"anchor-click"`.
3. User moves the mouse away &rarr; `useHover` detects the pin reason and will not close the surface on pointer leave.
4. User clicks the trigger again &rarr; `useClick` toggles the pinned surface closed.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

useClick(node);
useDismiss(node);
</script>

<template>
  <button ref="anchorEl">Toggle Menu</button>

  <div v-if="node.open" ref="floatingEl" class="dropdown" :style="styles">
    <button @click="node.setOpen(false)">Profile</button>
    <button @click="node.setOpen(false)">Settings</button>
    <button @click="node.setOpen(false)">Logout</button>
  </div>
</template>
```

## See Also

- [`useHover`](/api/use-hover) - Open on pointer hover; pairs with `stickIfOpen`
- [`useDismiss`](/api/use-dismiss) - Dismiss on Escape and outside pointer events
- [`useFocus`](/api/use-focus) - Trigger on keyboard focus
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Click and dismissal workflow
