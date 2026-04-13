---
description: Opens and closes floating content on click.
---

# useClick

`useClick` toggles a floating context from pointer and keyboard activation. Enable outside-click closing when you want popover or menu behavior instead of a pure trigger toggle.

## Type

```ts
function useClick(context: UseClickContext, options?: UseClickOptions): void;

interface UseClickContext extends Pick<FloatingContext, "refs" | "state"> {}

interface UseClickOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  event?: MaybeRefOrGetter<"click" | "mousedown">;
  toggle?: MaybeRefOrGetter<boolean>;
  ignoreMouse?: MaybeRefOrGetter<boolean>;
  ignoreKeyboard?: MaybeRefOrGetter<boolean>;
  ignoreTouch?: MaybeRefOrGetter<boolean>;
  closeOnOutsideClick?: MaybeRefOrGetter<boolean>;
  outsideClickEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  outsideCapture?: MaybeRefOrGetter<boolean>;
  onOutsideClick?: (event: MouseEvent) => void;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}
```

## Details

`useClick` attaches trigger handlers to `refs.anchorEl` and optional outside-click handlers to `document`. It supports mouse, touch, and keyboard activation, including Enter and Space on non-button triggers.

- `event` controls which mouse event toggles the trigger. It defaults to `"click"`.
- `toggle` defaults to `true`.
- `closeOnOutsideClick` defaults to `false`, so enable it explicitly when you want dismiss-on-outside-click behavior.
- `outsideClickEvent` defaults to `"pointerdown"`.
- `onOutsideClick` replaces the default outside-close behavior when you need custom logic.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);
useClick(context, { closeOnOutsideClick: true });
useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
  </div>
</template>
```

## See Also

- [`useFloating`](/api/use-floating)
- [`useHover`](/api/use-hover)
- [`useFocus`](/api/use-focus)
- [`useEscapeKey`](/api/use-escape-key)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
