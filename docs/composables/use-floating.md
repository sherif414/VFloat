---
description: The core composable for positioning floating elements using Floating UI
---

# useFloating: Your UI Positioning Swiss Army Knife 🛠️

Picture this: you’re building a modern web app with tooltips that elegantly follow your cursor, popovers that snap to
their triggers, and dropdowns that always land in the perfect spot—no matter how the page shifts or resizes. Behind the
scenes, something needs to orchestrate all that pixel-perfect positioning, adapting in real time as users interact and
layouts change.

Enter `useFloating`—the unsung hero of V-Float. Think of it as your UI’s GPS and autopilot, precisely calculating and
updating the position of floating elements so you can focus on building delightful experiences, not wrestling with CSS.

## Why `useFloating`?

`useFloating` is your go-to tool whenever you need to anchor a floating element (like a tooltip, popover, dropdown, or
modal) to another element on the page. It’s designed for:

- **Tooltips that always point to the right spot—even as content scrolls or resizes**
- **Dropdown menus that stay attached to their triggers, regardless of viewport changes**
- **Popovers and modals that need to be perfectly centered or aligned**
- **Any scenario where you want a floating UI element to feel “magnetically” connected to something else**

`useFloating` brings the precision of Floating UI to Vue 3’s reactivity system, making your floating elements feel
smart, dynamic, and effortless.

## Core Features

- **Reactive Positioning:** Instantly adapts when anchor or floating elements move, resize, or change.
- **Flexible Placement:** Choose from 12+ placement options—top, bottom, left, right, and all the fine-grained variants.
- **Middleware Power:** Plug in offset, flip, shift, arrow, and custom middleware for advanced behaviors.
- **Performance First:** Uses CSS transforms by default for buttery-smooth rendering.
- **Auto-Update:** Keeps everything aligned on scroll, resize, or DOM changes—no manual triggers needed.
- **Fully Typed:** Enjoy ts safety and intellisense everywhere.

## Usage Examples

### Basic Usage

Simple tooltip positioning:

:::preview

demo-preview=../demos/use-floating/BasicUsage.vue

:::

### With Middleware

Using middleware for enhanced positioning:

:::preview

demo-preview=../demos/use-floating/WithMiddleware.vue

:::

### Reactive Placement

Dynamic placement based on user interaction:

:::preview

demo-preview=../demos/use-floating/PlacementDemo.vue

:::

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
    onOpenChange: (open) => {
      isOpen.value = open
    },
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

## API Reference

### Parameters

```ts
useFloating(
  anchorEl
:
Ref<AnchorElement>,
  floatingEl
:
Ref<FloatingElement>,
  options ? : UseFloatingOptions
):
FloatingContext
```

#### `anchorEl`

- **Type**: `Ref<AnchorElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the reference element that the floating element will be positioned relative to.
  Can be an HTMLElement, VirtualElement, or null.

#### `floatingEl`

- **Type**: `Ref<FloatingElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the floating element to be positioned. Can be an HTMLElement or null.

#### `options`

- **Type**: `UseFloatingOptions`
- **Required**: No
- **Description**: Configuration options for positioning behavior.

### Options Interface

```ts
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
}
```

#### Option Details

**`placement`**

- **Type**: `MaybeRefOrGetter<Placement | undefined>`
- **Default**: `'bottom'`
- **Description**: Where to place the floating element relative to the anchor element.
- **Values**: `'top'`, `'top-start'`, `'top-end'`, `'right'`, `'right-start'`, `'right-end'`, `'bottom'`,
  `'bottom-start'`, `'bottom-end'`, `'left'`, `'left-start'`, `'left-end'`

**`strategy`**

- **Type**: `MaybeRefOrGetter<Strategy | undefined>`
- **Default**: `'absolute'`
- **Description**: The CSS positioning strategy to use.
- **Values**: `'absolute'`, `'fixed'`

**`transform`**

- **Type**: `MaybeRefOrGetter<boolean | undefined>`
- **Default**: `true`
- **Description**: Whether to use CSS transform for positioning instead of top/left properties. Transform is generally
  more performant.

**`middlewares`**

- **Type**: `Middleware[]`
- **Default**: `[]`
- **Description**: Array of middleware functions that modify positioning behavior. Common middleware include `offset`,
  `flip`, `shift`, and `arrow`.

**`whileElementsMounted`**

- **Type**: Function
- **Description**: Custom function called when both elements are mounted. Should return a cleanup function. If not
  provided, uses Floating UI's `autoUpdate`.

**`open`**

- **Type**: `Ref<boolean>`
- **Default**: `ref(false)`
- **Description**: Reactive boolean controlling whether the floating element is open/visible.

**`onOpenChange`**

- **Type**: `(open: boolean) => void`
- **Description**: Callback function called when the open state changes.

### Return Value

The composable returns a `FloatingContext` object with the following properties:

```ts
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

```ts
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

## Typescript Support

`useFloating` is fully typed with typescript. All interfaces and types are exported for use in your applications:

```ts
import type {
  UseFloatingOptions,
  FloatingContext,
  FloatingStyles,
  AnchorElement,
  FloatingElement
} from '@/composables/use-floating'
```