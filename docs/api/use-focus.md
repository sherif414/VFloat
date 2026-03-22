# useFocus

`useFocus` opens and closes a floating element when the anchor receives or loses focus.

* Type

    ```ts
    function useFocus(
      context: UseFocusContext,
      options?: UseFocusOptions
    ): UseFocusReturn

    interface UseFocusContext extends Pick<FloatingContext, "open" | "setOpen" | "refs"> {}

    interface UseFocusOptions {
      enabled?: MaybeRefOrGetter<boolean>
      requireFocusVisible?: MaybeRefOrGetter<boolean>
    }

    interface UseFocusReturn {
      cleanup: () => void
    }
    ```

* Details

    `requireFocusVisible` defaults to `true`, so focus only opens the floating element when the focus is visible rather than caused by a pointer click on a non-typeable element.

    The composable also handles Safari focus-visible quirks, window blur/focus transitions, and delayed blur checks. Call `cleanup()` if you need to remove the listeners manually.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useFocus, useFloating } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl)
    useFocus(context)
    </script>

    <template>
      <button ref="anchorEl">Focus me</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Floating content
      </div>
    </template>
    ```

* See also

    - [useHover](/api/use-hover) - Hover-based activation
    - [useClick](/api/use-click) - Click-based activation
    - [useEscapeKey](/api/use-escape-key) - Keyboard dismissal
