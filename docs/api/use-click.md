# useClick

`useClick` handles click-driven activation for a floating element. It opens from the anchor, supports keyboard activation, and can optionally dismiss on outside clicks.

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

    `useClick` attaches click and keyboard handlers to the anchor element, and can also add a document-level outside-click listener.

    - Anchor activation opens the floating element when it is closed.
    - When `toggle` is `true`, activating the anchor again closes it.
    - Enter activates on `keydown`.
    - Space activates on `keyup` after preventing page scroll.
    - `event` only changes the mouse trigger on the anchor; it does not affect keyboard activation.
    - `ignoreKeyboard` skips keyboard handlers and synthetic keyboard clicks.
    - Outside dismissal only runs when `closeOnOutsideClick` is enabled.
    - `onOutsideClick` replaces the default close behavior.
    - `ignoreDrag` only matters when `outsideClickEvent` is `click`.
    - Open state changes use `anchor-click`, `keyboard-activate`, or `outside-pointer` as the reason passed to `setOpen`.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useFloating, useClick } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl)

    useClick(context, {
      closeOnOutsideClick: true,
    })
    </script>

    <template>
      <button ref="anchorEl">Toggle</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Click outside to close
      </div>
    </template>
    ```

* See also

    - [useFloating](/api/use-floating) - Core positioning composable
    - [useHover](/api/use-hover) - Hover-based interactions
    - [useFocus](/api/use-focus) - Focus-based interactions
    - [useEscapeKey](/api/use-escape-key) - Keyboard dismissal
    - [Interactions Guide](/guide/interactions) - Composing multiple interactions
