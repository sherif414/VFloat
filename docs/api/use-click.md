# useClick

`useClick` handles click-driven activation for a floating element.

* Type

    ```ts
    function useClick(
      context: UseClickContext,
      options?: UseClickOptions
    ): void

    interface UseClickContext extends Pick<FloatingContext, "refs" | "open" | "setOpen"> {}

    interface UseClickOptions {
      enabled?: MaybeRefOrGetter<boolean>
      event?: MaybeRefOrGetter<"click" | "mousedown">
      toggle?: MaybeRefOrGetter<boolean>
      ignoreMouse?: MaybeRefOrGetter<boolean>
      ignoreKeyboard?: MaybeRefOrGetter<boolean>
      ignoreTouch?: MaybeRefOrGetter<boolean>
      closeOnOutsideClick?: MaybeRefOrGetter<boolean>
      outsideClickEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">
      outsideCapture?: MaybeRefOrGetter<boolean>
      onOutsideClick?: (event: MouseEvent) => void
      ignoreScrollbar?: MaybeRefOrGetter<boolean>
      ignoreDrag?: MaybeRefOrGetter<boolean>
    }
    ```

* Details

    `useClick` is a composable designed to handle click-based activation for floating elements, such as dropdowns, menus, or tooltips. It simplifies the logic for toggling the open state, managing keyboard accessibility, and handling clicks outside the floating element.

    ### Key Features

    * **Toggle Behavior**: By default, clicking the anchor element will toggle the floating element's visibility. This can be controlled via the `toggle` option.
    * **Keyboard Support**: Automatically supports accessibility by allowing the `Enter` and `Space` keys to toggle the floating element when the anchor is focused. This behavior can be disabled using `ignoreKeyboard`.
    * **Outside Click Handling**: When `closeOnOutsideClick` is enabled (default), the floating element will close if the user clicks anywhere outside both the anchor and the floating element itself.
    * **Flexible Events**: Customize which mouse event triggers the activation using the `event` option (e.g., `click` or `mousedown`).
    * **Interaction Guards**: Provides options like `ignoreMouse`, `ignoreTouch`, and `ignoreScrollbar` to fine-tune which interactions should be ignored.

    ### Configuration Options

    | Option | Description | Default |
    | :--- | :--- | :--- |
    | `enabled` | Whether the click interaction is active. | `true` |
    | `event` | The mouse event that triggers the toggle (`'click'` or `'mousedown'`). | `'click'` |
    | `toggle` | Whether clicking the anchor when the floating element is already open should close it. | `true` |
    | `closeOnOutsideClick` | Whether clicking outside the elements should close the floating element. | `true` |
    | `onOutsideClick` | A callback function executed when an outside click is detected. | `undefined` |

* Example

    ```vue
    <script setup lang="ts">
    import { useTemplateRef } from "vue"
    import { useClick, useFloating } from "v-float"

    const anchorEl = useTemplateRef("anchorEl")
    const floatingEl = useTemplateRef("floatingEl")

    const context = useFloating(anchorEl, floatingEl)
    useClick(context)
    </script>

    <template>
      <button ref="anchorEl">Toggle</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Floating content
      </div>
    </template>
    ```

* See also

    - [useFloating](/api/use-floating) - Core positioning composable
    - [useHover](/api/use-hover) - Hover-based interactions
    - [useFocus](/api/use-focus) - Focus-based interactions
    - [useEscapeKey](/api/use-escape-key) - Keyboard dismissal
    - [Interactions Guide](/guide/interactions) - Composing multiple interactions
