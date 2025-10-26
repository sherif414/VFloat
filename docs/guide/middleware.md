# Middleware in V-Float

Middleware is a powerful concept in V-Float that allows you to modify the positioning behavior of floating elements. Middleware functions are executed in a specific order and can transform the position, size, and other properties of floating elements.

## Understanding Middleware

Middleware functions are small, composable utilities that each handle a single concern in the positioning process. They run in sequence, with each middleware potentially modifying the positioning data before passing it to the next one.

Here's how middleware works in V-Float:

1. The floating element's initial position is calculated based on the `placement` option
2. Each middleware in the array is executed in order
3. The final position is determined after all middleware have processed

## Available Middleware

V-Float provides several built-in middleware functions:

### offset

Adds distance between the reference and floating elements.

```js
import { offset } from "v-float";

// Simple usage - applies to main axis only
offset(10);

// More control with options
offset({
  mainAxis: 10, // Distance in the main axis (vertical for 'top'/'bottom', horizontal for 'left'/'right')
  crossAxis: 5, // Distance in the cross axis
  alignmentAxis: null, // Distance in the alignment axis ('-start' or '-end')
});
```

### flip

Flips the placement when the floating element would overflow its boundary.

```js
import { flip } from "v-float";

// Default usage
flip();

// With options
flip({
  fallbackPlacements: ["top", "right"], // Prioritized placements to try
  fallbackStrategy: "bestFit", // Or 'initialPlacement'
  padding: 5, // Padding around the boundary
});
```

### shift

Shifts the floating element to keep it in view when it would otherwise overflow.

```js
import { shift } from "v-float";

// Default usage
shift();

// With options
shift({
  padding: 5, // Padding around the boundary
  boundary: "clippingParents", // or HTMLElement or array of HTMLElements
  limiter: limitShift(), // Limits the shifting to preserve original placement intention
});
```

### arrow

Provides data to position an arrow element that points to the reference.

```js
import { arrow } from "v-float";

// Usage with a Vue ref
const arrowRef = ref(null);

arrow({
  element: arrowRef,
  padding: 5, // Prevents the arrow from reaching the edge of the floating element
});
```

### size

Resizes the floating element based on available space.

```js
import { size } from "v-float";

size({
  padding: 5,
  apply({ availableWidth, availableHeight, elements }) {
    // Customize how the size is applied
    Object.assign(elements.floating.style, {
      maxWidth: `${availableWidth}px`,
      maxHeight: `${availableHeight}px`,
    });
  },
});
```

### autoPlacement

Automatically chooses the placement with the most space available.

```js
import { autoPlacement } from "v-float";

autoPlacement({
  allowedPlacements: ["top", "bottom"], // Restrict to certain placements
  padding: 5, // Padding around the boundary
});
```

### hide

Provides data to hide the floating element when it's detached from the reference.

```js
import { hide } from "v-float";

hide({
  strategy: "referenceHidden", // 'referenceHidden' or 'escaped'
  padding: 5, // Padding around the boundary
});
```

### inline

Improves positioning for inline reference elements.

```js
import { inline } from "v-float";

inline();
```

## Combining Middleware

Middleware functions are designed to be combined in an array. The order matters - each middleware receives the positioning data from the previous one.

```js
import { useFloating, offset, flip, shift, arrow } from "v-float";

const arrowRef = ref(null);

const { x, y, strategy, middlewareData } = useFloating(reference, floating, {
  middlewares: [
    offset(10),
    flip(),
    shift({ padding: 5 }),
    arrow({ element: arrowRef }),
  ],
});

// Access arrow positioning data
const { x: arrowX, y: arrowY } = middlewareData.arrow;
```

## Creating Custom Middleware

You can create your own middleware to handle specialized positioning needs. A middleware function has this signature:

```ts
type Middleware = {
  name: string;
  fn: (state: MiddlewareState) => MiddlewareReturn;
};
```

Here's a simple example of a custom middleware:

```js
function myCustomMiddleware() {
  return {
    name: "myCustomMiddleware",
    fn({ x, y, rects }) {
      // Custom positioning logic
      return {
        x: x + 10, // Offset x position by 10px
        y, // Keep original y position
      };
    },
  };
}
```

## Reactive Middleware Options

Since V-Float is built with Vue's reactivity system, middleware options can be reactive:

```js
import { ref, computed } from "vue";
import { useFloating, offset } from "v-float";

const distance = ref(8);
const middlewares = computed(() => [
  offset(distance.value),
  // Other middleware...
]);

const floating = useFloating(reference, floating, {
  middlewares,
});

// Later, you can change the distance and the positioning will update
function increaseOffset() {
  distance.value += 4;
}
```

This makes your floating UI elements highly adaptable to changing application state.

## See Also

- [useFloating](/api/use-floating)
- [offset](/api/offset)
- [flip](/api/flip)
- [shift](/api/shift)
- [arrow](/api/arrow)
- [size](/api/size)
- [autoplacement](/api/autoplacement)
- [hide](/api/hide)
