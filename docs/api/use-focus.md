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
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;
  requireFocusVisible?: MaybeRefOrGetter<boolean>;
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
}

interface UseFocusReturn {
  cleanup: () => void;
}
```

## Details

`useFocus` is a keyboard-first interaction layer. It opens with the `focus` reason and closes with the `blur` reason, which keeps focus-driven surfaces easy to trace alongside hover and click interactions.

- `enabled` defaults to `true` and is fully reactive.
- `requireFocusVisible` defaults to `true`.
- With the default `requireFocusVisible: true`, keyboard focus opens the surface while pointer-only focus usually does not.
- Focus can move into the floating element, or stay within the anchor subtree, without immediately closing the surface.
- `tree` makes focus checks family-aware across nested surfaces. When omitted, only the node's own anchor and floating elements count as inside.
- `ignoreFocusOut` is a predicate to determine if focus moving to a specific outside target should be ignored, leaving the floating element open. It is consulted both when the anchor blurs and when focus lands elsewhere in the document.
- Blur handling is deferred a tick and reads `activeElement` (rather than trusting `relatedTarget`), so Shadow DOM and programmatic focus moves close reliably. Tab-switching away and back does not reopen a closed surface.
- Safari, window blur, and cross-document focus edge cases are handled internally.
- Call `cleanup()` if you need to remove the anchor, document, and window listeners manually and clear any pending blur timeout. Cleanup also runs automatically on scope dispose.

## Example

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

- [`useHover`](/api/use-hover)
- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [Build Accessible Tooltips](/guide/build-accessible-tooltips)
