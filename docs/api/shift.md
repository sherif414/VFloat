# shift

`shift` nudges the floating element back into view after placement has been chosen.

* Type

    ```ts
    function shift(options?: ShiftOptions): Middleware

    interface ShiftOptions {
      mainAxis?: boolean
      crossAxis?: boolean
      limiter?: {
        fn: (state: MiddlewareState) => Coords
        options?: unknown
      }
      padding?: Padding
      boundary?: Boundary
      rootBoundary?: RootBoundary
      elementContext?: ElementContext
      altBoundary?: boolean
    }
    ```

* Details

    `shift` is the right choice when you want to preserve the chosen placement and only adjust the coordinates enough to keep the floating element visible. It can shift on the main axis, the cross axis, or both.

    Use it together with `flip()` when you want a stable preferred placement plus a fallback if that placement cannot fit.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { shift, useFloating } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl, {
      middlewares: [
        shift({ padding: 8, crossAxis: true }),
      ],
    })
    </script>

    <template>
      <button ref="anchorEl">Anchor</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Floating content
      </div>
    </template>
    ```

* See also

    - [flip](/api/flip) - Chooses another placement when the preferred one overflows
    - [offset](/api/offset) - Adds spacing before shifting
    - [size](/api/size) - Adjusts the floating element to the available space
