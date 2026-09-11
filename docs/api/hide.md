---
description: Exposes visibility state for clipped anchors and escaped floating elements.
---

# hide

`hide` detects when the anchor element is clipped out of view by a scroll container, or when the floating element escapes its boundary. It records visibility flags in `middlewareData` so your template or styles can hide detached content.

## Type

```ts
function hide(options?: HideOptions): Middleware;

interface HideOptions {
  strategy?: "referenceHidden" | "escaped";
  padding?: Padding;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  elementContext?: ElementContext;
  altBoundary?: boolean;
}

interface HideData {
  referenceHidden?: boolean;
  escaped?: boolean;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `strategy` | `"referenceHidden" \| "escaped"` | `"referenceHidden"` | Whether to track the anchor being clipped (`"referenceHidden"`) or the panel escaping (`"escaped"`). |
| `padding` | `Padding` | `0` | Inset padding around the boundary edge. |
| `boundary` | `Boundary` | `"clippingAncestors"` | Element or rect defining the clipping area. |
| `rootBoundary` | `RootBoundary` | `"viewport"` | Root boundary context (`"viewport"` or `"document"`). |
| `altBoundary` | `boolean` | `false` | When `true`, checks boundaries against the floating element instead of the anchor. |

## Returns

`hide` returns a `Middleware` object with `name: "hide"`. It writes status flags to `middlewareData.value.hide`:

| Field | Type | Notes |
| --- | --- | --- |
| `referenceHidden` | `boolean \| undefined` | `true` when the anchor element is fully clipped by its scroll parent. |
| `escaped` | `boolean \| undefined` | `true` when the floating element escapes its clipping boundary. |

## Details

### Does Not Modify Styles Directly

`hide` does not modify element styles or toggle visibility on its own. It only writes boolean flags into `middlewareData.value.hide`. You map these flags to reactive CSS rules (such as `visibility: hidden` or `pointer-events: none`).

### Pipeline Placement

`hide` must run **at the very end of the pipeline** after all positioning, shifting, and sizing calculations are complete.

In [`usePosition`](/api/use-position), declaring `middlewares: { hide: true }` automatically positions `hide` at the end of the pipeline.

## Example

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles, middlewareData } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
    hide: true,
  },
});

const isHidden = computed(() => {
  return middlewareData.value.hide?.referenceHidden ?? false;
});
</script>

<template>
  <div class="scroll-container">
    <button ref="anchorEl">Scroll me out of view</button>

    <div
      v-if="node.open"
      ref="floatingEl"
      class="tooltip"
      :style="[styles, { visibility: isHidden ? 'hidden' : 'visible' }]"
    >
      Hides when anchor scrolls out of view
    </div>
  </div>
</template>

<style scoped>
.scroll-container {
  overflow-y: auto;
  height: 180px;
  border: 1px solid #ccc;
  padding: 40px 16px;
}
.tooltip {
  background: #222;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
}
</style>
```

## See Also

- [`usePosition`](/api/use-position) - Positioning engine
- [`shift`](/api/shift) - Keeps floating element in view
- [`flip`](/api/flip) - Moves to a better placement when space is limited
