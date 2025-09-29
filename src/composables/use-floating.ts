import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
  VirtualElement,
} from "@floating-ui/dom"
import { computePosition, autoUpdate as floatingUIAutoUpdate } from "@floating-ui/dom"
import type { MaybeRefOrGetter, Ref } from "vue"
import { computed, onScopeDispose, onWatcherCleanup, ref, shallowRef, toValue, watch } from "vue"
import { arrow } from "./middlewares/arrow"

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
export type FloatingStyles = {
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
  "will-change"?: string
} & {
  // This index signature makes the type compatible with Vue's `StyleValue`
  // biome-ignore lint/suspicious/noExplicitAny: <workaround>
  [key: `--${string}`]: any
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
  middlewares?: MaybeRefOrGetter<Middleware[]>

  /**
   * Whether to automatically update the position of the floating element.
   * Can be a boolean or an `AutoUpdateOptions` object.
   * @default true
   */
  autoUpdate?: boolean | AutoUpdateOptions

  /**
   * Whether the floating element is open.
   * @default false
   */
  open?: Ref<boolean>
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
   * Reactive styles to apply to the floating element
   */
  floatingStyles: Readonly<Ref<FloatingStyles>>

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
    arrowEl: Ref<HTMLElement | null>
  }

  /**
   * Whether the floating element is open
   */
  open: Readonly<Ref<boolean>>

  /**
   * Function to explicitly set the open state of the floating element.
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
    transform = true,
    middlewares,
    autoUpdate: autoUpdateOptions = true,
    open = ref(false),
  } = options

  const setOpen = (value: boolean) => {
    open.value = value
  }

  const initialPlacement = computed(() => toValue(options.placement) ?? "bottom")
  const initialStrategy = computed(() => toValue(options.strategy) ?? "absolute")

  // Position state
  const x = ref(0)
  const y = ref(0)
  const placement = ref(initialPlacement.value)
  const strategy = ref(initialStrategy.value)

  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  // Arrow element ref for useArrow composable
  const arrowEl = ref<HTMLElement | null>(null)

  // Reactive middleware array that includes arrow middleware when arrowEl is set
  const reactiveMiddlewares = computed(() => {
    const baseMiddlewares = toValue(middlewares) || []
    if (arrowEl.value) {
      // Check if arrow middleware already exists
      const hasArrow = baseMiddlewares.some((m) => m.name === "arrow")
      if (!hasArrow) {
        return [...baseMiddlewares, arrow({ element: arrowEl })]
      }
    }
    return baseMiddlewares
  })

  const update = async () => {
    if (!anchorEl.value || !floatingEl.value) return

    const result = await computePosition(anchorEl.value, floatingEl.value, {
      placement: initialPlacement.value,
      strategy: initialStrategy.value,
      middleware: reactiveMiddlewares.value,
    })

    x.value = result.x
    y.value = result.y
    placement.value = result.placement
    strategy.value = result.strategy
    middlewareData.value = result.middlewareData
    isPositioned.value = open.value
  }

  watch([initialPlacement, initialStrategy, reactiveMiddlewares], () => {
    if (open.value) {
      update()
    }
  })

  let cleanup: (() => void) | undefined

  watch(
    [anchorEl, floatingEl, open],
    ([anchorEl, floatingEl, open]) => {
      if (!open || !anchorEl || !floatingEl) return

      if (autoUpdateOptions) {
        cleanup = floatingUIAutoUpdate(
          anchorEl,
          floatingEl,
          update,
          typeof autoUpdateOptions === "object" ? autoUpdateOptions : undefined
        )
      }

      onWatcherCleanup(() => {
        cleanup?.()
        cleanup = undefined
      })
    },
    { immediate: true }
  )

  onScopeDispose(() => cleanup?.())

  watch(open, (isOpen) => {
    if (!isOpen) {
      isPositioned.value = false
    }
  })

  const floatingStyles: Ref<FloatingStyles> = ref({
    position: initialStrategy.value,
    left: "0",
    top: "0",
  })

  watch(
    [x, y, () => toValue(transform)],
    ([xVal, yVal, useTransformVal]) => {
      const floatingElVal = floatingEl.value
      if (!floatingElVal) return

      const initialStyles = {
        position: strategy.value,
        left: "0",
        top: "0",
      }

      const roundedX = roundByDPR(floatingElVal, xVal)
      const roundedY = roundByDPR(floatingElVal, yVal)

      if (useTransformVal) {
        floatingStyles.value = {
          ...initialStyles,
          transform: `translate(${roundedX}px, ${roundedY}px)`,
          ...(getDPR(floatingElVal) >= 1.5 && {
            "will-change": "transform",
          }),
        }
      } else {
        floatingStyles.value = {
          ...initialStyles,
          left: `${roundedX}px`,
          top: `${roundedY}px`,
        }
      }
    },
    { immediate: true }
  )

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
      arrowEl: arrowEl,
    },
    open,
    setOpen,
  }
}

//=======================================================================================
// 📌 Utility Functions
//=======================================================================================

/**
 * Rounds a value based on the device pixel ratio
 */
function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el)
  return Math.round(value * dpr) / dpr
}

/**
 * Gets the device pixel ratio for an element
 */
function getDPR(el: HTMLElement) {
  if (typeof window === "undefined") return 1
  const win = el.ownerDocument.defaultView || window
  return win.devicePixelRatio || 1
}
