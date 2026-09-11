---
description: Opens and closes floating content on focus.
---

# useFocus

`useFocus` opens and closes a floating node when the anchor gains or loses focus.

## Type

```ts
function useFocus(node: UseFocusContext, options?: UseFocusOptions): UseFocusReturn;

interface UseFocusContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseFocusOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: FloatingTree | null | undefined;
  requireFocusVisible?: MaybeRefOrGetter<boolean>;
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
}

interface UseFocusReturn {
  cleanup: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Fully reactive. |
| `tree` | `FloatingTree \| null \| undefined` | — | Family-aware focus checks for nested surfaces. |
| `requireFocusVisible` | `MaybeRefOrGetter<boolean>` | `true` | Keyboard focus opens; pointer-only focus usually does not. |
| `ignoreFocusOut` | `(target: EventTarget \| null) => boolean` | — | Keeps open when focus moves to selected outside targets. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `cleanup` | `() => void` | Removes listeners manually; also runs on scope dispose. |

## Details

`useFocus` is a keyboard-first interaction layer. It opens with the `focus` reason and closes with the `blur` reason, which keeps focus-driven surfaces easy to trace alongside hover and click interactions.

- With the default `requireFocusVisible: true`, keyboard focus opens the surface while pointer-only focus usually does not.
- Focus can move into the floating element, or stay within the anchor subtree, without immediately closing the surface.
- `tree` makes focus checks family-aware across nested surfaces. When omitted, only the node's own anchor and floating elements count as inside.
- Blur handling is deferred a tick and reads `activeElement` (rather than trusting `relatedTarget`), so Shadow DOM and programmatic focus moves close reliably. Tab-switching away and back does not reopen a closed surface.
- Safari, window blur, and cross-document focus edge cases are handled internally.

## Example

Open on keyboard focus:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useFocus } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);
useFocus(node);
</script>

<template>
  <button ref="anchorEl">Focus me</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`useHover`](/api/use-hover) - Opens on hover
- [`useClick`](/api/use-click) - Opens on click
- [`useDismiss`](/api/use-dismiss) - Closes on Escape and outside pointer input
- [Build Accessible Tooltips](/guide/build-accessible-tooltips) - Focus workflow
