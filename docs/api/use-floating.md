---
description: The core composable for positioning floating elements using Floating UI
---

# useFloating: Your UI Positioning Swiss Army Knife

Picture this: you're building a modern web app with tooltips that elegantly follow your cursor, popovers that snap to
their triggers, and dropdowns that always land in the perfect spot—no matter how the page shifts or resizes. Behind the
scenes, something needs to orchestrate all that pixel-perfect positioning, adapting in real time as users interact and
layouts change.

Enter `useFloating`—the unsung hero of V-Float. Think of it as your UI's GPS and autopilot, precisely calculating and
updating the position of floating elements so you can focus on building delightful experiences, not wrestling with CSS.

## Why `useFloating`?

`useFloating` is your go-to tool whenever you need to anchor a floating element (like a tooltip, popover, dropdown, or
modal) to another element on the page. It's designed for:

- **Tooltips that always point to the right spot—even as content scrolls or resizes**
- **Dropdown menus that stay attached to their triggers, regardless of viewport changes**
- **Popovers and modals that need to be perfectly centered or aligned**
- **Any scenario where you want a floating UI element to feel "magnetically" connected to something else**

`useFloating` brings the precision of Floating UI to Vue 3's reactivity system, making your floating elements feel
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

<demo src="../demos/use-floating/UseFloatingBasicUsage.vue" />

### With Middleware

Using middleware for enhanced positioning:

<demo src="../demos/use-floating/WithMiddleware.vue" />

### Reactive Placement

Dynamic placement based on user interaction:

<demo src="../demos/use-floating/PlacementDemo.vue" />

## Integration with Other Composables

`useFloating` works seamlessly with other V-Float composables:

<demo src="../demos/use-floating/Interaction.vue" />

## API Reference

### useFloating()

- **Type:**

  ```ts
  function useFloating(
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: UseFloatingOptions
  ): FloatingContext
  ```

- **Example:**

  ```ts
  const { floatingStyles } = useFloating(anchorEl, floatingEl, {
    placement: "top-start",
    open: ref(true),
  })
  ```

---

### AnchorElement

- **Type:**

  ```ts
  type AnchorElement = HTMLElement | VirtualElement | null
  ```

- **Details:**

  Defines the type for the anchor element. This is the element that the floating element is positioned relative to. It can be a standard `HTMLElement`, a `VirtualElement` for custom positioning contexts, or `null`.

  See also: [VirtualElement](/guide/virtual-elements.md)

---

### FloatingElement

- **Type:**

  ```ts
  type FloatingElement = HTMLElement | null
  ```

- **Details:**

  Defines the type for the floating element itself. This is the element that gets positioned (e.g., the tooltip or popover). It must be an `HTMLElement` or `null`.

---

### UseFloatingOptions

Options for configuring the behavior of the `useFloating` composable.

| Property               | Type                                                          | Description                                                                                                                          |
| :--------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| `placement`            | `MaybeRefOrGetter<Placement>`                                 | Desired placement of the floating element (e.g., `'top-start'`, `'bottom'`).                                                         |
| `strategy`             | `MaybeRefOrGetter<Strategy>`                                  | Positioning strategy: `'absolute'` or `'fixed'`.                                                                                     |
| `transform`            | `MaybeRefOrGetter<boolean>`                                   | Whether to use CSS `transform` for positioning (improves performance).                                                               |
| `middlewares`          | `Middleware[]`                                                | An array of middleware functions to apply to the positioning.                                                                        |
| `whileElementsMounted` | `(anchorEl: ..., floatingEl: ..., update: ...) => () => void` | Function called when elements are mounted, useful for setting up auto-update. Returns a cleanup function.                            |
| `open`                 | `Ref<boolean>`                                                | A reactive boolean to control the open/closed state of the floating element.                                                         |
| `setOpen`              | `(open: boolean) => void`                                     | Function to control the open state of the floating element. If not provided, a default function is used that updates the `open` ref. |

---

### FloatingContext

The context object returned by `useFloating` containing all necessary reactive data and methods.

| Property         | Type                                                                  | Description                                                         |
| :--------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `x`              | `Readonly<Ref<number>>`                                               | The x-coordinate of the floating element.                           |
| `y`              | `Readonly<Ref<number>>`                                               | The y-coordinate of the floating element.                           |
| `strategy`       | `Readonly<Ref<Strategy>>`                                             | The positioning strategy (`'absolute'` or `'fixed'`).               |
| `placement`      | `Readonly<Ref<Placement>>`                                            | The final placement of the floating element.                        |
| `middlewareData` | `Readonly<Ref<MiddlewareData>>`                                       | Data provided by middleware functions.                              |
| `isPositioned`   | `Readonly<Ref<boolean>>`                                              | Indicates if the floating element has been positioned.              |
| `floatingStyles` | `ComputedRef<FloatingStyles>`                                         | Computed CSS styles to apply to the floating element.               |
| `update`         | `() => void`                                                          | Function to manually update the floating element's position.        |
| `refs`           | `{ anchorEl: Ref<AnchorElement>; floatingEl: Ref<FloatingElement>; }` | References to the anchor and floating DOM elements.                 |
| `open`           | `Readonly<Ref<boolean>>`                                              | Reactive boolean indicating the open state of the floating element. |
| `setOpen`        | `(open: boolean) => void`                                             | Function to explicitly set the open state of the floating element.  |

---

### FloatingStyles

An interface for the computed CSS styles object that positions the floating element.

- **Type:**

  ```ts
  interface FloatingStyles {
    position: Strategy // 'fixed' | 'absolute'
    top: string
    left: string
    transform?: string
    "will-change"?: "transform"
  }
  ```

- **Details:**

  This object is returned as a `ComputedRef` (`floatingStyles`) from `useFloating`. It contains the essential CSS properties (`position`, `top`, `left`, and optionally `transform`) that you should bind to your floating element's `style` attribute to position it correctly.

## Best Practices

### Performance Optimization

1. **Use CSS transforms**: Keep `transform: true` (default) for better performance
2. **Minimize middleware**: Only use necessary middleware to reduce computation
3. **Custom auto-update**: Implement custom `whileElementsMounted` for specific use cases
