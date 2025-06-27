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
  // biome-ignore lint/suspicious/noExplicitAny:
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
   * Function to control the open state of the floating element. If not provided, a default function is used that updates the `open` ref.
   */
  setOpen?: (open: boolean) => void
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
    whileElementsMounted,
    open = ref(false),
    setOpen = (value: boolean) => {
      open.value = value
    },
  } = options

  const initialPlacement = computed(() => toValue(options.placement) ?? "bottom")
  const initialStrategy = computed(() => toValue(options.strategy) ?? "absolute")

  // Position state
  const x = ref(0)
  const y = ref(0)
  const placement = ref(initialPlacement.value)
  const strategy = ref(initialStrategy.value)

  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  const update = async () => {
    if (!anchorEl.value || !floatingEl.value) return

    const result = await computePosition(anchorEl.value, floatingEl.value, {
      placement: initialPlacement.value,
      strategy: initialStrategy.value,
      middleware: middlewares,
    })

    x.value = result.x
    y.value = result.y
    placement.value = result.placement
    strategy.value = result.strategy
    middlewareData.value = result.middlewareData
    isPositioned.value = open.value
  }

  watch([initialPlacement, initialStrategy], () => {
    if (open.value) {
      update()
    }
  })

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
