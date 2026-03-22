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

    By default, clicking the anchor element opens the floating element. With `toggle` enabled (the default), clicking the anchor again closes it.

    The composable also responds to keyboard activation: pressing Enter or Space on the anchor element toggles the floating element open or closed. To disable this behavior, set `ignoreKeyboard` to `true`.

    When `closeOnOutsideClick` is enabled, clicking anywhere outside the floating element closes it. You can customize this behavior with `onOutsideClick` to perform additional actions when an outside click occurs, or use `ignoreScrollbar` to prevent clicks on the browser scrollbar from closing the floating element.

    The `event` option lets you choose between `click` (default) or `mousedown` for when the anchor should respond to mouse interaction. This does not affect keyboard or touch interactions.

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
