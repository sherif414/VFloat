# useFloating

`useFloating` positions a floating element relative to an anchor element and returns the reactive state needed to render and control it.

* Type

    ```ts
    function useFloating(
      anchorEl: Ref<AnchorElement>,
      floatingEl: Ref<FloatingElement>,
      options?: UseFloatingOptions
    ): FloatingContext

    type AnchorElement = HTMLElement | VirtualElement | null

    type FloatingElement = HTMLElement | null

    interface UseFloatingOptions {
      placement?: MaybeRefOrGetter<Placement | undefined>
      strategy?: MaybeRefOrGetter<Strategy | undefined>
      transform?: MaybeRefOrGetter<boolean | undefined>
      middlewares?: MaybeRefOrGetter<Middleware[]>
      autoUpdate?: boolean | AutoUpdateOptions
      open?: Ref<boolean>
      onOpenChange?: (
        open: boolean,
        reason: OpenChangeReason,
        event?: Event
      ) => void
    }

    interface FloatingContext {
      x: Readonly<Ref<number>>
      y: Readonly<Ref<number>>
      strategy: Readonly<Ref<Strategy>>
      placement: Readonly<Ref<Placement>>
      middlewareData: Readonly<Ref<MiddlewareData>>
      isPositioned: Readonly<Ref<boolean>>
      floatingStyles: Readonly<Ref<FloatingStyles>>
      update: () => void
      refs: {
        anchorEl: Ref<AnchorElement>
        floatingEl: Ref<FloatingElement>
        arrowEl: Ref<HTMLElement | null>
      }
      open: Readonly<Ref<boolean>>
      setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void
    }

    type OpenChangeReason =
      | "anchor-click"
      | "keyboard-activate"
      | "outside-pointer"
      | "focus"
      | "blur"
      | "hover"
      | "escape-key"
      | "programmatic"

    interface FloatingStyles {
      position: Strategy
      top: string
      left: string
      transform?: string
      "will-change"?: string
    }
    ```

* Details

    `useFloating` is the core positioning composable for tooltips, menus, popovers, dialogs, and other anchored surfaces. It computes coordinates from the anchor and floating refs, keeps them in sync with `autoUpdate` by default, and exposes the shared open state that interaction composables reuse.

    * `placement` controls the preferred side and alignment. It defaults to `"bottom"`.
    * `strategy` controls whether the floating element uses `"absolute"` or `"fixed"` positioning. It defaults to `"absolute"`.
    * `transform` is enabled by default and writes the position as a CSS transform.
    * `middlewares` let you refine the computed position with helpers such as `offset()`, `flip()`, `shift()`, or `arrow()`.
    * `autoUpdate` is enabled by default. Pass `false` to disable it, or pass an `AutoUpdateOptions` object to forward options to Floating UI.
    * `open` defaults to `ref(false)`. If you pass your own ref, `useFloating` uses it as shared state.
    * `setOpen(open, reason?, event?)` updates the open state and calls `onOpenChange`. If you omit `reason`, it falls back to `"programmatic"`.
    * `refs.arrowEl` is filled by `useArrow()` so the arrow middleware can read the same context.

* Example

    ```vue
    <script setup lang="ts">
    import { ref } from "vue"
    import { offset, useFloating } from "v-float"

    const anchorEl = ref<HTMLElement | null>(null)
    const floatingEl = ref<HTMLElement | null>(null)

    const context = useFloating(anchorEl, floatingEl, {
      placement: "bottom-start",
      middlewares: [offset(8)],
    })
    </script>

    <template>
      <button ref="anchorEl" @click="context.setOpen(!context.open.value)">
        Toggle
      </button>

      <div
        v-if="context.open.value"
        ref="floatingEl"
        :style="context.floatingStyles"
      >
        Floating content
      </div>
    </template>
    ```

* See also

    - [useClick](/api/use-click) - Click-based activation
    - [useHover](/api/use-hover) - Hover-based activation
    - [useFocus](/api/use-focus) - Focus-based activation
    - [useArrow](/api/use-arrow) - Arrow positioning styles
    - [offset](/api/offset) - Add spacing
    - [flip](/api/flip) - Flip to the opposite side when needed
    - [shift](/api/shift) - Keep the floating element in view
    - [Interactions Guide](/guide/interactions) - Combine positioning with interactions
