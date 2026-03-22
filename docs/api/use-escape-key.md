# useEscapeKey

`useEscapeKey` closes a floating element when the Escape key is pressed.

* Type

    ```ts
    function useEscapeKey(
      context: UseEscapeKeyContext,
      options?: UseEscapeKeyOptions
    ): void

    interface UseEscapeKeyContext extends Pick<FloatingContext, "open" | "setOpen"> {}

    interface UseEscapeKeyOptions {
      enabled?: MaybeRefOrGetter<boolean>
      capture?: boolean
      onEscape?: (event: KeyboardEvent) => void
    }
    ```

* Details

    `useEscapeKey` listens on `document` and ignores Escape while IME composition is active. If you provide `onEscape`, that callback replaces the default close behavior.

    `enabled` and `capture` are both reactive-friendly, so you can toggle the listener without recreating the composable.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useEscapeKey, useFloating } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl)
    useEscapeKey(context)
    </script>

    <template>
      <button ref="anchorEl" @click="context.setOpen(!context.open.value)">
        Toggle
      </button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Press Escape to close
      </div>
    </template>
    ```

* See also

    - [useClick](/api/use-click) - Click-driven activation
    - [useFocus](/api/use-focus) - Focus-driven activation
    - [useFocusTrap](/api/use-focus-trap) - Keeps keyboard focus inside the floating content
