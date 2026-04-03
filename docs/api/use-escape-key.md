# useEscapeKey

`useEscapeKey` closes a floating context when Escape is pressed.

## Type

```ts
function useEscapeKey(context: UseEscapeKeyContext, options?: UseEscapeKeyOptions): void;

interface UseEscapeKeyContext extends Pick<FloatingContext, "state"> {}

interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  capture?: boolean;
  preventDefault?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
}
```

## Details

`useEscapeKey` listens on `document` and ignores Escape while IME composition is active. By default it closes the context with the `escape-key` reason.

- `enabled` lets you turn the listener on and off.
- `capture` defaults to `false`.
- `preventDefault` defaults to `false`.
- `onEscape` replaces the default close behavior when you need custom handling.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);
useClick(context);
useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Press Escape to close
  </div>
</template>
```

## See Also

- [`useClick`](/api/use-click)
- [`useFocus`](/api/use-focus)
- [`useFocusTrap`](/api/use-focus-trap)
