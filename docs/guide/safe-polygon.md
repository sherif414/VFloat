# Guide: Understanding the Safe Polygon

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
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Enable the safe polygon for a better user experience
const hover = useHover(floating.context, {
  safePolygon: true,
})

const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>
```

## Fine-Tuning the Behavior

For most cases, simply enabling `safePolygon` is enough. However, you can customize its behavior with a few options:

- **`buffer`**: This option adds extra padding to the safe area, making it more forgiving of imprecise mouse movements. A larger buffer makes it easier for the user to stay within the safe zone.

- **`requireIntent`**: This is a clever feature that can prevent the floating element from appearing when the user is just moving their mouse across the screen without intending to interact with the trigger element. It does this by checking the mouse speed; if the mouse is moving quickly, it assumes the user doesn't intend to interact and won't show the floating element.

Here's how you can use these options:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Customize the safe polygon
const hover = useHover(floating.context, {
  safePolygon: {
    buffer: 10, // Add a 10px buffer for a more forgiving safe area
    requireIntent: true, // Only show the floating element on intentional hover
  },
})
</script>
```

## Seeing it in Action

It can be helpful to visualize the safe polygon to understand how it works. The `onPolygonChange` callback provides the points of the polygon, which you can then use to draw it on the screen. This is a great way to debug your implementation and see the safe area in real-time.

Here is a complete example that shows how to visualize the safe polygon using an SVG overlay:

<demo src="../demos/safe-polygon/SafePolygonDemo.vue" />

By using the `safePolygon` feature, you can create more robust and user-friendly hover interactions in your applications. It's a simple way to solve a common usability problem and make your UI feel more polished and professional.
