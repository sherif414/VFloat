# useDismiss

To make the most of `useDismiss`, we recommend you're familiar with:

- **Vue 3 Composition API:** A good understanding is crucial, as `useDismiss` is built as a composable function.
- **The `useFloating` Composable:** Solid experience with the basic `useFloating` hook for positioning single floating elements is necessary. `useDismiss` operates on the `FloatingContext` returned by `useFloating`.

## Closing Your Floating UI Elements 🚪

`useDismiss` is a powerful composable that provides a comprehensive set of event handlers to close or dismiss floating elements based on various user interactions. It's an essential building block for creating intuitive and accessible UI components like tooltips, popovers, menus, and dialogs.

### Overview: Why `useDismiss`?

In many UI patterns, floating elements need to close when the user interacts outside of them, presses a specific key, or scrolls the page. Manually managing these dismissal behaviors can be complex and error-prone, especially when considering accessibility, event bubbling, and different input devices.

`useDismiss` abstracts away this complexity, offering configurable options for common dismissal scenarios:

- **Outside Press:** Closes the floating element when a click or pointer event occurs outside of it and its anchor.
- **Escape Key:** Closes the floating element when the `Escape` key is pressed.
- **Anchor Press:** Closes the floating element when its anchor element is pressed again.
- **Ancestor Scroll:** Closes the floating element when any scrollable ancestor of the floating or anchor element is scrolled.

By integrating `useDismiss`, you can easily add robust dismissal logic to your floating UI components.

---

### Usage Example

Here's a basic example demonstrating how to use `useDismiss` with `useFloating` to create a simple popup that closes on outside clicks or `Escape` key presses.

:::preview

demo-preview=../demos/use-dismiss/BasicUsage.vue

:::

---

## API Reference

### `useDismiss(context, options)`

The `useDismiss` composable provides event handlers for dismissal behaviors.

- **Type:**

  ```ts
  function useDismiss(context: FloatingContext, options?: UseDismissProps): void
  ```

- **Details:**

  This composable takes a `FloatingContext` and an optional `UseDismissProps` object to configure how the floating element should be dismissed. It does not return any props directly; instead, its internal event listeners manage the `open` state of the `FloatingContext`.

- **Arguments:**

  | Parameter | Type              | Description                                            |
  | --------- | ----------------- | ------------------------------------------------------ |
  | `context` | `FloatingContext` | The context object returned from `useFloating`.        |
  | `options` | `UseDismissProps` | Optional configuration options for dismissal behavior. |

### `UseDismissProps`

The `UseDismissProps` interface defines the configuration options for `useDismiss`.

- **Type:**

  ```ts
  interface UseDismissProps {
    enabled?: MaybeRefOrGetter<boolean>
    escapeKey?: MaybeRefOrGetter<boolean>
    anchorPress?: MaybeRefOrGetter<boolean>
    outsidePress?: MaybeRefOrGetter<boolean | ((event: MouseEvent) => boolean)>
    ancestorScroll?: MaybeRefOrGetter<boolean>
    capture?: boolean | { escapeKey?: boolean; outsidePress?: boolean }
    anchorPressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">
    outsidePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">
  }
  ```

- **Properties:**

You can also control which event triggers the outside press behavior:

```vue
<script setup>
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  outsidePressEvent: "mouseup", // 'mousedown', 'mouseup', or 'click'
})
</script>
```

### Escape Key

The `escapeKey` option determines whether pressing the Escape key will close the floating element:

```vue
<script setup>
const dismiss = useDismiss(floating.context, {
  escapeKey: true, // Default is true
})

// Disable escape key dismissal
const dismissNoEscape = useDismiss(floating.context, {
  escapeKey: false,
})
</script>
```

### Reference Press

The `referencePress` option determines whether clicking the reference element while the floating element is open will close it:

```vue
<script setup>
// Close when clicking the reference element while open
const dismiss = useDismiss(floating.context, {
  referencePress: true, // Default is false
  referencePressEvent: "click", // Default is 'mousedown'
})
</script>
```

This is useful for toggling behavior, where clicking the reference element opens and closes the floating element.

### Ancestor Scroll

The `ancestorScroll` option determines whether scrolling a parent element will close the floating element:

```vue
<script setup>
// Close when scrolling a parent element
const dismiss = useDismiss(floating.context, {
  ancestorScroll: true, // Default is false
})
</script>
```

This is particularly useful for floating elements that should be dismissed when the user scrolls the page.

## Conditional Enabling

You can conditionally enable or disable the dismiss behavior:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useDismiss } from "v-float"

// Control whether dismiss is enabled
const dismissEnabled = ref(true)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use reactive enabled option
const dismiss = useDismiss(floating.context, {
  enabled: dismissEnabled,
})

// Later you can update this
function disableDismiss() {
  dismissEnabled.value = false
}

function enableDismiss() {
  dismissEnabled.value = true
}
</script>
```

## Example: Popover with Custom Dismiss

:::preview

demo-preview=../demos/use-dismiss/PopoverWithCustomDismiss.vue

:::

## Example: Modal Dialog with Locked Dismissal

<!-- :::preview

demo-preview=../demos/use-dismiss/ModalDialogWithLockedDismissal.vue

::: -->

## Best Practices

1. **Match UI expectations**: Configure dismissal behavior to match user expectations. For modals, disable `outsidePress` but keep `escapeKey` enabled. For tooltips and popovers, both `outsidePress` and `escapeKey` should typically be enabled.

2. **Consider unsaved changes**: For forms or editors, prompt the user for confirmation before dismissing to avoid data loss.

3. **Provide visible close buttons**: Even with automatic dismissal behaviors, always provide explicit close buttons for better usability.

4. **Optimize event listeners**: Use `outsidePressEvent: 'mousedown'` (the default) for smoother behavior in most cases.

5. **Prevent bubbling issues**: If you have nested floating elements, handle event bubbling appropriately to prevent parent elements from being dismissed when interacting with child elements.

6. **Combine with focus management**: For modal dialogs, use `FloatingFocusManager` to trap focus within the dialog, preventing users from tabbing into areas they shouldn't interact with.

7. **Consider mobile users**: Ensure dismissal works well on touch devices, where behavior might be slightly different.

## Related Composables

- `FloatingFocusManager`: For managing focus within modal dialogs
- `FloatingOverlay`: For creating a backdrop behind modal dialogs
