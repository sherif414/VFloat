# useClientPoint

The `useClientPoint` composable configures a floating element (managed by `useFloating`) to position itself relative to the client's pointer (e.g., mouse cursor or touch point). It achieves this by dynamically updating the `anchorEl` within the `FloatingContext` to a virtual element that represents the pointer's current coordinates.

## Tracking Modes

The composable supports two distinct tracking behaviors to accommodate different UI patterns:

- **`"follow"`** (default): Continuous cursor tracking - the floating element follows mouse movement while open
- **`"static"`**: Positions at initial interaction location, ignores subsequent movements - ideal for context menus

Additionally, when external coordinates are provided via the `x` and `y` options, mouse tracking is automatically disabled, allowing for fully controlled positioning.

This flexibility allows you to create cursor-following tooltips, static-positioned context menus, and programmatically controlled elements with the same composable.

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

## Tracking Mode Examples

### Follow Mode (Default)

The default behavior where the floating element continuously follows the cursor. Perfect for tooltips that need to track mouse movement:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint } from "vfloat"

const reference = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const context = useFloating(reference, floating, {
  placement: "bottom",
  open: isOpen,
})

// Default follow mode - tooltip follows cursor
const { coordinates } = useClientPoint(reference, context, {
  enabled: isOpen,
  trackingMode: "follow", // Optional - this is the default
})
</script>

<template>
  <div ref="reference" @mouseenter="isOpen = true" @mouseleave="isOpen = false">
    Hover for following tooltip
  </div>

  <div v-if="isOpen" ref="floating" :style="context.floatingStyles.value">
    Tooltip following cursor at ({{ coordinates.x }}, {{ coordinates.y }})
  </div>
</template>
```

### Static Mode

Positions the floating element at the initial interaction point without subsequent tracking. Ideal for context menus:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint, useClick } from "vfloat"
import { flip, shift } from "@floating-ui/dom"

const contextReference = ref<HTMLElement | null>(null)
const contextFloating = ref<HTMLElement | null>(null)

const contextMenu = useFloating(contextReference, contextFloating, {
  placement: "bottom-start",
  middlewares: [flip(), shift({ padding: 8 })],
})

// Static mode - appears at right-click position and stays there
useClientPoint(contextReference, contextMenu, {
  trackingMode: "static",
})

// Handle outside clicks to close menu
useClick(contextMenu, { outsideClick: true })

function showContextMenu(event: MouseEvent) {
  event.preventDefault()
  contextReference.value = event.target as HTMLElement
  contextMenu.setOpen(true)
}

function executeAction(action: string) {
  console.log(`Action: ${action}`)
  contextMenu.setOpen(false)
}
</script>

<template>
  <div class="demo-area" @contextmenu="showContextMenu">
    Right-click anywhere for context menu

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.open.value"
        ref="contextFloating"
        :style="contextMenu.floatingStyles.value"
        class="context-menu"
      >
        <button @click="executeAction('copy')">📋 Copy</button>
        <button @click="executeAction('paste')">📄 Paste</button>
        <button @click="executeAction('delete')">🗑️ Delete</button>
      </div>
    </Teleport>
  </div>
</template>
```

### Initial-Only Mode

Uses externally provided coordinates and ignores all pointer events. Useful for programmatic positioning:

```vue
<script setup lang="ts">
import { ref, computed } from "vue"
import { useFloating, useClientPoint } from "vfloat"

const floating = ref<HTMLElement | null>(null)
const isOpen = ref(false)

// Programmatically controlled coordinates
const targetX = ref(200)
const targetY = ref(100)

const context = useFloating(ref(null), floating, {
  open: isOpen,
})

// External coordinates automatically disable mouse tracking
useClientPoint(ref(null), context, {
  x: targetX,
  y: targetY,
})

function moveToRandomPosition() {
  targetX.value = Math.random() * window.innerWidth
  targetY.value = Math.random() * window.innerHeight
}
</script>

<template>
  <div>
    <button @click="isOpen = !isOpen">{{ isOpen ? "Hide" : "Show" }} Floating Element</button>
    <button @click="moveToRandomPosition">Move to Random Position</button>

    <div v-if="isOpen" ref="floating" :style="context.floatingStyles.value">
      Fixed at ({{ targetX }}, {{ targetY }})
    </div>
  </div>
</template>
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
type TrackingMode = "follow" | "static"

interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>
  axis?: MaybeRefOrGetter<'x' | 'y' | 'both'>
  x?: MaybeRefOrGetter<number | null> // External x coordinate (disables mouse tracking)
  y?: MaybeRefOrGetter<number | null> // External y coordinate (disables mouse tracking)
  trackingMode?: TrackingMode // Tracking behavior mode: "follow" for continuous cursor tracking, "static" for initial position only
}

interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
{{ ... }}
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

| Option         | Type                                     | Default    | Description                                                                                                   |
| -------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `enabled`      | `MaybeRefOrGetter<boolean>`              | `true`     | Whether the client point tracking is enabled.                                                                 |
| `axis`         | `MaybeRefOrGetter<'x' \| 'y' \| 'both'>` | `'both'`   | Specifies which axis/axes the virtual element should follow. `'x'`, `'y'`, or `'both'`.                       |
| `trackingMode` | `TrackingMode`                          | `'follow'` | Tracking behavior: `'follow'` for continuous cursor tracking, `'static'` for initial position only.           |
| `x`            | `MaybeRefOrGetter<number \| null>`       | `null`     | External x-coordinate. When provided, mouse tracking is automatically disabled for full programmatic control. |
| `y`            | `MaybeRefOrGetter<number \| null>`       | `null`     | External y-coordinate. When provided, mouse tracking is automatically disabled for full programmatic control. |

#### Tracking Mode Behaviors

**`"follow"` (Default)**

- Continuously updates position based on pointer movement
- Attaches `pointermove` event listeners while floating element is open
- Ideal for tooltips that need to track cursor movement
- Provides smooth, responsive cursor-following behavior

**`"static"`**

- Positions at the initial interaction point (first `pointerenter` or `pointerdown`)
- Ignores subsequent pointer movements while floating element remains open
- Perfect for context menus that should appear at right-click location
- Resets position tracking when floating element closes, allowing new positioning

**External Coordinate Mode**

- When `x` and/or `y` options are provided, mouse tracking is automatically disabled
- Uses only the externally provided coordinates
- Perfect for programmatically controlled positioning
- Coordinates remain fixed until manually updated via the options

(Note: `MaybeRefOrGetter<T>` implies the value can be `T`, `Ref<T>`, or `() => T`.)

### Return Value (`UseClientPointReturn`)

An object with the following properties:

- **`coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>`**:
  A readonly ref containing the current client (pointer) coordinates (`{ x, y }`) that `useClientPoint` is tracking or has been set to. This is useful for debugging or displaying the raw pointer position.

- **`updatePosition: (x: number, y: number) => void`**:
  A function to manually update the client point coordinates that `useClientPoint` uses to position the virtual element. This can be used to programmatically move the floating element as if the pointer moved.

## Best Practices

### Choosing the Right Tracking Mode

**Use `"follow"` mode when:**

- Building tooltips that should track mouse movement
- Creating cursor-following UI elements
- Implementing draggable elements with visual feedback
- Building interactive overlays that respond to cursor position

**Use `"static"` mode when:**

- Implementing context menus (right-click menus)
- Creating dropdown menus triggered by click
- Building modal dialogs that appear at interaction point
- Implementing hover cards that should stay at initial hover position

**Use external coordinates when:**

- Positioning elements programmatically without user interaction
- Creating animations that move elements to specific coordinates
- Implementing drag-and-drop with predetermined drop zones
- Building tutorial overlays with fixed positioning

### Performance Considerations

```typescript
// ✅ Good: Only enable tracking when needed
const { coordinates } = useClientPoint(reference, context, {
  enabled: computed(() => context.open.value),
  trackingMode: "follow",
})

// ❌ Avoid: Always-on tracking can impact performance
const { coordinates } = useClientPoint(reference, context, {
  enabled: true, // Always tracking, even when not needed
  trackingMode: "follow",
})
```

### Accessibility Guidelines

- **Provide keyboard alternatives**: Don't rely solely on mouse interactions
- **Support touch devices**: Consider touch-friendly interaction patterns
- **Maintain focus management**: Ensure proper focus handling with floating elements
- **Add ARIA labels**: Include appropriate accessibility attributes

```typescript
// Example: Accessible context menu implementation
function onKeyDown(event: KeyboardEvent) {
  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
    // Trigger context menu via keyboard
    const rect = reference.value?.getBoundingClientRect()
    if (rect) {
      // Position at element center for keyboard activation
      updatePosition(rect.x + rect.width / 2, rect.y + rect.height / 2)
      context.setOpen(true)
    }
  }
}
```

### Integration with Other Composables

```typescript
// Combining with useClick for comprehensive interaction handling
const context = useFloating(reference, floating, {
  placement: "bottom-start",
  middlewares: [flip(), shift()],
})

// Static positioning for context menu
useClientPoint(reference, context, {
  trackingMode: "static",
})

// Handle clicks and outside clicks
useClick(context, {
  outsideClick: true,
  toggle: false,
})

// Handle escape key
useEscapeKey({
  enabled: context.open,
  onEscape: () => context.setOpen(false),
})
```

### Mobile and Touch Considerations

- **Static mode** is often better for mobile interfaces as continuous tracking can be jarring
- Consider using **larger touch targets** when implementing context menus on mobile
- Test pointer event behavior across different devices and browsers

```typescript
// Mobile-friendly context menu
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)

useClientPoint(reference, context, {
  trackingMode: isMobile ? "static" : "follow",
})
```

## Migration Guide

Existing implementations will continue to work without changes, as the default behavior remains `trackingMode: "follow"`.

### Upgrading Existing Tooltip Implementation

```typescript
// Before (still works)
const { coordinates } = useClientPoint(reference, context, {
  enabled: isOpen,
  axis: "both",
})

// After (explicit, but same behavior)
const { coordinates } = useClientPoint(reference, context, {
  enabled: isOpen,
  axis: "both",
  trackingMode: "follow", // Explicitly specify for clarity
})
```

### Converting to Context Menu

```typescript
// Before: Tooltip that follows cursor
const tooltip = useClientPoint(reference, context, {
  enabled: isOpen,
})

// After: Context menu that stays at click position
const contextMenu = useClientPoint(reference, context, {
  trackingMode: "static",
})
```

### Converting to Programmatic Positioning

```typescript
// Before: Mouse-driven positioning
const mouseTracking = useClientPoint(reference, context, {
  enabled: isOpen,
})

// After: Programmatic positioning (mouse tracking auto-disabled)
const programmatic = useClientPoint(ref(null), context, {
  x: targetX,
  y: targetY,
})
```

## Interactive Examples

Explore the different tracking modes in action with our interactive demonstration:

### Live Demo

The enhanced **ClientPoint Demo** showcases different tracking modes with real-time controls:

- **Tracking Mode Selection**: Switch between `follow` and `static` modes
- **Axis Constraints**: Test X-axis, Y-axis, or both-axis positioning
- **Visualization Types**: Different ways to visualize cursor tracking
- **Context Menu Demo**: Right-click anywhere to see static positioning in action
- **External Coordinate Control**: Use programmatic positioning with external coordinates

**Try it yourself**: Run `pnpm dev` and navigate to the ClientPoint demo in the playground.

### Key Demo Features

1. **Real-time Mode Switching**: See how different tracking modes behave with live controls
2. **Visual Feedback**: Multiple visualization options help understand coordinate tracking
3. **Context Menu Pattern**: Experience static positioning with an actual context menu
4. **Performance Metrics**: Observe coordinate updates and positioning behavior

### Code Examples from Demo

The demo implementation provides practical examples for each use case:

```typescript
// Follow mode tooltip
const { coordinates } = useClientPoint(reference, context, {
  axis: "both",
  trackingMode: "follow",
})

// Static context menu
const contextMenu = useClientPoint(contextReference, contextMenuContext, {
  trackingMode: "static",
})

// Programmatic positioning (external coordinates)
const controlled = useClientPoint(ref(null), context, {
  x: targetX,
  y: targetY,
})
```

These examples demonstrate real-world usage patterns and can serve as starting points for your own implementations.
