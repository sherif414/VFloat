---
description: Closes floating content when pointer input lands outside.
---

# useOutsideClick

`useOutsideClick` closes a floating node when a pointer event targets something outside its anchor and floating element. Pass an explicit [`useFloatingTree`](/api/use-floating-tree) when clicks inside related descendant surfaces should also count as inside.

## Type

```ts
function useOutsideClick(node: UseOutsideClickContext, options?: UseOutsideClickOptions): void;

interface UseOutsideClickContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseOutsideClickOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  capture?: MaybeRefOrGetter<boolean>;
  ignoreClick?: OutsideClickPredicate;
  onClick?: (event: MouseEvent) => void;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}

type OutsideClickPredicate = (event: MouseEvent, target: EventTarget | null) => boolean;
```

## Details

`useOutsideClick` attaches a document-level listener and closes with the `"outside-pointer"` reason when the node is open.

- `enabled` defaults to `true`. Set it to `false` to disable dismissal.
- `event` defaults to `"pointerdown"`.
- `capture` defaults to `true`.
- `ignoreClick` skips selected outside clicks when it returns `true`. It runs after the family check and receives the raw event plus its target.
- `onClick` replaces the default close behavior when you need custom logic.
- `ignoreScrollbar` defaults to `true` and prevents scrollbar interaction inside the floating element from closing it.
- `ignoreDrag` defaults to `true` and ignores `click` events that finish outside after a drag started inside the floating element. It only applies when `event` is `"click"`.

Pair this composable with `useClick`, `useHover`, or application-owned open state whenever outside pointer input should dismiss the floating surface.

## Example

This example opens the floating element manually and lets `useOutsideClick` own dismissal.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEscapeKey, useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useOutsideClick(node);
useEscapeKey(node);
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(!node.open, 'anchor-click')">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Ignore Specific Outside Targets

Use a predicate when some external UI should keep the floating element open.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const toolbarEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useOutsideClick(node, {
  ignoreClick: (_event, target) => {
    return target instanceof Node && !!toolbarEl.value?.contains(target);
  },
});
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(true, 'anchor-click')">Open</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
  <div ref="toolbarEl">Toolbar content</div>
</template>
```

## See Also

- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [useFloatingNode](/api/use-floating-node)
- [useFloatingTree](/api/use-floating-tree)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
