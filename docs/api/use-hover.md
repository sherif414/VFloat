# useHover

`useHover` opens and closes a floating element when the pointer enters or leaves the anchor or floating element.

* Type

    ```ts
    function useHover(
      context: FloatingContext,
      options?: UseHoverOptions
    ): void

    interface UseHoverOptions {
      enabled?: MaybeRef<boolean>
      delay?: MaybeRef<number | { open?: number; close?: number }>
      restMs?: MaybeRef<number>
      mouseOnly?: MaybeRef<boolean>
      safePolygon?: MaybeRef<boolean | SafePolygonOptions>
    }

    interface SafePolygonOptions {
      buffer?: number
      requireIntent?: boolean
      onPolygonChange?: (polygon: Polygon) => void
    }
    ```

* Details

    `delay` can be a single number or separate open and close values. `restMs` only applies when the open delay is `0`, so it is used to open after the pointer settles instead of after a timer-based delay.

    `safePolygon` keeps the floating element open while the pointer moves between the anchor and floating surfaces. Use `mouseOnly` when you want to ignore pen, touch, or other non-mouse pointers.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { useFloating, useHover } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl, {
      placement: "top",
    })

    useHover(context, {
      delay: { open: 100, close: 150 },
      safePolygon: true,
    })
    </script>

    <template>
      <button ref="anchorEl">Hover me</button>

      <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
        Tooltip content
      </div>
    </template>
    ```

* See also

    - [useFocus](/api/use-focus) - Focus-based activation
    - [useClick](/api/use-click) - Click-based activation
    - [useFloating](/api/use-floating) - Core positioning composable
