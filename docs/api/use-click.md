---
description: Opens and closes floating content on click.
---

# useClick

`useClick` toggles a floating node from pointer and keyboard activation. Pair it with [`useDismiss`](/api/use-dismiss) when the same surface should close on Escape or outside pointer input.

## Type

The full call signature and its context and options shapes:

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
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates all anchor listeners. |
| `event` | `MaybeRefOrGetter<"click" \| "mousedown">` | `"click"` | With `"mousedown"`, only the left button toggles; keyboard handling is unchanged. |
| `toggle` | `MaybeRefOrGetter<boolean>` | `true` | With `false`, clicks open but never close. |
| `stickIfOpen` | `MaybeRefOrGetter<boolean>` | `false` | Pins a hover- or focus-opened surface on first click. |
| `ignoreMouse` | `MaybeRefOrGetter<boolean>` | `false` | Ignores mouse input only; pen still toggles. |
| `ignoreKeyboard` | `MaybeRefOrGetter<boolean>` | `false` | Disables Enter and Space handling. |
| `ignoreTouch` | `MaybeRefOrGetter<boolean>` | `false` | Ignores touch input only. |

## Returns

Returns `void`. All behavior is anchor listeners that reattach when the anchor element or `enabled` changes.

## Details

`useClick` attaches trigger handlers to `refs.anchorEl`. It supports mouse, touch, and keyboard activation, including Enter and Space on non-button triggers.

- `stickIfOpen` keeps an already-open floating element open (pins it) when opened by another trigger like `useHover` or `useFocus`. When set to `true`, the first click pins the element open (transitioning its reason to `"anchor-click"` and preventing hover dismissal on pointer leave), while subsequent clicks toggle it closed.
- `ignoreMouse` ignores mouse input only; pen input still toggles. `ignoreTouch` ignores touch input only. `ignoreKeyboard` disables Enter and Space handling and swallows the synthetic clicks they produce on native buttons.
- Opens with the `"anchor-click"` reason, or `"keyboard-activate"` when Enter or Space is handled on a non-native trigger. Native buttons, links with `href`, and typeable elements keep their default behavior instead of emitting `"keyboard-activate"`.

## Example

Start with a minimal click toggle:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);
useClick(node);
useDismiss(node, { outsidePress: false });
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

Pair with [`useDismiss`](/api/use-dismiss) when the same surface should close on Escape or outside pointer input. See [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) for the dismissal workflow.

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [`useHover`](/api/use-hover) - Opens on hover; pairs with `stickIfOpen`
- [`useFocus`](/api/use-focus) - Opens on focus
- [`useDismiss`](/api/use-dismiss) - Closes on Escape and outside pointer input
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Click workflow
