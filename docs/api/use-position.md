---
description: Add opt-in JavaScript positioning to a floating node.
---

# usePosition

`usePosition` adds JavaScript geometry to an existing floating node. It owns placement, strategy, middleware configuration, generated styles, auto-update wiring, and manual updates.

## Type

```ts
function usePosition(node: FloatingNode, options?: UsePositionOptions): FloatingPosition;
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
  inline?: true | false | InlineOptions;
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

`usePosition` reads `node.refs.anchorEl` and `node.refs.floatingEl`. It never creates or mutates open state.

- `placement` defaults to `"bottom"`.
- `strategy` defaults to `"absolute"`.
- `transform` is enabled by default and writes coordinates as a CSS transform. Pass `false` to write `left` and `top` instead.
- `middleware` configures common positioning behavior without manually composing Floating UI middleware. Declarative entries resolve in order: `inline`, `offset`, `flip`, `shift`, `size` (from `matchWidth`), then `middleware.custom`.
- `middleware.custom` appends raw middleware after the declarative entries.
- `middlewares` still accepts a raw middleware pipeline for existing code, but new code should prefer `middleware` and `middleware.custom`.
- Companion composables such as [`useArrow`](/api/use-arrow) register their middleware on the same node by name. A registered entry replaces the base entry with the same name instead of duplicating it.
- `autoUpdate` is enabled by default. Pass `false` to disable it, or pass an `AutoUpdateOptions` object. Wiring only runs while `enabled` is true and both elements are mounted, and it cleans up when either element changes.
- `enabled` gates computation and auto-update listeners without tying positioning to open state. `update()` is a no-op while disabled or while either element is missing.
- `placement`, `strategy`, `middleware`, `middlewares`, and `enabled` all accept reactive values. Changing them triggers a recompute when enabled.
- `x`, `y`, `placement`, `strategy`, and `middlewareData` expose the last computed result. `isPositioned` reflects `node.open` at compute time: it becomes `true` after a successful compute while open, and resets to `false` on close, on disable, and on scope dispose.
- `styles` is the style ref you usually bind to the floating element. Coordinates are rounded by device pixel ratio, `will-change: transform` is added on high-DPR screens, and a safe base style is returned before the floating element mounts.
- Computation failures log in development without throwing.

## Example

This tooltip opts into positioning after creating the node.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useHover, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "top",
  middleware: {
    offset: 8,
  },
  enabled: () => node.open.value,
});

useHover(node);
useRole(node, { role: "tooltip" });
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="node.open" ref="floatingEl" :style="styles">Helpful detail</div>
</template>
```

Use `middleware.custom` when you need a middleware that VFloat does not expose as a semantic option.

```ts
usePosition(node, {
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

- [useFloatingNode](/api/use-floating-node) - Shared refs and open state
- [offset](/api/offset) - Add space between anchor and floating element
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning mental model
