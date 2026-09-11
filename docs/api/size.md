---
description: Measures available boundary space to constrain or resize the floating element.
---

# size

`size` measures the available width and height inside the clipping boundary and invokes an `apply` callback where you can update styles such as `max-height` or `max-width`.

Use it for scrolling menus, combobox lists, or popovers that must shrink to fit within cramped viewports.

## Type

```ts
function size(options?: SizeOptions): Middleware;

interface SizeOptions {
  apply?: (state: SizeState) => void;
  padding?: Padding;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  elementContext?: ElementContext;
  altBoundary?: boolean;
}

interface SizeState {
  availableWidth: number;
  availableHeight: number;
  rects: MiddlewareState["rects"];
  elements: {
    floating: HTMLElement;
    reference: Element | VirtualElement;
  };
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `apply` | `(state: SizeState) => void` | `undefined` | Callback invoked on each position recalculation with available dimensions. |
| `padding` | `Padding` | `0` | Boundary inset subtracted from available width and height. |
| `boundary` | `Boundary` | `"clippingAncestors"` | Element or rect defining the clipping area. |
| `rootBoundary` | `RootBoundary` | `"viewport"` | Root boundary context (`"viewport"` or `"document"`). |
| `altBoundary` | `boolean` | `false` | Checks boundaries of the floating element instead of the anchor. |

## Returns

`size` returns a `Middleware` object with `name: "size"`.

## Details

### Pipeline Placement

`size` runs **after `flip` and `shift`**:

1. `flip` and `shift` determine final side and position.
2. `size` evaluates how much room remains between the floating panel's coordinates and the clipping boundaries.
3. Your `apply` callback restricts `max-height` or `max-width`.

### Shortcut: `matchWidth`

When you only need the floating panel to match the anchor's width (a common requirement for selects and comboboxes), use `matchWidth: true` directly in [`usePosition`](/api/use-position). VFloat injects a pre-configured `size` middleware for you:

```ts
usePosition(node, {
  middlewares: { matchWidth: true },
});
```

## Example

### Constraining Height with Scrolling

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
    size: {
      padding: 16,
      apply({ availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxHeight: `${Math.max(100, availableHeight)}px`,
        });
      },
    },
  },
});
</script>

<template>
  <button ref="anchorEl">Toggle List</button>

  <div v-if="node.open" ref="floatingEl" class="scroll-list" :style="styles">
    <div v-for="i in 50" :key="i" class="item">Item {{ i }}</div>
  </div>
</template>

<style scoped>
.scroll-list {
  overflow-y: auto;
  border: 1px solid #ccc;
  background: white;
  width: 200px;
}
.item {
  padding: 8px 12px;
}
</style>
```

## See Also

- [`usePosition`](/api/use-position) - Positioning composable and `matchWidth` shortcut
- [`shift`](/api/shift) - Keeps floating element in view
- [`flip`](/api/flip) - Flips placement when space is constrained
