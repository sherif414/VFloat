# useClientPoint

The `useClientPoint` composable configures a floating element (managed by `useFloating`) to position itself relative to the client's pointer (e.g., mouse cursor or touch point). It achieves this by dynamically updating the `anchorEl` within the `FloatingContext` to a virtual element that represents the pointer's current coordinates. This allows the floating element to "follow" the pointer.

## Usage Example

Here's how to use `useClientPoint` in conjunction with `useFloating`:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint } from "vfloat"

// Ref for the DOM element that pointer events will be listened on
const pointerTargetRef = ref<HTMLElement | null>(null)
// Ref for the DOM element that will float
const floatingElRef = ref<HTMLElement | null>(null)
// Controls the visibility of the floating element
const isOpen = ref(false)

// 1. Initialize useFloating.
// The `referenceRef` for useFloating can initially be the pointerTargetRef.
// useClientPoint will later override `context.refs.anchorEl` with a virtual element.
const { floatingStyles, context: floatingContext } = useFloating(
  pointerTargetRef, // Initial reference, will be effectively replaced by virtual element
  floatingElRef,
  {
    placement: "bottom-start", // This will be relative to the client point
    open: isOpen,
    // `whileElementsMounted: autoUpdate` could be added if updates on scroll/resize are needed
    // while the pointer isn't moving.
  }
)

// 2. Initialize useClientPoint.
// It takes the pointerTargetRef (to listen for mouse/touch events) and the
// floatingContext (to update its anchorEl).
const clientPoint = useClientPoint(pointerTargetRef, floatingContext, {
  enabled: isOpen, // Only track and update when the floating element is open
  axis: "both", // The virtual element follows both x and y pointer axes
})

function handlePointerEnter() {
  isOpen.value = true
}

function handlePointerLeave() {
  isOpen.value = false
}
</script>

<template>
  <div
    ref="pointerTargetRef"
    class="pointer-target-area"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
  >
    Hover over this area to see the floating element.
    <div v-if="isOpen" style="font-size: 0.8em; margin-top: 5px;">
      (Raw ClientX: {{ clientPoint.coordinates.value.x }}, ClientY:
      {{ clientPoint.coordinates.value.y }})
    </div>
  </div>

  <div v-if="isOpen" ref="floatingElRef" class="floating-tooltip" :style="floatingStyles">
    Tooltip following pointer
  </div>
</template>

<style scoped>
.pointer-target-area {
  width: 300px;
  height: 150px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  margin-bottom: 20px;
}
.floating-tooltip {
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  pointer-events: none; /* Important for tooltips that follow the cursor */
  /* Ensure z-index if it might be overlapped */
  z-index: 1000;
}
</style>
```

### Explanation:

1.  **`pointerTargetRef`**: This is a Vue ref attached to the DOM element where you want to detect pointer movements (e.g., a div, a button).
2.  **`floatingElRef`**: This is a Vue ref for the actual element that will appear and float.
3.  **`useFloating`**: Initialize `useFloating` as usual. You can pass `pointerTargetRef` as its initial `referenceEl`. The `placement` option will determine how the `floatingElRef` is positioned relative to the (eventual) client point.
4.  **`useClientPoint`**:
    - Pass `pointerTargetRef` to it, so it knows which element's pointer events to track.
    - Pass the `context` from `useFloating`. `useClientPoint` uses this to set `context.refs.anchorEl` to a new [Virtual Element](https://floating-ui.com/docs/virtual-elements). This virtual element's `getBoundingClientRect` will return the current pointer coordinates.
    - `useFloating` automatically reacts to changes in `context.refs.anchorEl` and re-positions `floatingElRef` based on the virtual element's position.
5.  **Styling**: Apply the `floatingStyles` from `useFloating` to your `floatingElRef` to position it.
6.  **`clientPoint.coordinates`**: The return from `useClientPoint` includes `coordinates` which is a `Ref` to an object `{ x, y }` representing the raw client coordinates. This is mostly for informational purposes or if you need to react to the raw pointer data directly. The positioning of the floating element itself is handled via `useFloating` and its `floatingStyles`.

This setup allows the `floating-tooltip` to follow the mouse/touch pointer when it's over the `pointer-target-area`.

## API Reference

The `useClientPoint` composable positions a floating element relative to the client's pointer (mouse/touch) position. It works by updating the `anchorEl` of a `FloatingContext` to a virtual element representing the pointer's coordinates.

### Function Signature

```ts
import type { Ref } from "vue"
import type { FloatingContext } from "vfloat" // Or actual path
import type { MaybeRefOrGetter } from "vue" // Or from '@vueuse/core'

interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>
  axis?: MaybeRefOrGetter<"x" | "y" | "both">
  x?: MaybeRefOrGetter<number | null> // Controlled external x coordinate
  y?: MaybeRefOrGetter<number | null> // Controlled external y coordinate
}

interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
}

function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>, // The element to attach pointer listeners to
  context: FloatingContext, // The context from useFloating
  options?: UseClientPointOptions
): UseClientPointReturn
```

### Parameters

1.  **`pointerTarget: Ref<HTMLElement | null>`**

    - A Vue Ref to the DOM element that will serve as the target for pointer event listeners (e.g., `pointermove`, `pointerenter`). The floating element's position will be relative to pointer events within this element.

2.  **`context: FloatingContext`**

    - The `FloatingContext` object obtained from `useFloating`. `useClientPoint` will update `context.refs.anchorEl` with a virtual element representing the pointer's current position. `useFloating` will then use this virtual element to position the actual floating DOM element.

3.  **`options?: UseClientPointOptions`** (optional)
    - An optional configuration object.

### Options (`UseClientPointOptions`)

| Option    | Type                                     | Default  | Description                                                                                |
| --------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `enabled` | `MaybeRefOrGetter<boolean>`              | `true`   | Whether the client point tracking is enabled.                                              |
| `axis`    | `MaybeRefOrGetter<'x' \| 'y' \| 'both'>` | `'both'` | Specifies which axis/axes the virtual element should follow. `'x'`, `'y'`, or `'both'`.    |
| `x`       | `MaybeRefOrGetter<number \| null>`       | `null`   | A controlled x-coordinate. If provided, the internal pointer tracking for x is overridden. |
| `y`       | `MaybeRefOrGetter<number \| null>`       | `null`   | A controlled y-coordinate. If provided, the internal pointer tracking for y is overridden. |

(Note: `MaybeRefOrGetter<T>` implies the value can be `T`, `Ref<T>`, or `() => T`.)

### Return Value (`UseClientPointReturn`)

An object with the following properties:

- **`coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>`**:
  A readonly ref containing the current client (pointer) coordinates (`{ x, y }`) that `useClientPoint` is tracking or has been set to. This is useful for debugging or displaying the raw pointer position.

- **`updatePosition: (x: number, y: number) => void`**:
  A function to manually update the client point coordinates that `useClientPoint` uses to position the virtual element. This can be used to programmatically move the floating element as if the pointer moved.
