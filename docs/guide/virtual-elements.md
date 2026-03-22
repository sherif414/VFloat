# Virtual Elements

Sometimes you need to position a floating element relative to an arbitrary coordinate rather than an actual DOM element. VFloat supports "virtual elements" for this purpose.

## The Basics

A virtual element is simply a plain JavaScript object that implements a `getBoundingClientRect()` method. This method should return the coordinates where you want the anchor to be.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating } from 'v-float'

const floatingEl = ref<HTMLElement | null>(null)

// Create a virtual element at fixed coordinates (100, 100)
const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 100,
      bottom: 100,
      width: 0,
      height: 0,
    }
  }
})

// Pass it to useFloating just like a normal DOM ref
const context = useFloating(virtualRef, floatingEl)
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles.value">
    Floating at fixed coordinates
  </div>
</template>
```

::: tip
Virtual elements are perfect for custom reference points, map markers, or positioning based on a specific text selection range.
:::

## Deep Dive

While you can manually create and update virtual elements, VFloat provides `useClientPoint` to automatically track pointer coordinates for tooltips and context menus.

### Pointer-following Tooltips

You can use `useClientPoint` to make a floating element follow the user's cursor. It updates the anchor's virtual element position dynamically based on mouse movement.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClientPoint, useHover } from 'v-float'

const trackingArea = ref<HTMLElement | null>(null)
const anchor = ref(null) // This will be managed by useClientPoint
const floating = ref<HTMLElement | null>(null)

const context = useFloating(anchor, floating, {
  placement: 'right-start'
})

// Follow the pointer within the tracking area
useClientPoint(trackingArea, context, {
  trackingMode: 'follow'
})

// Control visibility on hover
useHover(context)
</script>

<template>
  <div ref="trackingArea" style="width: 300px; height: 300px; background: #eee;">
    Move your mouse over me
    
    <div
      v-if="context.open.value"
      ref="floating"
      :style="context.floatingStyles.value"
    >
      I follow the cursor!
    </div>
  </div>
</template>
```

### Static Context Menus

For a context menu, you want the floating element to appear at the exact coordinates of the right-click and stay there, rather than continuously following the cursor. Use `trackingMode: 'static'` for this.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClientPoint, useClick } from 'v-float'

const area = ref<HTMLElement | null>(null)
const anchor = ref(null)
const floating = ref<HTMLElement | null>(null)

const context = useFloating(anchor, floating, {
  placement: 'bottom-start'
})

// Position exactly at the click point
useClientPoint(area, context, {
  trackingMode: 'static'
})

useClick(context, { closeOnOutsideClick: true })
</script>

<template>
  <div ref="area" @contextmenu.prevent="context.setOpen(true, 'contextmenu')">
    Right-click here
    
    <div
      v-if="context.open.value"
      ref="floating"
      :style="context.floatingStyles.value"
    >
      Context Menu
    </div>
  </div>
</template>
```

::: warning
`useClientPoint` manages *where* the element appears by updating the anchor's coordinates. You still need interaction composables (like `useHover` or `useClick`) or manual `setOpen` calls to manage *when* the element appears.
:::

## Further Reading

- [`useClientPoint` API](/api/use-client-point)
- [`useFloating` API](/api/use-floating)
