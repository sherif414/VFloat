---
description: Positions a floating element relative to pointer coordinates using a virtual anchor.
---

# useClientPoint

`useClientPoint` positions a floating element relative to cursor coordinates. It replaces the node's anchor reference with a virtual element that tracks pointer movements or captures trigger click coordinates.

Use it for cursor-following tooltips, image hover previews, and right-click context menus.

## Type

```ts
function useClientPoint(
  node: UseClientPointContext,
  options?: UseClientPointOptions,
): UseClientPointReturn;

interface UseClientPointContext extends Pick<FloatingNode, "open"> {
  refs: Pick<FloatingNode["refs"], "anchorEl">;
}

type TrackingMode = "follow" | "static";

interface UseClientPointOptions {
  /**
   * Element that receives pointer listeners and provides fallback geometry
   * for the virtual anchor. Defaults to `document.documentElement`.
   */
  trackingAreaEl?: Ref<HTMLElement | null>;

  /**
   * Enables or disables client-point behavior without removing the composable.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Optional externally controlled x coordinate. Both `x` and `y` must resolve
   * to non-null numbers for controlled mode; a single axis has no effect.
   */
  x?: MaybeRefOrGetter<number | null>;

  /**
   * Optional externally controlled y coordinate. Both `x` and `y` must resolve
   * to non-null numbers for controlled mode; a single axis has no effect.
   */
  y?: MaybeRefOrGetter<number | null>;

  /**
   * Chooses how the pointer position behaves after the floating element opens.
   * Not reactive after setup.
   * @default "follow"
   */
  trackingMode?: TrackingMode;
}

interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `trackingAreaEl` | `Ref<HTMLElement \| null>` | `document.documentElement` | Target element that receives pointer listeners. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Disabling disconnects listeners and restores static anchoring. |
| `x` / `y` | `MaybeRefOrGetter<number \| null>` | `null` | External coordinates. When both are non-null finite numbers, enters controlled mode. |
| `trackingMode` | `"follow" \| "static"` | `"follow"` | `"follow"` updates coordinates continuously while open. `"static"` captures coordinates at open time. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `coordinates` | `Readonly<Ref<{ x: number \| null; y: number \| null }>>` | Last recorded pointer coordinates. `null` before first trigger and when closed in uncontrolled mode. |

## Details

### Virtual Element Replacement

`useClientPoint` replaces `node.refs.anchorEl.value` with a [virtual element](/guide/use-virtual-anchors) implementing `getBoundingClientRect()`. The virtual element returns a 0&times;0 rectangle positioned at the active pointer coordinates.

### Tracking Modes

- **`trackingMode: "follow"`**: The floating panel continuously tracks the pointer while open. Only mouse and pen input moves the surface; touch interactions are ignored to prevent layout jumping.
- **`trackingMode: "static"`**: The floating panel captures the opening event's position (e.g. right-click coordinate) and anchors there. Moving the pointer afterward does not move the panel. Closing clears the point.

### Controlled Coordinates

When you supply both `x` and `y` as finite numbers, `useClientPoint` detaches internal pointer listeners and drives the virtual element directly from your coordinates. This is useful when pointer coordinates are managed by external canvas or map components.

## Example

### Context Menu (Static Tracking)

Right-click anywhere in an area to open a context menu anchored at the click point:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useDismiss, useFloatingNode, usePosition } from "v-float";

const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    flip: true,
    shift: { padding: 8 },
  },
});

useClientPoint(node, {
  trackingAreaEl,
  trackingMode: "static",
});

useDismiss(node);

function onContextMenu(event: MouseEvent) {
  event.preventDefault();
  node.setOpen(true, "anchor-click", event);
}
</script>

<template>
  <div
    ref="trackingAreaEl"
    class="canvas-area"
    @contextmenu="onContextMenu"
  >
    Right-click inside this container

    <div v-if="node.open" ref="floatingEl" class="context-menu" :style="styles">
      <button @click="node.setOpen(false)">Cut</button>
      <button @click="node.setOpen(false)">Copy</button>
      <button @click="node.setOpen(false)">Paste</button>
    </div>
  </div>
</template>

<style scoped>
.canvas-area {
  height: 240px;
  border: 1px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.context-menu {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px;
}
</style>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Creates node and holds element refs
- [`usePosition`](/api/use-position) - Coordinates and styling calculation
- [`useDismiss`](/api/use-dismiss) - Outside click and Escape handling
- [Use Virtual Anchors](/guide/use-virtual-anchors) - Guide to coordinate-based positioning
