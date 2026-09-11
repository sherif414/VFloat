---
description: Closes floating content when Escape is pressed.
---

# useEscapeKey

`useEscapeKey` closes a floating node when Escape is pressed.

## Type

```ts
function useEscapeKey(node: UseEscapeKeyContext, options?: UseEscapeKeyOptions): void;

interface UseEscapeKeyContext extends Pick<FloatingNode, "id" | "open" | "setOpen"> {}

interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: FloatingTree | null | undefined;
  capture?: boolean;
  preventDefault?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive on/off switch. |
| `tree` | `FloatingTree \| null \| undefined` | — | Closes only the deepest open node. |
| `capture` | `boolean` | `false` | Plain boolean, read once. |
| `preventDefault` | `boolean` | `false` | Plain boolean, read once. |
| `onEscape` | `(event: KeyboardEvent) => void` | — | Replaces the default close behavior. |
| `ignoreEscapeKey` | `(event: KeyboardEvent) => boolean` | — | Runs before close; lets children handle Escape first. |

## Returns

Returns `void`. Listens on `document` and closes with the `escape-key` reason.

## Details

`useEscapeKey` listens on `document` and ignores Escape while IME composition is active. By default it closes the node with the `escape-key` reason.

- `onEscape` replaces the default close behavior when you need custom handling. When provided, the node is not closed automatically.
- Presses already handled elsewhere (`defaultPrevented`), non-Escape keys, and presses while the node is closed are ignored.
- When nested nodes share an explicit [`useFloatingTree`](/api/use-floating-tree) passed via `tree`, one Escape press closes only the deepest open node. Repeated presses walk the stack from the innermost surface outward. Without `tree`, only the current node closes.

## Example

Close a click-opened surface with Escape:

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

  <div v-if="node.open" ref="floatingEl" :style="styles">Press Escape to close</div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Opens on click
- [`useFocus`](/api/use-focus) - Opens on focus
- [`useDismiss`](/api/use-dismiss) - Groups Escape and outside-press dismissal
- [`useFocusTrap`](/api/use-focus-trap) - Traps and restores focus
- [`useFloatingTree`](/api/use-floating-tree) - Coordinates nested dismissal
