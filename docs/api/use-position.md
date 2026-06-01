---
description: Add opt-in JavaScript positioning to a floating context.
---

# usePosition

`usePosition` adds JavaScript geometry to an existing floating context. It owns placement, strategy, middleware configuration, generated styles, auto-update wiring, and manual updates.

## Type

```ts
function usePosition(context: FloatingContext, options?: UsePositionOptions): FloatingPosition;
```

```ts
interface UsePositionOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>;
  strategy?: MaybeRefOrGetter<Strategy | undefined>;
  transform?: MaybeRefOrGetter<boolean | undefined>;
  middleware?: MaybeRefOrGetter<UsePositionMiddlewareOptions | undefined>;
  middlewares?: MaybeRefOrGetter<Middleware[]>;
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

interface UsePositionMiddlewareOptions {
  offset?: true | false | OffsetOptions;
  flip?: true | false | FlipOptions;
  shift?: true | false | ShiftOptions;
  matchWidth?: boolean;
  custom?: MaybeRefOrGetter<Middleware[] | undefined>;
}

interface FloatingPosition {
  x: Readonly<Ref<number>>;
  y: Readonly<Ref<number>>;
  strategy: Readonly<Ref<Strategy>>;
  placement: Readonly<Ref<Placement>>;
  middlewareData: Readonly<Ref<MiddlewareData>>;
  isPositioned: Readonly<Ref<boolean>>;
  styles: Readonly<Ref<FloatingStyles>>;
  update: () => Promise<void>;
}

type FloatingStyles = {
  position: Strategy;
  top: string;
  left: string;
  transform?: string;
  "will-change"?: string;
} & {
  [key: `--${string}`]: any;
};
```

## Details

`usePosition` reads `context.refs.anchorEl` and `context.refs.floatingEl`. It never creates or mutates open state.

- `placement` defaults to `"bottom"`.
- `strategy` defaults to `"absolute"`.
- `transform` is enabled by default and writes coordinates as a CSS transform.
- `middleware` configures common positioning behavior without manually composing Floating UI middleware.
- `middleware.custom` appends raw middleware after the declarative middleware options.
- `middlewares` still accepts a raw middleware pipeline for existing code, but new code should prefer `middleware` and `middleware.custom`.
- `autoUpdate` is enabled by default. Pass `false` to disable it, or pass an `AutoUpdateOptions` object.
- `enabled` gates computation and auto-update listeners without tying positioning to open state.
- `x`, `y`, `placement`, `strategy`, `middlewareData`, and `isPositioned` expose the last computed positioning result.
- `styles` is the style ref you usually bind to the floating element.
- Other composables, such as [`useArrow`](/api/use-arrow), can register middleware through the internal registry attached to the returned position object.

## Example

This tooltip opts into positioning after creating the shared context.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, useHover, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({
  refs: { anchorEl, floatingEl },
});
const { styles } = usePosition(context, {
  placement: "top",
  middleware: {
    offset: 8,
  },
  enabled: () => context.state.open.value,
});

useHover(context);
useRole(context, { role: "tooltip" });
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">Helpful detail</div>
</template>
```

Use `middleware.custom` when you need a middleware that VFloat does not expose as a semantic option.

```ts
usePosition(context, {
  placement: "bottom-start",
  middleware: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
    custom: [myCustomMiddleware()],
  },
});
```

## See Also

- [useFloatingContext](/api/use-floating-context) - Shared refs and open state
- [offset](/api/offset) - Add space between anchor and floating element
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning mental model
