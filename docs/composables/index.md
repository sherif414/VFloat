# Composables

V-Float provides a comprehensive set of Vue 3 composables for creating floating UI elements. These composables leverage the power of Vue's Composition API to provide a flexible and declarative approach to building interactive UI components.

## Core Composables

### useFloating

The foundation of V-Float, this composable handles the positioning logic for floating elements.

```js
const { x, y, strategy, placement, middlewareData } = useFloating(
  referenceRef,
  floatingRef,
  {
    placement: "bottom",
    middleware: [offset(10), flip(), shift()],
  }
);
```

[Learn more about useFloating →](/composables/use-floating)

### useMergeRefs

Utility composable to merge multiple Vue refs into a single ref function.

```js
const mergedRef = useMergeRefs([ref1, ref2, ref3]);
```

[Learn more about useMergeRefs →](/composables/use-merge-refs)

## Interaction Composables

These composables handle different types of user interactions with floating elements.

### useInteractions

Combines multiple interaction composables into a single interface.

```js
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus,
  click,
  dismiss,
]);
```

[Learn more about useInteractions →](/composables/use-interactions)

### useHover

Handles hover interactions for floating elements, with configurable delay.

```js
const hover = useHover(floating.context, {
  delay: { open: 100, close: 200 },
});
```

[Learn more about useHover →](/composables/use-hover)

### useFocus

Manages focus/blur events for floating elements.

```js
const focus = useFocus(floating.context, {
  visibleOnly: false,
});
```

[Learn more about useFocus →](/composables/use-focus)

### useClick

Handles click events for floating elements.

```js
const click = useClick(floating.context, {
  toggle: true,
  event: "mousedown",
});
```

[Learn more about useClick →](/composables/use-click)

### useDismiss

Closes floating elements when clicking outside or pressing escape.

```js
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  escapeKey: true,
});
```

[Learn more about useDismiss →](/composables/use-dismiss)

### useRole

Manages ARIA role attributes for accessibility.

```js
const role = useRole(floating.context, {
  role: "dialog",
});
```

[Learn more about useRole →](/composables/use-role)

### useListNavigation

Provides keyboard navigation for lists in dropdowns, select menus, etc.

```js
const listNavigation = useListNavigation(floating.context, {
  loop: true,
  orientation: "vertical",
});
```

[Learn more about useListNavigation →](/composables/use-list-navigation)

### useTypeahead

Enables type-to-select functionality in lists.

```js
const typeahead = useTypeahead(floating.context, {
  listRef: items,
  activeIndex,
  onMatch: (index) => setActiveIndex(index),
});
```

[Learn more about useTypeahead →](/composables/use-typeahead)

## Middleware Composables

Middleware composables modify the position of floating elements based on various constraints.

### offset

Adds distance between the reference and floating elements.

```js
offset(10); // 10px in the direction of the placement
offset({ mainAxis: 10, crossAxis: 5 }); // More control
```

[Learn more about offset →](/composables/middleware/offset)

### flip

Flips the placement when the floating element would overflow.

```js
flip({
  fallbackPlacements: ["top", "right"],
});
```

[Learn more about flip →](/composables/middleware/flip)

### shift

Shifts the floating element to keep it in view.

```js
shift({
  padding: 5,
  boundary: "clippingParents",
});
```

[Learn more about shift →](/composables/middleware/shift)

### size

Resizes the floating element based on available space.

```js
size({
  apply: ({ availableWidth, availableHeight, elements }) => {
    Object.assign(elements.floating.style, {
      maxWidth: `${availableWidth}px`,
      maxHeight: `${availableHeight}px`,
    });
  },
});
```

[Learn more about size →](/composables/middleware/size)

## Composing Composables

The real power of V-Float comes from composing these composables together. A typical implementation might look like:

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useHover,
  useFocus,
  useDismiss,
  offset,
  flip,
  shift,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

// Position the floating element
const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
});

// Set up interactions
const hover = useHover(floating.context, {
  delay: { open: 100, close: 0 },
});
const focus = useFocus(floating.context);
const dismiss = useDismiss(floating.context);

// Combine all interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus,
  dismiss,
]);
</script>
```
