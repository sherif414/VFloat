# useClientPoint

`useClientPoint` positions a floating element relative to the pointer by swapping the floating context anchor for a virtual element at the current client coordinates.

* Type

    ```ts
    function useClientPoint(
      pointerTarget: Ref<HTMLElement | null>,
      context: UseClientPointContext,
      options?: UseClientPointOptions
    ): UseClientPointReturn

    interface UseClientPointOptions {
      enabled?: MaybeRefOrGetter<boolean>
      axis?: MaybeRefOrGetter<"x" | "y" | "both">
      x?: MaybeRefOrGetter<number | null>
      y?: MaybeRefOrGetter<number | null>
      trackingMode?: "follow" | "static"
    }

    interface UseClientPointReturn {
      coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
      updatePosition: (x: number, y: number) => void
    }

    interface UseClientPointContext {
      open: Readonly<Ref<boolean>>
      refs: {
        anchorEl: Ref<AnchorElement>
      }
    }
    ```

* Details

    `useClientPoint` only handles positioning. Pair it with an interaction composable such as `useHover()` or `useClick()` to decide when the floating element should open and close.

    `trackingMode: "follow"` keeps the floating element in sync with pointer movement. `trackingMode: "static"` captures the initial point and keeps the floating element anchored there, which is useful for context menus.

    If both `x` and `y` are provided, the composable behaves like a controlled source of coordinates.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useClientPoint, useFloating, useHover } from "v-float"

    const trackingArea = ref<HTMLElement | null>(null)
    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl, {
      placement: "right-start",
    })

    useClientPoint(trackingArea, context)
    useHover(context)
    </script>

    <template>
      <div ref="trackingArea">
        Move the pointer here

        <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
          Tooltip follows the pointer
        </div>
      </div>
    </template>
    ```

* See also

    - [useFloating](/api/use-floating) - Core positioning composable
    - [useHover](/api/use-hover) - Opens and closes the floating content
    - [Virtual Elements](/guide/virtual-elements) - Learn how virtual anchors work
