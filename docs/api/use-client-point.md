# useClientPoint

The `useClientPoint` composable helps position floating elements relative to the user's pointer (mouse cursor or touch point). It works by updating the anchor reference in your floating context with a virtual element that represents the pointer's current position.

## Core Concept

Instead of anchoring a floating element to a DOM element, `useClientPoint` creates a "virtual anchor" at the pointer's coordinates. That virtual element becomes the anchor for `useFloating` positioning system, enabling tooltips that follow the cursor, context menus that appear at click locations, or programmatically positioned overlays.

The composable continuously syncs the virtual anchor with `context.refs.anchorEl`. Whenever the pointer moves—or you provide external coordinates—the anchor updates automatically and `useFloating` recalculates the floating element's position.

### Virtual Anchor System

The virtual anchor is a synthetic DOM element that exists only in memory but behaves like a real DOM element for positioning purposes. This approach provides several advantages:

- **Dynamic Positioning**: The anchor's position updates in real-time based on pointer movement or programmatic changes
- **Seamless Integration**: Works transparently with the existing `useFloating` positioning system
- **Performance Optimized**: Avoids DOM manipulation overhead by using a lightweight virtual element
- **Flexible Control**: Supports both reactive pointer tracking and manual coordinate control

### Integration with useFloating

`useClientPoint` is designed to work seamlessly with the `useFloating` composable:

```typescript
// 1. Create floating context
const context = useFloating(anchor, floatingElement)

// 2. Add pointer tracking
useClientPoint(pointerTarget, context)

// 3. Add interactions (optional)
useHover(context) // or useClick, useFocus, etc.
```

The composable updates `context.refs.anchorEl` with the virtual element, which `useFloating` uses to calculate positioning. This creates a clean separation of concerns where `useFloating` handles positioning logic and `useClientPoint` manages the anchor's position.

### Positioning Behaviors

The composable supports three distinct positioning modes to handle different interaction patterns:

- **Follow Mode**: Continuously tracks pointer movement (ideal for tooltips)
- **Static Mode**: Positions at initial interaction point (perfect for context menus)
- **Controlled Mode**: Manual positioning via coordinates (great for animations and programmatic control)

### Performance Characteristics

`useClientPoint` is optimized for smooth performance:

- **Event Delegation**: Uses efficient event listeners with proper cleanup
- **Reactive Updates**: Only recalculates when necessary using Vue's reactivity system
- **Conditional Tracking**: Can be enabled/disabled to avoid unnecessary computations
- **Memory Efficient**: Virtual elements don't create DOM nodes

### Common Use Cases

1. **Cursor-following tooltips** - Elements that track mouse movement
2. **Context menus** - Positioned at click/tap locations
3. **Interactive tutorials** - Highlighting different parts of the interface
4. **Drag previews** - Elements that follow the cursor during drag operations
5. **Custom cursors** - Replacing the default cursor with custom elements
6. **Annotation systems** - Positioning notes and comments at specific coordinates

## Quick Start

Here's a minimal example of a tooltip that follows the cursor:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint, useHover } from "v-float"

const anchor = ref(null)
const tooltip = ref<HTMLElement | null>(null)
const tackingArea = ref<HTMLElement | null>(null)

// Set up floating positioning
const context = useFloating(anchor, tooltip)

// set up hover interaction
useHover(context)

// Enable cursor tracking
useClientPoint(tackingArea, context)
</script>

<template>
  <div 
    ref="tackingArea"
    class="hover-area"
  >
    Hover to see tooltip
  </div>

  <div 
    v-if="context.open.value" 
    ref="tooltip" 
    :style="context.floatingStyles.value"
    class="tooltip"
  >
    Cursor: following
  </div>
</template>
```

## Tracking Modes

The composable supports three distinct positioning behaviors:

### Follow Mode (Default)

Continuously tracks cursor movement while the floating element is open. Perfect for tooltips that need to stay near the cursor:

```vue
<script setup lang="ts">
const { coordinates } = useClientPoint(trackingArea, context, {
  trackingMode: "follow", // Default behavior
})
</script>
```

### Static Mode

Positions the element at the initial interaction point and ignores subsequent movement. Ideal for context menus triggered by right-click:

```vue
<script setup lang="ts">
useClientPoint(trackingArea, context, {
  trackingMode: "static", // Stays at click position
})

function showContextMenu(event: MouseEvent) {
  event.preventDefault()
  isOpen.value = true
}
</script>

<template>
  <div @contextmenu="showContextMenu">
    Right-click for menu
  </div>
</template>
```

### Controlled Mode

When you need full programmatic control over the floating element's position, you can activate "controlled mode" by providing both `x` and `y` coordinates in the options. This completely disables pointer tracking and gives you manual control over positioning.

#### How It Works

1. **Automatic Activation**: When both `x` and `y` options are provided (not `null`), the composable automatically switches to controlled mode
2. **Pointer Tracking Disabled**: All pointer event listeners are disabled, and the element won't respond to mouse/touch movement
3. **Manual Updates Only**: Position changes must be made by updating the `x`/`y` reactive values
4. **Virtual Element**: The composable creates a virtual anchor element at the specified coordinates that `useFloating` uses for positioning

#### Requirements

**Both `x` and `y` must be provided** - if either coordinate is `null` or missing, the composable falls back to pointer tracking mode.

**Note**: The `pointerTarget` parameter is still required even in controlled mode, as other composables in the floating system (like `useHover`) need a DOM element to attach listeners to. The tracking area is provided as `context.refs.anchorEl.value.contextElement` for other composables to reference.

#### Basic Example

```vue
<script setup lang="ts">
import { ref } from "vue"

const targetX = ref(200)
const targetY = ref(100)
const pointerTarget = ref<HTMLElement | null>(null) // Required for useHover and other composables to attach listeners to virtualElement.contextElement

useClientPoint(pointerTarget, context, {
  x: targetX,  // Both coordinates required
  y: targetY,  // for controlled mode
})

// Update position programmatically
const moveTo = (x: number, y: number) => {
  targetX.value = x
  targetY.value = y
}
</script>
```

#### Dynamic Positioning

```vue
<script setup lang="ts">
const position = ref({ x: 100, y: 100 })
const pointerTarget = ref<HTMLElement | null>(null)

// Move element based on some logic
const moveRandomly = () => {
  position.value = {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
  }
}

useClientPoint(pointerTarget, context, {
  x: computed(() => position.value.x),
  y: computed(() => position.value.y),
})
</script>
```

## API Reference

```typescript
function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: UseClientPointContext,
  options?: UseClientPointOptions
): UseClientPointReturn
```

### Parameters

**`pointerTarget`**: Defines the area where pointer events (mouse/touch) are tracked. Pass a ref to a specific element to limit tracking to that element's boundaries, or use `document` to enable tracking across the entire website. Use `ref(null)` to disable pointer tracking and rely entirely on external coordinate control.

**`context`**: Floating context from `useFloating` containing:
- `open`: Reactive open state
- `refs.anchorEl`: Anchor reference (updated by the composable)

**`options`**: Configuration object

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable the composable |
| `axis` | `MaybeRefOrGetter<'x' \| 'y' \| 'both'>` | `'both'` | Axis constraint |
| `trackingMode` | `'follow' \| 'static'` | `'follow'` | Tracking behavior |
| `x` | `MaybeRefOrGetter<number \| null>` | `null` | External X coordinate |
| `y` | `MaybeRefOrGetter<number \| null>` | `null` | External Y coordinate |

### Return Value

```typescript
interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
}
```

**`coordinates`**: Readonly reactive coordinates for debugging or display

**`updatePosition`**: Function to manually update the floating element's position. In controlled mode, this updates the coordinates immediately. In pointer tracking modes, this method is ignored as the position is determined by pointer events.