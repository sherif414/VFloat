---
description: The core composable for positioning floating elements using Floating UI
---

# useFloating

The `useFloating` composable is the foundation of V-Float, providing precise positioning logic for floating elements like tooltips, popovers, dropdowns, and modals. It wraps Floating UI's `computePosition` function with Vue 3's reactivity system to create a seamless positioning solution.

## Overview

`useFloating` handles the complex calculations needed to position a floating element relative to an anchor element. It automatically updates positions when elements move, resize, or when configuration changes, ensuring your floating elements stay perfectly aligned.

### Key Features

- **Reactive positioning** - Automatically updates when anchor or floating elements change
- **Flexible placement** - Supports 12 different placement options
- **Middleware support** - Extensible with offset, flip, shift, and custom middleware
- **Performance optimized** - Uses CSS transforms by default for better performance
- **Auto-update** - Automatically repositions on scroll, resize, and DOM changes
- **TypeScript support** - Fully typed for better developer experience

## API Reference

### Parameters

```typescript
useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options?: UseFloatingOptions
): FloatingContext
```

#### `anchorEl`
- **Type**: `Ref<AnchorElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the reference element that the floating element will be positioned relative to. Can be an HTMLElement, VirtualElement, or null.

#### `floatingEl`
- **Type**: `Ref<FloatingElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the floating element to be positioned. Can be an HTMLElement or null.

#### `options`
- **Type**: `UseFloatingOptions`
- **Required**: No
- **Description**: Configuration options for positioning behavior.

### Options Interface

```typescript
interface UseFloatingOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  transform?: MaybeRefOrGetter<boolean | undefined>
  middlewares?: Middleware[]
  whileElementsMounted?: (
    anchorEl: NonNullable<AnchorElement>,
    floatingEl: NonNullable<FloatingElement>,
    update: () => void
  ) => undefined | (() => void)
  open?: Ref<boolean>
  onOpenChange?: (open: boolean) => void
  nodeId?: string
  rootContext?: Partial<FloatingContext>
}
```

#### Option Details

**`placement`**
- **Type**: `MaybeRefOrGetter<Placement | undefined>`
- **Default**: `'bottom'`
- **Description**: Where to place the floating element relative to the anchor element.
- **Values**: `'top'`, `'top-start'`, `'top-end'`, `'right'`, `'right-start'`, `'right-end'`, `'bottom'`, `'bottom-start'`, `'bottom-end'`, `'left'`, `'left-start'`, `'left-end'`

**`strategy`**
- **Type**: `MaybeRefOrGetter<Strategy | undefined>`
- **Default**: `'absolute'`
- **Description**: The CSS positioning strategy to use.
- **Values**: `'absolute'`, `'fixed'`

**`transform`**
- **Type**: `MaybeRefOrGetter<boolean | undefined>`
- **Default**: `true`
- **Description**: Whether to use CSS transform for positioning instead of top/left properties. Transform is generally more performant.

**`middlewares`**
- **Type**: `Middleware[]`
- **Default**: `[]`
- **Description**: Array of middleware functions that modify positioning behavior. Common middleware include `offset`, `flip`, `shift`, and `arrow`.

**`whileElementsMounted`**
- **Type**: Function
- **Description**: Custom function called when both elements are mounted. Should return a cleanup function. If not provided, uses Floating UI's `autoUpdate`.

**`open`**
- **Type**: `Ref<boolean>`
- **Default**: `ref(false)`
- **Description**: Reactive boolean controlling whether the floating element is open/visible.

**`onOpenChange`**
- **Type**: `(open: boolean) => void`
- **Description**: Callback function called when the open state changes.

### Return Value

The composable returns a `FloatingContext` object with the following properties:

```typescript
interface FloatingContext {
  x: Readonly<Ref<number>>
  y: Readonly<Ref<number>>
  strategy: Ref<Strategy>
  placement: Ref<Placement>
  middlewareData: Ref<MiddlewareData>
  isPositioned: Ref<boolean>
  floatingStyles: ComputedRef<FloatingStyles>
  update: () => Promise<void>
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
  }
  open: Ref<boolean>
  onOpenChange: (open: boolean) => void
}
```

#### Return Properties

**`x`** / **`y`**
- **Type**: `Readonly<Ref<number>>`
- **Description**: The computed x and y coordinates for positioning the floating element.

**`strategy`**
- **Type**: `Ref<Strategy>`
- **Description**: The current positioning strategy being used.

**`placement`**
- **Type**: `Ref<Placement>`
- **Description**: The actual placement being used (may differ from requested placement due to middleware).

**`middlewareData`**
- **Type**: `Ref<MiddlewareData>`
- **Description**: Data returned by middleware functions, useful for additional positioning logic.

**`isPositioned`**
- **Type**: `Ref<boolean>`
- **Description**: Whether the floating element has been positioned.

**`floatingStyles`**
- **Type**: `ComputedRef<FloatingStyles>`
- **Description**: Computed CSS styles object ready to apply to the floating element.

**`update`**
- **Type**: `() => Promise<void>`
- **Description**: Function to manually trigger position recalculation.

**`refs`**
- **Type**: Object with `anchorEl` and `floatingEl` refs
- **Description**: References to the anchor and floating elements.

**`open`** / **`onOpenChange`**
- **Type**: `Ref<boolean>` / Function
- **Description**: State and handler for controlling floating element visibility.

## Usage Examples

### Basic Usage

Simple tooltip positioning:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating } from '@/composables/use-floating'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()

const { floatingStyles, isPositioned } = useFloating(anchorEl, floatingEl, {
  placement: 'top'
})
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div 
    ref="floatingEl" 
    :style="floatingStyles"
    v-show="isPositioned"
    class="tooltip"
  >
    Tooltip content
  </div>
</template>
```

### With Middleware

Using middleware for enhanced positioning:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { offset, flip, shift } from '@floating-ui/dom'
import { useFloating } from '@/composables/use-floating'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const isOpen = ref(false)

const { floatingStyles, placement } = useFloating(anchorEl, floatingEl, {
  placement: 'bottom',
  open: isOpen,
  middlewares: [
    offset(10), // Add 10px distance
    flip(), // Flip when no space
    shift({ padding: 8 }) // Shift to stay in viewport
  ]
})
</script>

<template>
  <button 
    ref="anchorEl" 
    @click="isOpen = !isOpen"
  >
    Toggle Popover
  </button>
  
  <div 
    ref="floatingEl" 
    :style="floatingStyles"
    v-show="isOpen"
    class="popover"
    :data-placement="placement"
  >
    <p>Popover content with smart positioning</p>
    <p>Current placement: {{ placement }}</p>
  </div>
</template>
```

### Advanced Usage with Custom Auto-Update

Custom positioning update logic:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating } from '@/composables/use-floating'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const isOpen = ref(false)

// Custom auto-update function
const customWhileElementsMounted = (
  anchor: HTMLElement,
  floating: HTMLElement,
  update: () => void
) => {
  // Custom logic for when to update positioning
  const handleUpdate = () => {
    // Add custom conditions or throttling
    update()
  }
  
  // Listen to custom events
  window.addEventListener('resize', handleUpdate)
  anchor.addEventListener('scroll', handleUpdate)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleUpdate)
    anchor.removeEventListener('scroll', handleUpdate)
  }
}

const { floatingStyles, middlewareData, update } = useFloating(
  anchorEl, 
  floatingEl, 
  {
    placement: 'right',
    open: isOpen,
    whileElementsMounted: customWhileElementsMounted,
    onOpenChange: (open) => {
      console.log('Floating element is now:', open ? 'open' : 'closed')
    }
  }
)

// Manual update trigger
const handleManualUpdate = async () => {
  await update()
  console.log('Position updated manually')
}
</script>

<template>
  <div class="container">
    <button ref="anchorEl" @click="isOpen = !isOpen">
      Toggle with Custom Logic
    </button>
    
    <button @click="handleManualUpdate">
      Manual Update
    </button>
    
    <div 
      ref="floatingEl" 
      :style="floatingStyles"
      v-show="isOpen"
      class="floating-panel"
    >
      <h3>Advanced Floating Panel</h3>
      <p>This panel uses custom auto-update logic.</p>
      <pre>{{ JSON.stringify(middlewareData, null, 2) }}</pre>
    </div>
  </div>
</template>
```

### Reactive Placement

Dynamic placement based on user interaction:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFloating } from '@/composables/use-floating'
import type { Placement } from '@floating-ui/dom'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const selectedPlacement = ref<Placement>('bottom')
const isOpen = ref(true)

const { floatingStyles, placement } = useFloating(anchorEl, floatingEl, {
  placement: computed(() => selectedPlacement.value),
  open: isOpen
})

const placements: Placement[] = [
  'top', 'top-start', 'top-end',
  'right', 'right-start', 'right-end', 
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end'
]
</script>

<template>
  <div class="demo">
    <div class="controls">
      <label>Choose placement:</label>
      <select v-model="selectedPlacement">
        <option v-for="p in placements" :key="p" :value="p">
          {{ p }}
        </option>
      </select>
      
      <label>
        <input type="checkbox" v-model="isOpen" />
        Show floating element
      </label>
    </div>
    
    <div class="demo-area">
      <button ref="anchorEl" class="anchor">
        Anchor Element
      </button>
      
      <div 
        ref="floatingEl" 
        :style="floatingStyles"
        v-show="isOpen"
        class="floating"
      >
        <strong>Requested:</strong> {{ selectedPlacement }}<br>
        <strong>Actual:</strong> {{ placement }}
      </div>
    </div>
  </div>
</template>
```

## Integration with Other Composables

`useFloating` works seamlessly with other V-Float composables:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { 
  useFloating, 
  useHover, 
  useFocus, 
  useInteractions 
} from '@/composables'
import { offset, flip, shift } from '@floating-ui/dom'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const isOpen = ref(false)

// Core positioning
const floating = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  open: isOpen,
  onOpenChange: (open) => { isOpen.value = open },
  middlewares: [offset(8), flip(), shift()]
})

// Interaction behaviors
const hover = useHover(floating, { delay: { open: 100, close: 200 } })
const focus = useFocus(floating)

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus
])
</script>

<template>
  <button 
    ref="anchorEl" 
    v-bind="getReferenceProps()"
  >
    Hover or focus me
  </button>
  
  <div 
    ref="floatingEl" 
    :style="floating.floatingStyles.value"
    v-show="isOpen"
    v-bind="getFloatingProps()"
    class="tooltip"
  >
    Interactive tooltip with hover and focus
  </div>
</template>
```

## Best Practices

### Performance Optimization

1. **Use CSS transforms**: Keep `transform: true` (default) for better performance
2. **Minimize middleware**: Only use necessary middleware to reduce computation
3. **Custom auto-update**: Implement custom `whileElementsMounted` for specific use cases

### Accessibility

1. **Proper ARIA attributes**: Use with `useRole` for semantic markup
2. **Focus management**: Combine with `useFocus` for keyboard navigation
3. **Screen reader support**: Ensure floating content is properly announced

### Common Patterns

```typescript
// Tooltip pattern
const tooltip = useFloating(anchor, floating, {
  placement: 'top',
  middlewares: [offset(8), flip(), shift({ padding: 8 })]
})

// Dropdown pattern  
const dropdown = useFloating(trigger, menu, {
  placement: 'bottom-start',
  middlewares: [offset(4), flip(), shift()]
})

// Modal pattern
const modal = useFloating(trigger, dialog, {
  strategy: 'fixed',
  placement: 'bottom'
})
```

## Troubleshooting

### Common Issues

**Floating element not positioning correctly**
- Ensure both `anchorEl` and `floatingEl` refs are properly assigned
- Check that elements are mounted before positioning
- Verify CSS positioning context (relative/absolute parents)

**Position not updating automatically**
- Confirm `open` state is properly managed
- Check if custom `whileElementsMounted` returns cleanup function
- Ensure elements remain in DOM during positioning

**Performance issues**
- Use `transform: true` for better performance
- Implement custom auto-update logic if default is too aggressive
- Consider throttling position updates for complex scenarios

## Related Composables

- [`useHover`](/composables/use-hover) - Add hover interactions
- [`useFocus`](/composables/use-focus) - Add focus interactions  
- [`useClick`](/composables/use-click) - Add click interactions
- [`useInteractions`](/composables/use-interactions) - Combine multiple interactions
- [`useRole`](/composables/use-role) - Add ARIA roles and attributes
- [`FloatingPortal`](/composables/floating-portal) - Render floating elements in portals
- [`FloatingArrow`](/composables/floating-arrow) - Add arrows to floating elements

## TypeScript Support

`useFloating` is fully typed with TypeScript. All interfaces and types are exported for use in your applications:

```typescript
import type { 
  UseFloatingOptions,
  FloatingContext,
  FloatingStyles,
  AnchorElement,
  FloatingElement
} from '@/composables/use-floating'
```