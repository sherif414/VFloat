# useArrow

`useArrow` connects an arrow element to a floating context and returns ready-to-use arrow coordinates and styles.

* Type

    ```ts
    function useArrow(
      arrowEl: Ref<HTMLElement | null>,
      context: FloatingContext,
      options?: UseArrowOptions
    ): UseArrowReturn

    interface UseArrowOptions {
      offset?: string
    }

    interface UseArrowReturn {
      arrowX: ComputedRef<number>
      arrowY: ComputedRef<number>
      arrowStyles: ComputedRef<Record<string, string>>
    }
    ```

* Details

    `useArrow` keeps `context.refs.arrowEl` in sync with your arrow ref. That lets `useFloating()` add the arrow middleware automatically, so the arrow position stays aligned with the computed placement.

    The composable reads `middlewareData.arrow` and returns logical positioning styles through `arrowStyles`. `offset` defaults to `"-4px"`.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { offset, useArrow, useFloating } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)
    const arrowEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl, {
      middlewares: [offset(8)],
    })

    const { arrowStyles } = useArrow(arrowEl, context)
    </script>

    <template>
      <button ref="anchorEl">Anchor</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Floating content
        <div ref="arrowEl" :style="arrowStyles">^</div>
      </div>
    </template>
    ```

* See also

    - [arrow](/api/arrow) - The underlying middleware
    - [useFloating](/api/use-floating) - Core positioning composable
