# useFocusTrap

`useFocusTrap` keeps keyboard focus inside the floating element while it is open.

* Type

    ```ts
    function useFocusTrap(
      context: UseFocusTrapContext,
      options?: UseFocusTrapOptions
    ): UseFocusTrapReturn

    interface UseFocusTrapContext extends Pick<FloatingContext, "open" | "setOpen"> {
      refs: Pick<FloatingContext["refs"], "floatingEl">
    }

    interface UseFocusTrapOptions {
      enabled?: MaybeRefOrGetter<boolean>
      modal?: MaybeRefOrGetter<boolean>
      initialFocus?: HTMLElement | (() => HTMLElement | false) | string | false
      returnFocus?: MaybeRefOrGetter<boolean>
      closeOnFocusOut?: MaybeRefOrGetter<boolean>
      preventScroll?: MaybeRefOrGetter<boolean>
      outsideElementsInert?: MaybeRefOrGetter<boolean>
      onError?: (error: unknown) => void
    }

    interface UseFocusTrapReturn {
      isActive: ComputedRef<boolean>
      activate: () => void
      deactivate: () => void
    }
    ```

* Details

    `modal` turns the trap into modal behavior by hiding or inerting outside elements when supported. `closeOnFocusOut` only applies when `modal` is `false`.

    `initialFocus` can be a selector, an element, a function that returns an element, or `false` to skip the automatic initial focus. `returnFocus` defaults to `true`, and `preventScroll` defaults to `true`.

    If activation fails, `onError` receives the error. Otherwise the composable logs the failure in development builds.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useFloating, useFocusTrap } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)
    const open = ref(false)

    const context = useFloating(anchorEl, floatingEl, {
      open,
      onOpenChange: (value) => {
        open.value = value
      },
    })

    useFocusTrap(context, { modal: true })
    </script>

    <template>
      <button ref="anchorEl" @click="open = !open">
        Open dialog
      </button>

      <Teleport to="body">
        <div v-if="open" class="backdrop">
          <div
            ref="floatingEl"
            :style="context.floatingStyles"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <h2>Dialog</h2>
            <input placeholder="Focus stays inside" />
            <button @click="open = false">Close</button>
          </div>
        </div>
      </Teleport>
    </template>
    ```

* See also

    - [useEscapeKey](/api/use-escape-key) - Keyboard dismissal
    - [useFocus](/api/use-focus) - Focus-based activation
    - [useListNavigation](/api/use-list-navigation) - Keyboard navigation inside the trap
