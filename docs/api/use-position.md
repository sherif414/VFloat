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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `placement` | `MaybeRefOrGetter<Placement \| undefined>` | `"bottom"` | Reactive; changing triggers recompute. |
| `strategy` | `MaybeRefOrGetter<Strategy \| undefined>` | `"absolute"` | Reactive. |
| `transform` | `MaybeRefOrGetter<boolean \| undefined>` | `true` | Writes coordinates as CSS transform; `false` writes `left`/`top`. |
| `middleware` | `MaybeRefOrGetter<UsePositionMiddlewareOptions \| undefined>` | — | Declarative entries resolve as `inline`, `offset`, `flip`, `shift`, `size` (from `matchWidth`), then `custom`. |
| `middlewares` | `MaybeRefOrGetter<Middleware[]>` | `[]` | Raw pipeline for existing code; new code should prefer `middleware`. |
| `autoUpdate` | `MaybeRefOrGetter<boolean \| AutoUpdateOptions \| undefined>` | `true` | `false` disables; wiring runs only while `enabled` and both elements are mounted. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates computation and listeners without tying to open state. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `x` / `y` | `Readonly<Ref<number>>` | Last computed coordinates. |
| `strategy` / `placement` | `Readonly<Ref<…>>` | Last computed strategy and placement. |
| `middlewareData` | `Readonly<Ref<MiddlewareData>>` | Raw middleware output. |
| `isPositioned` | `Readonly<Ref<boolean>>` | `true` after a compute while open; resets on close, disable, and dispose. |
| `styles` | `Readonly<Ref<FloatingStyles>>` | Bind to the floating element. Rounded by DPR; safe base style before mount. |
| `update` | `() => Promise<void>` | Manual recompute; no-op while disabled or elements are missing. |

## Details

`usePosition` reads `node.refs.anchorEl` and `node.refs.floatingEl`. It never creates or mutates open state.

- `middleware.custom` appends raw middleware after the declarative entries.
- Companion composables such as [`useArrow`](/api/use-arrow) register their middleware on the same node by name. A registered entry replaces the base entry with the same name instead of duplicating it.
- `placement`, `strategy`, `middleware`, `middlewares`, and `enabled` all accept reactive values. Changing them triggers a recompute when enabled.
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

Use `middleware.custom` (see Options) when you need a middleware that VFloat does not expose as a semantic option.

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Shared refs and open state
- [`offset`](/api/offset) - Add space between anchor and floating element
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning mental model
