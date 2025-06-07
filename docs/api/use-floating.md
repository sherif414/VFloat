# useFloating API

## useFloating()

Composable function that provides positioning for a floating element relative to an anchor element.

- **Type:**

  ```ts
  function useFloating(
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: UseFloatingOptions
  ): FloatingContext
  ```

- **Details:**

  This composable handles the core positioning logic for floating elements (like tooltips, popovers, and menus) relative to their anchor elements. It is a wrapper around the `@floating-ui/dom` library, providing reactive positioning data, computed styles, and lifecycle management within a Vue application. It returns a `FloatingContext` object with all the necessary state and methods.

- **Example:**

  ```vue
  <script setup>
  import { ref } from "vue"
  import { useFloating } from "@/composables/useFloating"

  const anchorEl = ref(null)
  const floatingEl = ref(null)

  const { floatingStyles } = useFloating(anchorEl, floatingEl, {
    placement: "top-start",
    open: ref(true),
  })
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>
    <div ref="floatingEl" :style="floatingStyles">Floating</div>
  </template>
  ```

**See also:** [Guide - Core Concepts](/guide/concepts)

## Types and Interfaces

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
| `setOpen`        | `(open: boolean) => void`                                             | Callback function triggered when the open state changes.            |

### UseFloatingOptions

Options for configuring the behavior of the `useFloating` composable.

| Property               | Type                                                          | Description                                                                                               |
| :--------------------- | :------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| `placement`            | `MaybeRefOrGetter<Placement>`                                 | Desired placement of the floating element (e.g., `'top-start'`, `'bottom'`).                              |
| `strategy`             | `MaybeRefOrGetter<Strategy>`                                  | Positioning strategy: `'absolute'` or `'fixed'`.                                                          |
| `transform`            | `MaybeRefOrGetter<boolean>`                                   | Whether to use CSS `transform` for positioning (improves performance).                                    |
| `middlewares`          | `Middleware[]`                                                | An array of middleware functions to apply to the positioning.                                             |
| `whileElementsMounted` | `(anchorEl: ..., floatingEl: ..., update: ...) => () => void` | Function called when elements are mounted, useful for setting up auto-update. Returns a cleanup function. |
| `open`                 | `Ref<boolean>`                                                | A reactive boolean to control the open/closed state of the floating element.                              |
| `setOpen`              | `(open: boolean) => void`                                     | Callback function invoked when the `open` state changes.                                                  |
| `rootContext`          | `Partial<FloatingContext>`                                    | Partial `FloatingContext` for setting up a floating tree root.                                            |

- **Example:**

  ```ts
  import { offset, shift } from "v-float"

  const options: UseFloatingOptions = {
    placement: "bottom-end",
    strategy: "fixed",
    open: ref(true),
    // Add a 10px offset and enable shifting
    middlewares: [offset(10), shift({ padding: 5 })],
  }

  const { floatingStyles } = useFloating(anchorEl, floatingEl, options)
  ```

### FloatingStyles

An interface for the computed CSS styles object that positions the floating element.

- **Type:**

  ```ts
  interface FloatingStyles extends CSSProperties {
    position: Strategy
    top: string
    left: string
    transform?: string
    "will-change"?: "transform"
  }
  ```

- **Details:**

  This object is returned as a `ComputedRef` (`floatingStyles`) from `useFloating`. It contains the essential CSS properties (`position`, `top`, `left`, and optionally `transform`) that you should bind to your floating element's `style` attribute to position it correctly.

### AnchorElement

- **Type:**

  ```ts
  type AnchorElement = HTMLElement | VirtualElement | null
  ```

- **Details:**

  Defines the type for the anchor element. This is the element that the floating element is positioned relative to. It can be a standard `HTMLElement`, a `VirtualElement` for custom positioning contexts, or `null`.

### FloatingElement

- **Type:**

  ```ts
  type FloatingElement = HTMLElement | null
  ```

- **Details:**

  Defines the type for the floating element itself. This is the element that gets positioned (e.g., the tooltip or popover). It must be an `HTMLElement` or `null`.
