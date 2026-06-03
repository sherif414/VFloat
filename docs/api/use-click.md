---
description: Opens and closes floating content on click.
---

# useClick

`useClick` toggles a floating context from pointer and keyboard activation. Pair it with [`useOutsideClick`](/api/use-outside-click) when the same surface should close on outside pointer input.

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
}
```

## Details

`useClick` attaches trigger handlers to `refs.anchorEl`. It supports mouse, touch, and keyboard activation, including Enter and Space on non-button triggers.

- `event` controls which mouse event toggles the trigger. It defaults to `"click"`.
- `toggle` defaults to `true`.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloatingContext, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);
useClick(context);
useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Add Outside-Click Dismissal

Use `useOutsideClick` alongside `useClick` when the surface should close after outside pointer input.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingContext, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);
useClick(context);
useOutsideClick(context);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

### Ignore specific outside targets

Use a predicate when some outside targets should keep the floating element open.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingContext, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const helperEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);
useClick(context);
useOutsideClick(context, {
  ignoreClick: (_event, target) => {
    return target instanceof Node && !!helperEl.value?.contains(target);
  },
});
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Floating content</div>
  <div ref="helperEl">Helper content</div>
</template>
```

## See Also

- [`useFloatingContext`](/api/use-floating-context)
- [`useHover`](/api/use-hover)
- [`useFocus`](/api/use-focus)
- [`useOutsideClick`](/api/use-outside-click)
- [`useEscapeKey`](/api/use-escape-key)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
