import { getDPR, roundByDPR } from "@/utils"
import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom"
import { computePosition, autoUpdate as floatingUIAutoUpdate } from "@floating-ui/dom"
import type { ComputedRef, InjectionKey, MaybeRefOrGetter, Ref } from "vue"
import {
  computed,
  inject,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  toRef,
  toValue,
  useId,
  watch,
} from "vue"
import { FLOATING_TREE_INJECTION_KEY } from "./use-floating-tree"
import { arrow, type ArrowContext, type ArrowOptions } from "./use-arrow"

//=======================================================================================
// 📌 Constants
//=======================================================================================

export const ARROW_INJECTION_KEY = Symbol() as InjectionKey<ArrowContext>

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Composable function that provides positioning for a floating element relative to a reference element
 *
 * This composable handles the positioning logic for floating elements (like tooltips, popovers, etc.)
 * relative to their reference elements. It uses Floating UI under the hood and provides reactive
 * positioning data and styles.
 *
 * @param reference - The reference element or a reactive reference to it
 * @param floating - The floating element or a reactive reference to it
 * @param options - Additional options for the floating behavior
 * @returns A FloatingContext object containing positioning data and methods
 *
 * @example
 * ```ts
 * const { floatingStyles, refs } = useFloating(referenceRef, floatingRef, {
 *   placement: 'bottom',
 *   strategy: 'absolute'
 * })
 * ```
 */
export function useFloating(
  reference: Ref<HTMLElement | null>,
  floating: Ref<HTMLElement | null>,
  options: UseFloatingOptions = {}
): FloatingContext {
  const {
    placement: initialPlacement = "bottom",
    strategy: initialStrategy = "absolute",
    transform = true,
    middleware: middlewareOption = [],
    whileElementsMounted,
    nodeId = useId(),
    arrow: withArrow = false,
    open = ref(false),
    onOpenChange = (value: boolean) => {
      open.value = value
    },
  } = options

  // Element refs
  const arrowRef = ref<HTMLElement | null>(null)

  // Position state
  const x = ref(0)
  const y = ref(0)
  const strategy = ref(toValue(initialStrategy) as Strategy)
  const placement = ref(toValue(initialPlacement) as Placement)
  const middleware = computed(() => {
    const middlewares = toValue(middlewareOption)
    return withArrow ? [...middlewares, arrow({ element: arrowRef })] : middlewares
  })

  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  const update = async () => {
    if (!reference.value || !floating.value) return

    const result = await computePosition(reference.value, floating.value, {
      placement: toValue(initialPlacement),
      strategy: toValue(initialStrategy),
      middleware: middleware.value,
    })

    x.value = Math.round(result.x)
    y.value = Math.round(result.y)
    placement.value = result.placement
    strategy.value = result.strategy
    middlewareData.value = result.middlewareData
    isPositioned.value = open.value
  }

  watch(
    [
      () => toValue(initialPlacement),
      () => toValue(initialStrategy),
      middleware,
      reference,
      floating,
    ],
    update
  )

  let cleanup: (() => void) | undefined

  watch(
    [reference, floating, open],
    ([reference, floating, isOpen]) => {
      cleanup?.()
      cleanup = undefined

      if (!isOpen || !reference || !floating) return

      if (whileElementsMounted) {
        cleanup = whileElementsMounted(reference, floating, update)
      } else {
        cleanup = floatingUIAutoUpdate(reference, floating, update)
      }
    },
    { immediate: true }
  )

  // Handle floating tree for nested elements
  if (nodeId) {
    const floatingTree = inject(FLOATING_TREE_INJECTION_KEY, null)

    if (floatingTree) {
      // Create a simplified context with only the necessary properties for the tree
      const treeNodeContext = {
        refs: { reference: reference, floating: floating },
        x,
        y,
        strategy,
        placement,
        middlewareData,
        isPositioned,
      } as FloatingContext

      // Register the node in the tree
      if (!floatingTree.nodesRef.value.some((n) => n.id === nodeId)) {
        floatingTree.nodesRef.value.push({
          id: nodeId,
          parentId: null,
          context: treeNodeContext,
        })
      }

      // Cleanup when the component is unmounted
      onScopeDispose(() => {
        floatingTree.nodesRef.value = floatingTree.nodesRef.value.filter((n) => n.id !== nodeId)
      })
    }
  }

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

    if (!isPositioned.value || !floating.value) {
      return initialStyles
    }

    if (transform) {
      const xVal = roundByDPR(floating.value, x.value)
      const yVal = roundByDPR(floating.value, y.value)

      return {
        ...initialStyles,
        transform: `translate(${xVal}px, ${yVal}px)`,
        ...(getDPR(floating.value) >= 1.5 && {
          willChange: "transform",
        }),
      }
    }

    return {
      ...initialStyles,
      left: `${Math.round(x.value)}px`,
      top: `${Math.round(y.value)}px`,
    }
  })

  // Provide arrow context only if arrow is enabled
  if (withArrow) {
    provide(ARROW_INJECTION_KEY, {
      arrowRef,
      middlewareData,
      placement,
    })
  }

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
      reference: reference,
      floating: floating,
      arrow: arrowRef,
    },
    open,
    onOpenChange,
    arrowContext: ARROW_INJECTION_KEY,
  }
}

/**
 * Auto-update function to use with `whileElementsMounted` option
 *
 * This function provides automatic position updates for floating elements.
 * It's a wrapper around Floating UI's autoUpdate function.
 *
 * @param reference - The reference element
 * @param floating - The floating element
 * @param update - The update function to call
 * @param options - Additional options for auto-updating
 * @returns A cleanup function to stop auto-updating
 */
export function autoUpdate(
  reference: HTMLElement,
  floating: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {}
) {
  return floatingUIAutoUpdate(reference, floating, update, options)
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * CSS styles for positioning floating elements
 */
export interface FloatingStyles {
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
   * Where to place the floating element relative to its reference element.
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
  middleware?: Ref<Middleware[]>

  /**
   * Function called when both the reference and floating elements are mounted.
   */
  whileElementsMounted?: (
    reference: HTMLElement,
    floating: HTMLElement,
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
  onOpenChange?: (open: boolean) => void

  /**
   * Unique ID for this floating element, used in floating tree context.
   */
  nodeId?: string

  /**
   * Root context for the floating element tree.
   */
  rootContext?: Partial<FloatingContext>

  /**
   * Whether to enable the arrow middleware.
   * @default false
   */
  arrow?: boolean
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
   * The refs object containing reference to reference and floating elements
   */
  refs: {
    reference: Ref<HTMLElement | null>
    floating: Ref<HTMLElement | null>
    arrow: Ref<HTMLElement | null>
  }

  /**
   * Whether the floating element is open
   */
  open: Readonly<Ref<boolean>>

  /**
   * Function to update the open state
   */
  onOpenChange: (open: boolean) => void

  /**
   * FloatingArrow context key
   */
  arrowContext: InjectionKey<ArrowContext>
}
