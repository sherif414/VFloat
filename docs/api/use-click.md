---
description: Opens and closes floating content on click.
---

# useClick

`useClick` toggles a floating context from pointer and keyboard activation. Outside-click dismissal is on by default — opt out with `closeOnOutsideClick: false` when you need a pure trigger toggle.

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
  closeOnOutsideClick?: boolean | OutsideClickPredicate;
  outsideClickEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  outsideCapture?: MaybeRefOrGetter<boolean>;
  onOutsideClick?: (event: MouseEvent) => void;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}

type OutsideClickPredicate = (event: MouseEvent, target: EventTarget | null) => boolean;
```

## Details

`useClick` attaches trigger handlers to `refs.anchorEl` and optional outside-click handlers to `document`. It supports mouse, touch, and keyboard activation, including Enter and Space on non-button triggers.

- `event` controls which mouse event toggles the trigger. It defaults to `"click"`.
- `toggle` defaults to `true`.
- `closeOnOutsideClick` defaults to `true`. Set it to `false` to keep the floating element open when clicking outside. Pass a predicate to decide per outside click. Unlike the other boolean click options, this option is not reactive because function values are reserved for predicates.
- `outsideClickEvent` defaults to `"pointerdown"`.
- `onOutsideClick` replaces the default outside-close behavior when you need custom logic.

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

### Disable outside-click dismissal

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingContext, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);
useClick(context, { closeOnOutsideClick: false });
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
import { useClick, useFloatingContext, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const helperEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);
useClick(context, {
  closeOnOutsideClick: (_event, target) => {
    return !(target instanceof Node && helperEl.value?.contains(target));
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
- [`useEscapeKey`](/api/use-escape-key)
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
