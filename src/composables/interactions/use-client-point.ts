import { type PointerType, useEventListener } from "@vueuse/core"
import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onScopeDispose,
  onWatcherCleanup,
  ref,
  toValue,
  watch,
  watchEffect,
} from "vue"
import type { FloatingContext } from "../use-floating"
import type { VirtualElement } from "@floating-ui/dom"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Positions the floating element relative to a client point (mouse position).
 *
 * This composable tracks pointer movements and positions the floating element
 * accordingly, with options for axis locking and controlled coordinates.
 *
 * @param context - The floating context with open state and position reference
 * @param options - Configuration options for client point behavior
 *
 * @example
 * ```ts
 * const context = useFloating(...)
 * const { getReferenceProps } = useClientPoint(context, {
 *   axis: "x",
 *   enabled: true
 * })
 * const { coordinates, isActive } = useClientPoint(context)
 * ```
 */
export function useClientPoint(
  context: FloatingContext,
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const { open, refs } = context

  const { enabled = true, axis = "both", x: externalX = null, y: externalY = null } = options

  // Tracking state
  let stopPointerMoveListener: (() => void) | null = null
  const isActive = ref(false)
  const pointerType = ref<PointerType | undefined>()
  const clientCoords = ref<{ x: number | null; y: number | null }>({ x: null, y: null })
  const isMoving = ref(false)
  const debug = ref(false)

  // Computed options
  const isEnabled = computed(() => toValue(enabled))
  const currentAxis = computed(() => toValue(axis))
  const controlledX = computed(() => toValue(externalX))
  const controlledY = computed(() => toValue(externalY))
  const referenceEl = computed(() =>
    refs.reference.value instanceof HTMLElement ? refs.reference.value : null
  )

  const handlePointerMove = (event: PointerEvent | MouseEvent) => {
    if (controlledX.value != null || controlledY.value != null) return

    clientCoords.value = {
      x: event.clientX,
      y: event.clientY,
    }

    if (open.value) {
      refs.reference.value = createVirtualElement(
        referenceEl.value,
        currentAxis.value,
        clientCoords.value
      )
    }
  }

  const handleReferenceEnterOrMove = (event: MouseEvent) => {
    if (controlledX.value != null || controlledY.value != null) return

    if (!open.value && isMouseLikePointerType(pointerType.value, true)) {
      clientCoords.value = {
        x: event.clientX,
        y: event.clientY,
      }
      refs.reference.value = createVirtualElement(
        referenceEl.value,
        currentAxis.value,
        clientCoords.value
      )
    }

    if (open.value && !isMoving.value) {
      startPointerMoveListener()
    }
  }

  const handleWindowPointerMove = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null
    if (contains(refs.floating.value, target)) {
      stopPointerMoveListener?.()
      isMoving.value = false
    } else {
      handlePointerMove(event)
    }
  }

  const startPointerMoveListener = () => {
    if (controlledX.value != null || controlledY.value != null || !open.value) return

    if (isMouseLikePointerType(pointerType.value, true)) {
      stopPointerMoveListener = useEventListener(window, "pointermove", handleWindowPointerMove, {
        passive: true,
      })
      isMoving.value = true
      isActive.value = true
    } else {
      refs.reference.value = referenceEl.value
    }
  }

  const cleanup = () => {
    stopPointerMoveListener?.()
    stopPointerMoveListener = null
    isMoving.value = false
    isActive.value = false
  }

  watch(
    [controlledX, controlledY, isEnabled],
    ([x, y, enabled]) => {
      if (enabled && x != null && y != null) {
        clientCoords.value = { x, y }
        refs.reference.value = createVirtualElement(
          referenceEl.value,
          currentAxis.value,
          clientCoords.value
        )
        cleanup()
      } else if (enabled && open.value) {
        startPointerMoveListener()
      }
    },
    { immediate: true }
  )

  watch(
    open,
    (isOpen) => {
      if (!isEnabled.value) return

      if (isOpen) {
        if (clientCoords.value.x != null || clientCoords.value.y != null) {
          refs.reference.value = createVirtualElement(
            referenceEl.value,
            currentAxis.value,
            clientCoords.value
          )
        }
        startPointerMoveListener()
      } else {
        cleanup()
        if (controlledX.value == null && controlledY.value == null) {
          clientCoords.value = { x: null, y: null }
        }
      }
    },
    { flush: "post" }
  )

  watch(isEnabled, (enabled) => {
    if (!enabled) {
      cleanup()
      refs.reference.value = referenceEl.value
      if (controlledX.value == null && controlledY.value == null) {
        clientCoords.value = { x: null, y: null }
      }
    } else if (open.value) {
      if (clientCoords.value.x != null || clientCoords.value.y != null) {
        refs.reference.value = createVirtualElement(
          referenceEl.value,
          currentAxis.value,
          clientCoords.value
        )
      }
      startPointerMoveListener()
    }
  })

  const onPointerdown = (e: PointerEvent) => {
    pointerType.value = e.pointerType as PointerType
    if (controlledX.value == null && controlledY.value == null) {
      handlePointerMove(e)
    }
  }
  const onPointerenter = (e: PointerEvent) => {
    pointerType.value = e.pointerType as PointerType
    handleReferenceEnterOrMove(e)
  }
  const onMousemove = (e: MouseEvent) => {
    handleReferenceEnterOrMove(e)
  }
  const onMouseenter = (e: MouseEvent) => {
    handleReferenceEnterOrMove(e)
  }

  watchEffect(() => {
    const el = referenceEl.value
    if (!el || !isEnabled.value) return

    el.addEventListener("pointerenter", onPointerenter)
    el.addEventListener("pointerdown", onPointerdown)
    el.addEventListener("mouseenter", onMouseenter)
    el.addEventListener("mousemove", onMousemove)

    onWatcherCleanup(() => {
      el?.removeEventListener("pointerenter", onPointerenter)
      el?.removeEventListener("pointerdown", onPointerdown)
      el?.removeEventListener("mouseenter", onMouseenter)
      el?.removeEventListener("mousemove", onMousemove)
    })
  })

  onScopeDispose(cleanup)

  const updatePosition = (x: number, y: number) => {
    clientCoords.value = { x, y }
    refs.reference.value = createVirtualElement(
      referenceEl.value,
      currentAxis.value,
      clientCoords.value
    )
  }

  return {
    cleanup,
    coordinates: clientCoords,
    isActive,
    debug,
    updatePosition,
  }
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Creates a virtual element based on client coordinates and axis constraints.
 * @param referenceEl - The DOM element used as context, if available.
 * @param currentAxis - The axis ('x', 'y', 'both') to consider for positioning.
 * @param clientCoords - The current client coordinates (x, y).
 * @returns A VirtualElement object for Floating UI.
 */
function createVirtualElement(
  referenceEl: HTMLElement | null,
  currentAxis: "x" | "y" | "both",
  clientCoords: { x: number | null; y: number | null }
): VirtualElement {
  let offsetX: number | null = null
  let offsetY: number | null = null
  const domElement = referenceEl

  return {
    contextElement: domElement || undefined,
    getBoundingClientRect: () => {
      const domRect = domElement?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }

      const isXAxis = currentAxis === "x" || currentAxis === "both"
      const isYAxis = currentAxis === "y" || currentAxis === "both"

      // Calculate coordinates
      let width = 0
      let height = 0
      let x = domRect.x
      let y = domRect.y

      if (domElement) {
        if (offsetX == null && clientCoords.x != null && isXAxis) {
          offsetX = domRect.x - clientCoords.x
        }
        if (offsetY == null && clientCoords.y != null && isYAxis) {
          offsetY = domRect.y - clientCoords.y
        }
        x -= offsetX || 0
        y -= offsetY || 0
      }

      // Apply axis locking
      if (isXAxis && clientCoords.x != null) {
        x = clientCoords.x
      } else {
        offsetX = null
        width = domRect.width
      }

      if (isYAxis && clientCoords.y != null) {
        y = clientCoords.y
      } else {
        offsetY = null
        height = domRect.height
      }

      if (currentAxis === "both") {
        width = 0
        height = 0
      }

      return {
        width,
        height,
        x,
        y,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
      }
    },
  }
}

function contains(parent: HTMLElement | null, child: HTMLElement | null): boolean {
  if (!parent || !child) return false
  if (parent.contains(child)) return true

  const rootNode = child.getRootNode()
  if (rootNode instanceof ShadowRoot && rootNode.host === parent) return true

  let node: Node | null = child
  while (node) {
    if (node === parent) return true
    node = node.parentNode
  }

  return false
}

function isMouseLikePointerType(pointerType: PointerType | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false
  const isMouse = pointerType === "mouse"
  return strict ? isMouse : isMouse || pointerType === "pen"
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseClientPointOptions {
  /**
   * Whether the Hook is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to restrict the client point to an axis
   * @default 'both'
   */
  axis?: MaybeRefOrGetter<"x" | "y" | "both">

  /**
   * Controlled x coordinate
   * @default null
   */
  x?: MaybeRefOrGetter<number | null>

  /**
   * Controlled y coordinate
   * @default null
   */
  y?: MaybeRefOrGetter<number | null>
}

export interface UseClientPointReturn {
  /**
   * Function to manually clean up event listeners and reset state
   */
  cleanup: () => void
  /**
   * Reactive object containing the current client coordinates (x/y)
   */
  coordinates: Ref<{ x: number | null; y: number | null }>
  /**
   * Whether the pointer tracking is currently active
   */
  isActive: Ref<boolean>
  /**
   * Whether debug logging is enabled
   */
  debug: Ref<boolean>
  /**
   * Function to manually update the floating element's position
   */
  updatePosition: (x: number, y: number) => void
}
