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
  middlewares?: MaybeRefOrGetter<UsePositionMiddlewaresOptions | Middleware[] | undefined>;
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

interface UsePositionArrowOptions {
  element?: Ref<HTMLElement | null>;
  padding?: Padding;
}

interface UsePositionMiddlewaresOptions {
  inline?: true | false | InlineOptions;
  offset?: true | false | OffsetOptions;
  flip?: true | false | FlipOptions;
  autoPlacement?: true | false | AutoPlacementOptions;
  shift?: true | false | ShiftOptions;
  matchWidth?: boolean;
  size?: SizeOptions;
  hide?: true | false | HideOptions;
  arrow?: true | false | UsePositionArrowOptions;
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
| `strategy` | `MaybeRefOrGetter<Strategy \| undefined>` | `"absolute"` | Reactive; `"absolute"` or `"fixed"`. |
| `transform` | `MaybeRefOrGetter<boolean \| undefined>` | `true` | Writes coordinates as CSS `transform`; `false` writes `left`/`top`. |
| `middlewares` | `MaybeRefOrGetter<UsePositionMiddlewaresOptions \| Middleware[] \| undefined>` | `[]` | Declarative object resolving built-in middlewares or a raw `Middleware[]` array. |
| `autoUpdate` | `MaybeRefOrGetter<boolean \| AutoUpdateOptions \| undefined>` | `true` | `false` disables; wiring runs only while `enabled` and both elements are mounted. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates computation and listeners without tying to open state. |

### Middlewares Options

When passing an options object to `middlewares`, entries are resolved in standard pipeline order:

1. `inline`: Positions relative to individual client rects for multi-line inline triggers.
2. `offset`: Adds spacing between trigger and floating element.
3. `flip`: Flips floating element to opposite placement when overflowing.
4. `autoPlacement`: Chooses placement with the most available space (cannot combine with `flip`).
5. `shift`: Shifts floating element along its axis to remain in the viewport.
6. `matchWidth`: Resizes floating element to match trigger element width (`size` middleware).
7. `size`: Measures available space and runs custom resize logic.
8. `hide`: Identifies when trigger or floating element is clipped or escapes view.
9. `arrow`: Positions an arrow element (uses `node.refs.arrowEl` or custom element ref).
10. `custom`: Array of custom Floating UI middleware instances appended at the end.

Alternatively, pass a raw `Middleware[]` array directly to `middlewares` for full control over middleware instances and pipeline ordering.

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `x` / `y` | `Readonly<Ref<number>>` | Last computed coordinates. |
| `strategy` / `placement` | `Readonly<Ref<…>>` | Last computed strategy and placement. |
| `middlewareData` | `Readonly<Ref<MiddlewareData>>` | Raw middleware output from the pipeline. |
| `isPositioned` | `Readonly<Ref<boolean>>` | `true` after compute completes with mounted elements; resets to `false` when unmounted or disabled. |
| `styles` | `Readonly<Ref<FloatingStyles>>` | Inline style object with subpixel-rounded coordinates. Safe base styles rendered during SSR. |
| `update` | `() => Promise<void>` | Manual recompute; no-op while disabled or elements are missing. |

## Details

`usePosition` reads `node.refs.anchorEl` and `node.refs.floatingEl`. It never creates or mutates open state.

- `middlewares.custom` appends raw middleware after declarative entries.
- Passing a raw `Middleware[]` array directly to `middlewares: [...]` replaces declarative assembly entirely.
- Companion composables such as [`useArrow`](/api/use-arrow) register their middleware dynamically into the node's internal middleware registry.
- `placement`, `strategy`, `middlewares`, and `enabled` all accept reactive values. Changing them automatically triggers a recompute.

## Example

### Declarative Middlewares

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useHover, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
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

### Raw Middleware Array

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift } from "@floating-ui/dom";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: [
    offset(10),
    flip(),
    shift({ padding: 12 }),
  ],
});
</script>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Shared refs and open state
- [`useArrow`](/api/use-arrow) - Arrow element positioning and styles
- [`offset`](/api/offset) - Add space between anchor and floating element
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning mental model
