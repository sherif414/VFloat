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
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;
  capture?: boolean;
  preventDefault?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}
```

## Details

`useEscapeKey` listens on `document` and ignores Escape while IME composition is active. By default it closes the node with the `escape-key` reason.

- `enabled` (default `true`) is reactive and lets you turn the listener on and off. `tree` is reactive too; `capture` and `preventDefault` are plain booleans read once.
- `capture` defaults to `false`.
- `preventDefault` defaults to `false`.
- `onEscape` replaces the default close behavior when you need custom handling. When provided, the node is not closed automatically.
- `ignoreEscapeKey` is a predicate to determine if an escape key press should be ignored, allowing sub-components or child branches to handle the escape event first. It runs before `preventDefault`, `onEscape`, and the default close.
- Presses already handled elsewhere (`defaultPrevented`), non-Escape keys, and presses while the node is closed are ignored.
- When nested nodes share an explicit [`useFloatingTree`](/api/use-floating-tree) passed via `tree`, one Escape press closes only the deepest open node. Repeated presses walk the stack from the innermost surface outward. Without `tree`, only the current node closes.

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

  <div v-if="node.open" ref="floatingEl" :style="styles">Press Escape to close</div>
</template>
```

## See Also

- [`useClick`](/api/use-click)
- [`useFocus`](/api/use-focus)
- [`useFocusManager`](/api/use-focus-manager)
- [useFloatingTree](/api/use-floating-tree)
