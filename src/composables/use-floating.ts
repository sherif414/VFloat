import { getDPR, roundByDPR } from "@/utils"
import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Padding,
  Placement,
  Strategy,
} from "@floating-ui/dom"
import {
  arrow as FloatingUIArrow,
  computePosition,
  autoUpdate as floatingUIAutoUpdate,
} from "@floating-ui/dom"
import type { ComputedRef, InjectionKey, MaybeRefOrGetter, Ref } from "vue"
import {
  computed,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  toRef,
  toValue,
  watch,
  inject,
} from "vue"

/**
 * Provides positioning for a floating element relative to a reference element
 * @param reference The reference element or a reactive reference to it
 * @param floating The floating element or a reactive reference to it
 * @param options Additional options for the floating behavior
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
    open: controlledOpen,
    onOpenChange,
    nodeId,
    arrow: useArrow = false,
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
    return useArrow ? [...middlewares, arrow({ element: arrowRef })] : middlewares
  })

  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  // Open state handling
  const internalOpen = ref(toValue(controlledOpen) ?? false)
  const open = controlledOpen ? toRef(controlledOpen) : internalOpen

  // Update function
  const update = async () => {
    if (!reference.value || !floating.value) return

    const result = await computePosition(reference.value, floating.value, {
      placement: toValue(initialPlacement),
      strategy: toValue(initialStrategy),
      middleware: middleware.value,
    })

    x.value = result.x
    y.value = result.y
    placement.value = result.placement
    strategy.value = result.strategy
    middlewareData.value = result.middlewareData
    isPositioned.value = open.value
  }

  // Watch for changes that should trigger an update
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

  // Auto-update when both elements are mounted and open
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
    const floatingTree = inject(FloatingTreeContext, null)

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

  // Cleanup on scope dispose
  onScopeDispose(() => cleanup?.())

  // Reset isPositioned when closed
  watch(open, (isOpen) => {
    if (!isOpen) {
      isPositioned.value = false
    }
  })

  // Handle controlled open state
  const handleOpenChange = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      internalOpen.value = value
    }
  }

  // Computed floating styles
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
      left: `${x.value}px`,
      top: `${y.value}px`,
    }
  })

  // Provide arrow context only if arrow is enabled
  if (useArrow) {
    provide(ARROW_CONTEXT, {
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
    onOpenChange: handleOpenChange,
    arrowContext: ARROW_CONTEXT,
  }
}

/**
 * Auto-update function to use with `whileElementsMounted` option
 */
export function autoUpdate(
  reference: HTMLElement,
  floating: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {}
) {
  return floatingUIAutoUpdate(reference, floating, update, options)
}

export interface ArrowOptions {
  padding?: Padding
  element: Ref<HTMLElement | null>
}

/**
 * Positions an inner element of the floating element such that it is centered to the reference element.
 * @param options The arrow options.
 * @see https://floating-ui.com/docs/arrow
 */
export function arrow(options: ArrowOptions): Middleware {
  return {
    name: "arrow",
    options,
    fn(args) {
      const element = toValue(options.element)

      if (element == null) {
        return {}
      }

      return FloatingUIArrow({ element, padding: options.padding }).fn(args)
    },
  }
}

/**
 * Creates a floating tree context for managing nested floating elements
 */
export function useFloatingTree(): FloatingTreeType {
  const tree = inject(FloatingTreeContext, null)
  if (tree) return tree

  // Use type assertion to fix the type error
  const treeData: FloatingTreeData = {
    nodesRef: ref([]),
    parent: ref(null),
  }

  provide(FloatingTreeContext, treeData)

  return treeData
}

// types

export interface ArrowContext extends Pick<FloatingContext, "middlewareData" | "placement"> {
  arrowRef: Ref<HTMLElement | SVGAElement | null>
}

export interface FloatingStyles {
  position: Strategy
  top: string
  left: string
  transform?: string
  "will-change"?: "transform"
}

export interface FloatingTreeData {
  nodesRef: Ref<Array<{ id: string; parentId: string | null; context: FloatingContext | null }>>
  parent: Ref<HTMLElement | null>
  nodeId?: string
}

export type FloatingTreeType = FloatingTreeData | null

export const FloatingTreeContext = Symbol("FloatingTree") as InjectionKey<FloatingTreeType>
export const ARROW_CONTEXT = Symbol("ArrowContext") as InjectionKey<ArrowContext>

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
   * Whether to use CSS transform instead of top/left positioning
   * @default true
   */
  transform?: MaybeRefOrGetter<boolean | undefined>

  /**
   * Middlewares modify the positioning coordinates in some fashion, or provide useful data for the consumer to use.
   */
  middleware?: Ref<Middleware[]>

  /**
   * Function called when both the reference and floating elements are mounted
   */
  whileElementsMounted?: (
    reference: HTMLElement,
    floating: HTMLElement,
    update: () => void
  ) => undefined | (() => void)

  /**
   * Whether the floating element is open
   * @default false
   */
  open?: Ref<boolean>

  /**
   * Function called when the open state changes
   */
  onOpenChange?: (open: boolean) => void

  /**
   * Unique ID for this floating element, used in floating tree context
   */
  nodeId?: string

  /**
   * Root context for the floating element tree
   */
  rootContext?: Partial<FloatingContext>

  /**
   * Whether to enable the arrow middleware
   * @default false
   */
  arrow?: boolean
}

export interface FloatingContext {
  /** The x-coordinate of the floating element */
  x: Readonly<Ref<number>>

  /** The y-coordinate of the floating element */
  y: Readonly<Ref<number>>

  /** The strategy used for positioning */
  strategy: Readonly<Ref<Strategy>>

  /** The placement of the floating element */
  placement: Readonly<Ref<Placement>>

  /** Data from middleware for additional customization */
  middlewareData: Readonly<Ref<MiddlewareData>>

  /** Whether the floating element has been positioned */
  isPositioned: Readonly<Ref<boolean>>

  /** Computed styles to apply to the floating element */
  floatingStyles: ComputedRef<FloatingStyles>

  /** Function to manually update the position */
  update: () => void

  /** The refs object containing reference to reference and floating elements */
  refs: {
    reference: Ref<HTMLElement | null>
    floating: Ref<HTMLElement | null>
    arrow: Ref<HTMLElement | null>
  }

  /** Whether the floating element is open */
  open: Readonly<Ref<boolean>>

  /** Function to update the open state */
  onOpenChange: (open: boolean) => void

  /** FloatingArrow context key */
  arrowContext: InjectionKey<ArrowContext>
}
