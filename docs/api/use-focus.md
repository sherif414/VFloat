# useFocus

`useFocus` opens and closes a floating context when the anchor gains or loses focus.

## Type

```ts
function useFocus(context: UseFocusContext, options?: UseFocusOptions): UseFocusReturn;

interface UseFocusContext extends Pick<FloatingContext, "open" | "setOpen" | "refs"> {}

interface UseFocusOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  requireFocusVisible?: MaybeRefOrGetter<boolean>;
}

interface UseFocusReturn {
  cleanup: () => void;
}
```

## Details

`useFocus` is a keyboard-first interaction layer. It opens with the `focus` reason and closes with the `blur` reason, which keeps focus-driven surfaces easy to trace alongside hover and click interactions.

- `requireFocusVisible` defaults to `true`.
- Safari and window blur edge cases are handled internally.
- Call `cleanup()` if you need to remove the listeners manually.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useFocus } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);
useFocus(context);
</script>

<template>
  <button ref="anchorEl">Focus me</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

## See Also

- [`useHover`](/api/use-hover)
- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [Interactions](/guide/interactions)
