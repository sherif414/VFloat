# Guide: Understanding the Safe Polygon

A concise 1–2 sentence summary describing WHAT the reader will build/learn.

- **Audience:** Beginner
- **Prerequisites:** Vue 3.2+, basic Composition API
- **Estimated time:** 5–10 minutes
- **Works with:** V-Float v0.x

## Learning Outcomes

- Understand what a “safe polygon” is and why it prevents premature closes
- Enable `safePolygon` with `useHover()`
- Tune `safePolygon` behavior with `buffer` and `blockPointerEvents`

## TL;DR (Quick Start)

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const isOpen = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
})

useHover(context, { safePolygon: true })
</script>
```

Have you ever been frustrated when a dropdown menu or tooltip disappears just as you're about to click on something inside it? This common usability problem often happens when your mouse cursor has to travel from a trigger element (like a button) to the floating element (the menu or tooltip). If your cursor doesn't move in a perfectly straight line, it can accidentally leave the area of both elements, causing the floating element to close.

This is where the `safePolygon` feature comes in. It creates an invisible "safe area" that connects the trigger element and the floating element. As long as your mouse stays within this area, the floating element will remain open, even if your cursor temporarily leaves the bounds of both elements.

## How it Works

When you enable `safePolygon`, it dynamically generates a polygon (usually a triangle or a rectangle) that covers the space between the reference and floating elements. This polygon acts as a bridge, allowing the user to move their mouse freely between the two elements without the floating element closing prematurely.

This is especially useful for:

- **Dropdown Menus:** Users can move their mouse from the menu button to the dropdown list without it disappearing.
- **Interactive Tooltips:** If a tooltip contains links or buttons, the user can move their mouse to the tooltip to interact with it.

## Enabling the Safe Polygon

To use this feature, you simply need to set the `safePolygon` option to `true` within the `useHover` interaction:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const isOpen = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
})

// Enable the safe polygon for a better user experience
useHover(context, { safePolygon: true })
</script>
```

## Fine-Tuning the Behavior

For most cases, simply enabling `safePolygon` is enough. However, you can customize its behavior with a few options:

- **`buffer`**: Adds extra padding to the safe area, making it more forgiving of imprecise mouse movements.
- **`blockPointerEvents`**: Prevents pointer events from being captured by elements between the anchor and floating while traversing the safe area.

Here's how you can use these options:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const isOpen = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
})

// Customize the safe polygon
useHover(context, {
  safePolygon: {
    buffer: 10, // Add a 10px buffer for a more forgiving safe area
    blockPointerEvents: true, // Prevent intermediate elements from interfering while traversing
  },
})
</script>
```

## Seeing it in Action

Here is a complete example that shows how to visualize the safe polygon using an SVG overlay:

<demo src="../demos/safe-polygon/SafePolygonDemo.vue" />

By using the `safePolygon` feature, you can create more robust and user-friendly hover interactions in your applications. It's a simple way to solve a common usability problem and make your UI feel more polished and professional.

## See Also

- [useHover](/api/use-hover)
- [useFloating](/api/use-floating)
