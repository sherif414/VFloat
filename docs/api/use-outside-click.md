---
description: Closes floating content when pointer input lands outside.
---

# useOutsideClick

`useOutsideClick` closes a floating context when a pointer event targets something outside its anchor, floating element, and linked child floating contexts.

## Type

```ts
function useOutsideClick(context: UseOutsideClickContext, options?: UseOutsideClickOptions): void;

interface UseOutsideClickContext extends Pick<FloatingContext, "refs" | "state"> {}

interface UseOutsideClickOptions {
  enabled?: MaybeRefOrGetter<boolean>;
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

`useOutsideClick` attaches a document-level listener and closes with the `"outside-pointer"` reason when the context is open.

- `enabled` defaults to `true`. Set it to `false` to disable dismissal.
- `event` defaults to `"pointerdown"`.
- `capture` defaults to `true`.
- `ignoreClick` skips selected outside clicks when it returns `true`.
- `onClick` replaces the default close behavior when you need custom logic.
- `ignoreScrollbar` defaults to `true` and prevents scrollbar interaction from closing the floating element.
- `ignoreDrag` defaults to `true` and ignores click events that finish outside after a drag started inside the floating element.

Pair this composable with `useClick`, `useHover`, or application-owned open state whenever outside pointer input should dismiss the floating surface.

## Example

This example opens the floating element manually and lets `useOutsideClick` own dismissal.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEscapeKey, useFloatingContext, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

useOutsideClick(context);
useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value, 'anchor-click')">
    Toggle
  </button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Ignore Specific Outside Targets

Use a predicate when some external UI should keep the floating element open.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const toolbarEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

useOutsideClick(context, {
  ignoreClick: (_event, target) => {
    return target instanceof Node && !!toolbarEl.value?.contains(target);
  },
});
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(true, 'anchor-click')">Open</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Floating content</div>
  <div ref="toolbarEl">Toolbar content</div>
</template>
```

## See Also

- [`useClick`](/api/use-click)
- [`useEscapeKey`](/api/use-escape-key)
- [`useFloatingContext`](/api/use-floating-context)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
