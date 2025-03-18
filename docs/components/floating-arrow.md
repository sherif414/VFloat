# FloatingArrow

The `FloatingArrow` component creates a customizable arrow that points from the floating element to its reference element. This is commonly used in tooltips, popovers, and dropdown menus to provide a visual connection between the two elements.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, arrow, FloatingArrow } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const arrowRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [arrow({ element: arrowRef })],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});
</script>

<template>
  <button ref="referenceRef">Reference Element</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    :style="{
      position: floating.strategy,
      top: '0px',
      left: '0px',
      transform: `translate(${floating.x}px, ${floating.y}px)`,
    }"
  >
    Floating content
    <FloatingArrow
      ref="arrowRef"
      :context="floating.context"
      :fill="'white'"
      :stroke="'#ccc'"
      :stroke-width="1"
    />
  </div>
</template>
```

## Props

<script setup>
import { ref } from 'vue'
</script>

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>context</td>
      <td>Object</td>
      <td><code>required</code></td>
      <td>The context object from <code>useFloating()</code></td>
    </tr>
    <tr>
      <td>width</td>
      <td>Number</td>
      <td>14</td>
      <td>Width of the arrow in pixels</td>
    </tr>
    <tr>
      <td>height</td>
      <td>Number</td>
      <td>7</td>
      <td>Height of the arrow in pixels</td>
    </tr>
    <tr>
      <td>tipRadius</td>
      <td>Number</td>
      <td>0</td>
      <td>Radius of the arrow tip in pixels</td>
    </tr>
    <tr>
      <td>fill</td>
      <td>String</td>
      <td>"black"</td>
      <td>Fill color of the arrow</td>
    </tr>
    <tr>
      <td>stroke</td>
      <td>String</td>
      <td>"none"</td>
      <td>Stroke color of the arrow</td>
    </tr>
    <tr>
      <td>strokeWidth</td>
      <td>Number</td>
      <td>0</td>
      <td>Width of the stroke in pixels</td>
    </tr>
    <tr>
      <td>staticOffset</td>
      <td>Number | null</td>
      <td>null</td>
      <td>Static offset of the arrow from the center</td>
    </tr>
  </tbody>
</table>

## Styling

The `FloatingArrow` component renders an SVG element that can be styled using regular CSS. You can customize the appearance of the arrow using the component props, or you can apply CSS to the SVG element:

```css
.my-arrow-class {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}
```

```vue
<FloatingArrow
  ref="arrowRef"
  :context="floating.context"
  class="my-arrow-class"
/>
```

## Arrow Positioning

To position the arrow correctly, you need to:

1. Create a ref for the arrow element
2. Pass the arrow ref to the `arrow` middleware
3. Pass the floating context to the `FloatingArrow` component

```js
const arrowRef = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  middleware: [
    // Make sure to add the arrow middleware
    arrow({ element: arrowRef }),
  ],
});
```

The arrow will automatically position itself based on the current placement of the floating element.

## Advanced Usage

### Custom Arrow Shape

You can customize the shape of the arrow by using CSS clip-path or by creating your own SVG. If you need a completely custom arrow, you can use the `arrowMiddleware` utility function to position your custom arrow element:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, arrowMiddleware } from "v-float";

const arrowRef = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  middleware: [arrowMiddleware({ element: arrowRef })],
});
</script>

<template>
  <div v-if="isOpen" ref="floatingRef">
    Floating content
    <div ref="arrowRef" class="custom-arrow"></div>
  </div>
</template>

<style>
.custom-arrow {
  width: 12px;
  height: 12px;
  background: white;
  transform: rotate(45deg);
  position: absolute;
  border: 1px solid #ccc;
  border-top: none;
  border-left: none;
}
</style>
```

### Arrow with Static Offset

You can use the `staticOffset` prop to move the arrow away from the center of the edge:

```vue
<FloatingArrow
  ref="arrowRef"
  :context="floating.context"
  :fill="'white'"
  :static-offset="20" <!-- 20px from center -->
/>
```

This is useful when you want to align the arrow with a specific point on the reference element, like a button icon.
