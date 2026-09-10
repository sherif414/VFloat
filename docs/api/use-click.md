---
description: Opens and closes floating content on click.
---

# useClick

`useClick` toggles a floating node from pointer and keyboard activation. Pair it with [`useOutsideClick`](/api/use-outside-click) when the same surface should close on outside pointer input.

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

## Details

`useClick` attaches trigger handlers to `refs.anchorEl`. It supports mouse, touch, and keyboard activation, including Enter and Space on non-button triggers. It returns nothing; all behavior is anchor listeners that reattach when the anchor element or `enabled` changes.

- `enabled` defaults to `true`.
- `event` controls which mouse event toggles the trigger. It defaults to `"click"`. With `"mousedown"`, only the left button toggles and keyboard handling is unchanged.
- `toggle` defaults to `true`. With `false`, clicks open the surface but never close it.
- `stickIfOpen` controls whether clicking the anchor keeps an already-open floating element open (pins it) when opened by another trigger like `useHover` or `useFocus`. It defaults to `false`. When set to `true`, the first click pins the element open (transitioning its reason to `"anchor-click"` and preventing hover dismissal on pointer leave), while subsequent clicks toggle it closed.
- `ignoreMouse` (default `false`) ignores mouse input only; pen input still toggles. `ignoreTouch` (default `false`) ignores touch input only. `ignoreKeyboard` (default `false`) disables Enter and Space handling and swallows the synthetic clicks they produce on native buttons.
- Opens with the `"anchor-click"` reason, or `"keyboard-activate"` when Enter or Space is handled on a non-native trigger. Native buttons, links with `href`, and typeable elements keep their default behavior instead of emitting `"keyboard-activate"`.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);
useClick(node);
useEscapeKey(node);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Add Outside-Click Dismissal

Use `useOutsideClick` alongside `useClick` when the surface should close after outside pointer input.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);
useClick(node);
useOutsideClick(node);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Ignore specific outside targets

Use a predicate when some outside targets should keep the floating element open.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const helperEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);
useClick(node);
useOutsideClick(node, {
  ignoreClick: (_event, target) => {
    return target instanceof Node && !!helperEl.value?.contains(target);
  },
});
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
  <div ref="helperEl">Helper content</div>
</template>
```

### Pin Hover Previews on Click

Use `stickIfOpen: true` when combining `useHover` and `useClick` so clicking the trigger locks the preview open for interaction rather than closing it.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, useHover, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

// Hover opens preview; click pins it open
useHover(node);
useClick(node, { stickIfOpen: true });
useOutsideClick(node);
</script>

<template>
  <button ref="anchorEl">Hover or click to pin</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Interactive content</div>
</template>
```

## See Also

- [useFloatingNode](/api/use-floating-node)
- [`useHover`](/api/use-hover)
- [`useFocus`](/api/use-focus)
- [`useOutsideClick`](/api/use-outside-click)
- [`useEscapeKey`](/api/use-escape-key)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
