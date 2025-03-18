# useFloating

The `useFloating` composable is the core positioning engine of the V-Float library. It's responsible for calculating the position of a floating element relative to a reference element. This composable leverages the underlying Floating UI DOM positioning logic and provides a Vue-friendly reactive interface.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

// Basic usage with default options
const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});
</script>

<template>
  <button ref="referenceRef" @click="isOpen = !isOpen">
    Toggle Floating Element
  </button>

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
    This is a floating element
  </div>
</template>
```

## Arguments & Return Values

### Arguments

<script setup>
import { ref } from 'vue'
</script>

The `useFloating` composable can be used in two forms:

**Form 1: Provide the refs as separate arguments**

```ts
const floating = useFloating(
  referenceRef, // Ref<HTMLElement | VirtualElement | null>
  floatingRef, // Ref<HTMLElement | null>
  options // UseFloatingOptions
);
```

**Form 2: Provide the refs in the options object**

```ts
const floating = useFloating({
  elements: {
    reference: referenceRef,
    floating: floatingRef,
  },
  // ... other options
});
```

### Options

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>placement</td>
      <td>MaybeRefOrGetter&lt;Placement&gt;</td>
      <td>'bottom'</td>
      <td>
        The placement of the floating element relative to the reference. Can be 'top', 'right', 'bottom', 'left', or their variations with '-start' or '-end' suffixes.
      </td>
    </tr>
    <tr>
      <td>strategy</td>
      <td>MaybeRefOrGetter&lt;Strategy&gt;</td>
      <td>'absolute'</td>
      <td>
        The positioning strategy. Can be 'absolute' or 'fixed'.
      </td>
    </tr>
    <tr>
      <td>transform</td>
      <td>MaybeRefOrGetter&lt;boolean&gt;</td>
      <td>true</td>
      <td>
        Whether to use CSS transform for positioning instead of top/left.
      </td>
    </tr>
    <tr>
      <td>middleware</td>
      <td>MaybeRefOrGetter&lt;Middleware[]&gt;</td>
      <td>[]</td>
      <td>
        Array of middleware functions that modify the positioning behavior.
      </td>
    </tr>
    <tr>
      <td>open</td>
      <td>MaybeRefOrGetter&lt;boolean&gt;</td>
      <td>false</td>
      <td>
        Whether the floating element is currently open/visible.
      </td>
    </tr>
    <tr>
      <td>onOpenChange</td>
      <td>(open: boolean) => void</td>
      <td>undefined</td>
      <td>
        Callback function invoked when the open state should change.
      </td>
    </tr>
    <tr>
      <td>whileElementsMounted</td>
      <td>Function</td>
      <td>undefined</td>
      <td>
        Function called when both elements are mounted. Can return a cleanup function.
      </td>
    </tr>
  </tbody>
</table>

### Return Value

<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>x</td>
      <td>Readonly&lt;Ref&lt;number&gt;&gt;</td>
      <td>The x-coordinate of the floating element</td>
    </tr>
    <tr>
      <td>y</td>
      <td>Readonly&lt;Ref&lt;number&gt;&gt;</td>
      <td>The y-coordinate of the floating element</td>
    </tr>
    <tr>
      <td>strategy</td>
      <td>Readonly&lt;Ref&lt;Strategy&gt;&gt;</td>
      <td>The positioning strategy ('absolute' or 'fixed')</td>
    </tr>
    <tr>
      <td>placement</td>
      <td>Readonly&lt;Ref&lt;Placement&gt;&gt;</td>
      <td>The actual placement after middleware processing</td>
    </tr>
    <tr>
      <td>middlewareData</td>
      <td>Readonly&lt;Ref&lt;MiddlewareData&gt;&gt;</td>
      <td>Data from middleware for additional customization</td>
    </tr>
    <tr>
      <td>isPositioned</td>
      <td>Readonly&lt;Ref&lt;boolean&gt;&gt;</td>
      <td>Whether the floating element has been positioned</td>
    </tr>
    <tr>
      <td>floatingStyles</td>
      <td>ComputedRef&lt;Record&lt;string, any&gt;&gt;</td>
      <td>Computed styles to apply to the floating element</td>
    </tr>
    <tr>
      <td>update</td>
      <td>() => void</td>
      <td>Function to manually update the position</td>
    </tr>
    <tr>
      <td>refs</td>
      <td>{ reference, floating }</td>
      <td>The refs object containing reference to both elements</td>
    </tr>
    <tr>
      <td>elements</td>
      <td>{ reference, floating }</td>
      <td>The current elements if they exist</td>
    </tr>
    <tr>
      <td>context</td>
      <td>Object</td>
      <td>Context object passed to other composables like useInteractions</td>
    </tr>
  </tbody>
</table>

## Reactive Options

All options in `useFloating` can be provided as reactive values (refs, computed, or getters), allowing you to dynamically change the behavior:

```vue
<script setup>
import { ref, computed } from "vue";
import { useFloating, offset } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);
const placementState = ref("bottom"); // Can be changed dynamically
const offsetDistance = ref(8); // Can be changed dynamically

// Reactive middleware array
const middleware = computed(() => [offset(offsetDistance.value)]);

const floating = useFloating(referenceRef, floatingRef, {
  placement: placementState,
  middleware,
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Later you can change these reactive values
function changePlacement(newPlacement) {
  placementState.value = newPlacement; // The floating position will update automatically
}

function changeOffset(newOffset) {
  offsetDistance.value = newOffset; // The middleware will update and position will recalculate
}
</script>
```

## Using the Returned Values

### Basic Positioning

The simplest way to position your floating element is by using the `x` and `y` values:

```vue
<div
  ref="floatingRef"
  :style="{
    position: floating.strategy,
    top: '0px',
    left: '0px',
    transform: `translate(${floating.x}px, ${floating.y}px)`,
  }"
>
  Floating content
</div>
```

### Using the Computed Styles

For convenience, `useFloating` returns a `floatingStyles` object that you can directly apply to your element:

```vue
<div ref="floatingRef" :style="floating.floatingStyles">
  Floating content
</div>
```

### Manually Updating the Position

Sometimes you need to manually update the position of the floating element, such as when its content changes:

```vue
<script setup>
const { update } = useFloating(referenceRef, floatingRef);

function updateContent() {
  // Change content...
  // Then update the position
  update();
}
</script>
```

## Middleware Integration

To modify the positioning behavior, you can use middleware functions:

```vue
<script setup>
import { useFloating, offset, flip, shift, arrow } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const arrowRef = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  middleware: [
    offset(10), // Add 10px of distance
    flip(), // Flip to the opposite side if there's not enough space
    shift({ padding: 5 }), // Shift to stay within viewport with 5px padding
    arrow({ element: arrowRef }), // Position the arrow
  ],
});
</script>
```

## Advanced Usage

### Auto-Updating Position

To automatically update the position when the reference or floating elements change, resize, or scroll, use the `whileElementsMounted` option:

```vue
<script setup>
import { useFloating, autoUpdate } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  whileElementsMounted: (reference, floating, update) => {
    // autoUpdate handles scroll, resize, and mutations
    const cleanup = autoUpdate(reference, floating, update, {
      animationFrame: true, // Use requestAnimationFrame for smoother updates
    });
    return cleanup; // Returned function will be called for cleanup
  },
});
</script>
```

### Virtual Elements

Sometimes you need to position a floating element relative to a point or rectangle rather than a DOM element. You can do this with virtual elements:

```vue
<script setup>
import { ref } from "vue";
import { useFloating } from "v-float";

const floatingRef = ref(null);
const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: 100,
      y: 100,
      width: 0,
      height: 0,
      top: 100,
      left: 100,
      right: 100,
      bottom: 100,
    };
  },
});

const floating = useFloating({
  elements: {
    reference: virtualRef, // Virtual element reference
    floating: floatingRef,
  },
});
</script>
```

### Conditional Rendering

When conditionally rendering the floating element, ensure the reference is updated when it appears:

```vue
<script setup>
import { ref, watch, nextTick } from "vue";
import { useFloating } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Force an update when the floating element becomes visible
watch(isOpen, (newValue) => {
  if (newValue) {
    // Use nextTick to ensure the DOM has updated
    nextTick(() => floating.update());
  }
});
</script>
```

## Accessibility Considerations

- Use the proper ARIA attributes (like `aria-haspopup`, `aria-expanded`, etc.) on the reference element.
- Ensure keyboard users can open, navigate, and close the floating element.
- For popovers and dropdowns, handle Escape key presses to close them.
- For tooltips, ensure they are properly announced by screen readers.

```vue
<template>
  <button ref="referenceRef" aria-haspopup="true" :aria-expanded="isOpen">
    Toggle Menu
  </button>

  <!-- Floating element with proper attributes -->
</template>
```
