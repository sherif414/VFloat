---
description: Add opt-in JavaScript positioning to a floating context.
---

# usePosition

`usePosition` adds JavaScript geometry to an existing floating context. It owns placement, strategy, middlewares, generated styles, auto-update wiring, and manual updates.

## Type

```ts
function usePosition(context: FloatingContext, options?: UsePositionOptions): FloatingPosition;
```

```ts
interface UsePositionOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>;
  strategy?: MaybeRefOrGetter<Strategy | undefined>;
  transform?: MaybeRefOrGetter<boolean | undefined>;
  middlewares?: MaybeRefOrGetter<Middleware[]>;
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}
```

## Details

`usePosition` reads `context.refs.anchorEl` and `context.refs.floatingEl`. It never creates or mutates open state.

- `placement` defaults to `"bottom"`.
- `strategy` defaults to `"absolute"`.
- `transform` is enabled by default and writes coordinates as a CSS transform.
- `middlewares` accepts the middleware pipeline used by `offset`, `flip`, `shift`, `size`, `autoPlacement`, `hide`, and `arrow`.
- `autoUpdate` is enabled by default. Pass `false` to disable it, or pass an `AutoUpdateOptions` object.
- `enabled` gates computation and auto-update listeners without tying positioning to open state.
- `styles` is the style ref you usually bind to the floating element.

## Example

This tooltip opts into positioning after creating the shared context.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloatingContext, useHover, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext(anchorEl, floatingEl);
const position = usePosition(context, {
  placement: "top",
  middlewares: [offset(8)],
  enabled: () => context.state.open.value,
});

useHover(context);
useRole(context, { role: "tooltip" });
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="context.state.open.value" ref="floatingEl" :style="position.styles.value">
    Helpful detail
  </div>
</template>
```

## See Also

- [useFloatingContext](/api/use-floating-context) - Shared refs and open state
- [offset](/api/offset) - Add space between anchor and floating element
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning mental model
