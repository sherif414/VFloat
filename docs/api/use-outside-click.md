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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Set to `false` to disable dismissal. |
| `tree` | `MaybeRefOrGetter<FloatingTree \| null \| undefined>` | — | Clicks inside descendant surfaces count as inside. |
| `event` | `MaybeRefOrGetter<"pointerdown" \| "mousedown" \| "click">` | `"pointerdown"` | Which document event dismisses. |
| `capture` | `MaybeRefOrGetter<boolean>` | `true` | Listener capture phase. |
| `ignoreClick` | `OutsideClickPredicate` | — | Skips selected outside clicks; runs after the family check. |
| `onClick` | `(event: MouseEvent) => void` | — | Replaces the default close behavior. |
| `ignoreScrollbar` | `MaybeRefOrGetter<boolean>` | `true` | Scrollbar interaction inside the panel does not close. |
| `ignoreDrag` | `MaybeRefOrGetter<boolean>` | `true` | Ignores `click` finishing outside after a drag from inside. Only for `event: "click"`. |

## Returns

Returns `void`. Attaches a document-level listener and closes with the `"outside-pointer"` reason when the node is open.

## Details

Pair this composable with `useClick`, `useHover`, or application-owned open state whenever outside pointer input should dismiss the floating surface. Pass an explicit [`useFloatingTree`](/api/use-floating-tree) when clicks inside related descendant surfaces should also count as inside.

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

## See Also

- [`useDismiss`](/api/use-dismiss) - Groups Escape and outside-press dismissal
- [`useClick`](/api/use-click) - Opens on click
- [`useEscapeKey`](/api/use-escape-key) - Closes on Escape
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [`useFloatingTree`](/api/use-floating-tree) - Coordinates nested surfaces
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Dismissal workflow
