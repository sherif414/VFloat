import { getDPR, roundByDPR } from "@/utils"
import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
  VirtualElement,
} from "@floating-ui/dom"
import { computePosition, autoUpdate as floatingUIAutoUpdate } from "@floating-ui/dom"
import type { ComputedRef, CSSProperties, MaybeRefOrGetter, Ref } from "vue"
import { computed, onScopeDispose, onWatcherCleanup, ref, shallowRef, toValue, watch } from "vue"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Type for anchor element in floating UI
 */
export type AnchorElement = HTMLElement | VirtualElement | null

/**
 * Type for floating element in floating UI
 */
export type FloatingElement = HTMLElement | null

/**
 * CSS styles for positioning floating elements
 */
export interface FloatingStyles extends CSSProperties {
  /**
   * CSS position property
   */
  position: Strategy

  /**
   * CSS top property
   */
  top: string

  /**
   * CSS left property
   */
  left: string

  /**
   * CSS transform property
   */
  transform?: string

  /**
   * CSS will-change property
   */
  "will-change"?: "transform"
}

/**
 * Options for configuring floating element behavior
 */
export interface UseFloatingOptions {
  /**
   * Where to place the floating element relative to its anchor element.
   * @default 'bottom'
   */
  placement?: MaybeRefOrGetter<Placement | undefined>

  /**
   * The type of CSS positioning to use.
   * @default 'absolute'
   */
  strategy?: MaybeRefOrGetter<Strategy | undefined>

  /**
   * Whether to use CSS transform instead of top/left positioning.
   * @default true
   */
  transform?: MaybeRefOrGetter<boolean | undefined>

  /**
   * Middlewares modify the positioning coordinates in some fashion, or provide useful data for the consumer to use.
   */
  middlewares?: Middleware[]

  /**
   * Function called when both the anchor and floating elements are mounted.
   */
  whileElementsMounted?: (
    anchorEl: NonNullable<AnchorElement>,
    floatingEl: NonNullable<FloatingElement>,
    update: () => void
  ) => undefined | (() => void)

  /**
   * Whether the floating element is open.
   * @default false
   */
  open?: Ref<boolean>

  /**
   * Function called when the open state changes.
   */
  setOpen?: (open: boolean) => void

  /**
   * Root context for the floating element tree.
   */
  rootContext?: Partial<FloatingContext>
}

/**
 * Context object returned by useFloating containing all necessary data and methods
 */
export interface FloatingContext {
  /**
   * The x-coordinate of the floating element
   */
  x: Readonly<Ref<number>>

  /**
   * The y-coordinate of the floating element
   */
  y: Readonly<Ref<number>>

  /**
   * The strategy used for positioning
   */
  strategy: Readonly<Ref<Strategy>>

  /**
   * The placement of the floating element
   */
  placement: Readonly<Ref<Placement>>

  /**
   * Data from middleware for additional customization
   */
  middlewareData: Readonly<Ref<MiddlewareData>>

  /**
   * Whether the floating element has been positioned
   */
  isPositioned: Readonly<Ref<boolean>>

  /**
   * Computed styles to apply to the floating element
   */
  floatingStyles: ComputedRef<FloatingStyles>

  /**
   * Function to manually update the position
   */
  update: () => void

  /**
   * The refs object containing references to anchor and floating elements
   */
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
  }

  /**
   * Whether the floating element is open
   */
  open: Readonly<Ref<boolean>>

  /**
   * Function to update the open state
   */
  setOpen: (open: boolean) => void
}

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================

/**
 * Composable function that provides positioning for a floating element relative to an anchor element
 *
 * This composable handles the positioning logic for floating elements (like tooltips, popovers, etc.)
 * relative to their anchor elements. It uses Floating UI under the hood and provides reactive
 * positioning data and styles.
 *
 * @param anchorEl - The anchor element or a reactive reference to it
 * @param floatingEl - The floating element or a reactive reference to it
 * @param options - Additional options for the floating behavior
 * @returns A FloatingContext object containing positioning data and methods
 *
 * @example
 * ```ts
 * const { floatingStyles, refs } = useFloating(anchorEl, floatingEl, {
 *   placement: 'bottom',
 *   strategy: 'absolute'
 * })
 * ```
 */
export function useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options: UseFloatingOptions = {}
): FloatingContext {
  const {
    placement: initialPlacement = "bottom",
    strategy: initialStrategy = "absolute",
    transform = true,
    middlewares,
    whileElementsMounted,
    open = ref(false),
    setOpen = (value: boolean) => {
      open.value = value
    },
  } = options

  // Position state
  const x = ref(0)
  const y = ref(0)
  const strategy = ref(toValue(initialStrategy) as Strategy)
  const placement = ref(toValue(initialPlacement) as Placement)

  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  const update = async () => {
    if (!anchorEl.value || !floatingEl.value) return

    const result = await computePosition(anchorEl.value, floatingEl.value, {
      placement: toValue(initialPlacement),
      strategy: toValue(initialStrategy),
      middleware: middlewares,
    })

    x.value = result.x
    y.value = result.y
    placement.value = result.placement
    strategy.value = result.strategy
    middlewareData.value = result.middlewareData
    isPositioned.value = open.value
  }

  watch(
    [() => toValue(initialPlacement), () => toValue(initialStrategy), anchorEl, floatingEl],
    update
  )

  let cleanup: (() => void) | undefined

  watch(
    [anchorEl, floatingEl, open],
    ([anchorEl, floatingEl, open]) => {
      if (!open || !anchorEl || !floatingEl) return

      if (whileElementsMounted) {
        cleanup = whileElementsMounted(anchorEl, floatingEl, update)
      } else {
        cleanup = floatingUIAutoUpdate(anchorEl, floatingEl, update)
      }

      onWatcherCleanup(() => {
        cleanup?.()
        cleanup = undefined
      })
    },
    { immediate: true }
  )

  onScopeDispose(() => cleanup?.())

  // Reset isPositioned when closed
  watch(open, (isOpen) => {
    if (!isOpen) {
      isPositioned.value = false
    }
  })

  const floatingStyles = computed(() => {
    const initialStyles = {
      position: strategy.value,
      left: "0",
      top: "0",
    }

    if (!isPositioned.value || !floatingEl.value) {
      return initialStyles
    }

    const xVal = roundByDPR(floatingEl.value, x.value)
    const yVal = roundByDPR(floatingEl.value, y.value)

    if (transform) {
      return {
        ...initialStyles,
        transform: `translate(${xVal}px, ${yVal}px)`,
        ...(getDPR(floatingEl.value) >= 1.5 && {
          willChange: "transform",
        }),
      }
    }

    return {
      ...initialStyles,
      left: `${xVal}px`,
      top: `${yVal}px`,
    }
  })

  return {
    x,
    y,
    strategy,
    placement,
    middlewareData,
    isPositioned,
    floatingStyles,
    update,
    refs: {
      anchorEl: anchorEl,
      floatingEl: floatingEl,
    },
    open,
    setOpen,
  }
}

//=======================================================================================
// 📌 Utility Functions
//=======================================================================================

/**
 * Auto-update function to use with `whileElementsMounted` option
 *
 * This function provides automatic position updates for floating elements.
 * It's a wrapper around Floating UI's autoUpdate function.
 *
 * @param anchorEl - The anchor element
 * @param floatingEl - The floating element
 * @param update - The update function to call
 * @param options - Additional options for auto-updating
 * @returns A cleanup function to stop auto-updating
 */
export function autoUpdate(
  anchorEl: HTMLElement,
  floatingEl: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {}
) {
  return floatingUIAutoUpdate(anchorEl, floatingEl, update, options)
}
