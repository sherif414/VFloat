---
description: Add reactive positioning styles to a floating node using Floating UI.
---

# usePosition

`usePosition` computes reactive screen coordinates and inline styles for an existing floating node. It configures the middleware pipeline, sets placement and positioning strategy, auto-updates on scroll and resize, and exposes a ready-to-bind style object.

## Type

```ts
function usePosition(node: FloatingNode, options?: UsePositionOptions): FloatingPosition;

interface UsePositionOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>;
  strategy?: MaybeRefOrGetter<Strategy | undefined>;
  transform?: MaybeRefOrGetter<boolean | undefined>;
  middlewares?: MaybeRefOrGetter<UsePositionMiddlewaresOptions | Middleware[] | undefined>;
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
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

interface UsePositionArrowOptions {
  element?: Ref<HTMLElement | null>;
  padding?: Padding;
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
| `placement` | `MaybeRefOrGetter<Placement>` | `"bottom"` | Desired side and alignment (e.g. `"bottom-start"`). Reactive. |
| `strategy` | `MaybeRefOrGetter<Strategy>` | `"absolute"` | CSS positioning strategy: `"absolute"` or `"fixed"`. Reactive. |
| `transform` | `MaybeRefOrGetter<boolean>` | `true` | `true` uses CSS `transform: translate(x, y)`. `false` sets `top` and `left`. |
| `middlewares` | `MaybeRefOrGetter<UsePositionMiddlewaresOptions \| Middleware[]>` | `{}` | Declarative middleware configuration or a raw `Middleware[]` array. |
| `autoUpdate` | `MaybeRefOrGetter<boolean \| AutoUpdateOptions>` | `true` | Automatically recomputes on resize, scroll, and layout changes. Set `false` to disable. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Controls whether positioning computations and viewport listeners are active. |

### Declarative Middleware Options

When passing an object to `middlewares`, VFloat resolves built-in middlewares in the recommended pipeline order:

| Option | Type | Pipeline Step | Purpose |
| --- | --- | --- | --- |
| `inline` | `boolean \| InlineOptions` | 1 | Dissects multi-line inline triggers into individual client rects. |
| `offset` | `number \| OffsetOptions` | 2 | Adds distance between the anchor and the floating panel. |
| `flip` | `boolean \| FlipOptions` | 3 | Flips to alternate placements when space is constrained. |
| `autoPlacement` | `boolean \| AutoPlacementOptions` | 4 | Chooses the placement with the most available space (mutually exclusive with `flip`). |
| `shift` | `boolean \| ShiftOptions` | 5 | Nudges the element along the viewport boundary to stay visible. |
| `matchWidth` | `boolean` | 6 | Sets panel width to match the anchor's measured width via `size`. |
| `size` | `SizeOptions` | 7 | Measures boundary limits and invokes a custom resizing function. |
| `hide` | `boolean \| HideOptions` | 8 | Flags whether the anchor is clipped or the panel escaped boundaries. |
| `arrow` | `boolean \| UsePositionArrowOptions` | 9 | Calculates offsets for an arrow element using `node.refs.arrowEl`. |
| `custom` | `Middleware[]` | 10 | Appends custom Floating UI middleware instances at the end of the pipeline. |

Alternatively, you can pass a raw `Middleware[]` array to `middlewares` to fully customize the middleware instances and execution order.

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `x` / `y` | `Readonly<Ref<number>>` | Computed horizontal and vertical coordinates in pixels. |
| `strategy` | `Readonly<Ref<Strategy>>` | Active positioning strategy (`"absolute"` or `"fixed"`). |
| `placement` | `Readonly<Ref<Placement>>` | Effective placement after middleware execution (e.g. after flipping). |
| `middlewareData` | `Readonly<Ref<MiddlewareData>>` | Raw output produced by middlewares (such as arrow coordinates or hide flags). |
| `isPositioned` | `Readonly<Ref<boolean>>` | Becomes `true` once coordinates are computed for mounted elements. Resets to `false` on unmount. |
| `styles` | `Readonly<Ref<FloatingStyles>>` | Reactive inline style object with device-pixel-ratio subpixel rounding. Bind directly to `:style="styles"`. |
| `update` | `() => Promise<void>` | Imperatively forces an immediate coordinate recomputation. |

## Details

### Subpixel Snapping and Performance

`styles` applies `Math.round(val * dpr) / dpr` to coordinate outputs using `window.devicePixelRatio`. This prevents blurred text and rendering artifacts on high-DPI displays. On displays with DPR &ge; 1.5, `will-change: transform` is automatically applied.

### Server-Side Rendering (SSR)

`usePosition` is safe to run in SSR environments. On the server, `styles` renders safe baseline rules:

```css
position: absolute;
left: 0;
top: 0;
```

Full coordinate calculation begins once components mount in the browser.

### Dynamic Middleware Contributions

Companion composables such as [`useArrow`](/api/use-arrow) dynamically register their middleware into the node's internal registry. You do not need to configure arrow middleware manually when calling `useArrow(node)`.

## Example

### Declarative Middleware Configuration

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles, placement } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
  enabled: () => node.open.value,
});

useHover(node);
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="node.open" ref="floatingEl" :style="styles" :data-placement="placement">
    Tooltip content
  </div>
</template>
```

### Match Anchor Width

For dropdowns and select menus where the panel should match the trigger width:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 4,
    matchWidth: true,
  },
});

useClick(node);
</script>

<template>
  <button ref="anchorEl" style="width: 240px">Select an option</button>
  <div v-if="node.open" ref="floatingEl" :style="styles">
    Matches anchor width (240px)
  </div>
</template>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Provides element refs and open state
- [`useArrow`](/api/use-arrow) - Connects and styles an arrow element
- [`offset`](/api/offset) - Distance middleware
- [`flip`](/api/flip) - Placement fallback middleware
- [`shift`](/api/shift) - Viewport containment middleware
- [Placement and Positioning](/guide/placement-and-positioning) - Positioning concepts and pipeline
