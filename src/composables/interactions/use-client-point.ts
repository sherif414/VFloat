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
 * ```
 */
export function useClientPoint(
  context: FloatingContext,
  options: UseClientPointOptions = {}
): void {
  const { open, refs } = context
  const setPositionReference = (reference: VirtualElement | HTMLElement | null) => {
    refs.reference.value = reference
  }

  const { enabled = true, axis = "both", x: externalX = null, y: externalY = null } = options

  // Tracking state
  let stopPointerMoveListener: (() => void) | null = null
  const pointerType = ref<PointerType | undefined>()
  const clientCoords = ref<{ x: number | null; y: number | null }>({ x: null, y: null })
  const isMoving = ref(false)

  // Computed options
  const isEnabled = computed(() => toValue(enabled))
  const currentAxis = computed(() => toValue(axis))
  const controlledX = computed(() => toValue(externalX))
  const controlledY = computed(() => toValue(externalY))

  const referenceEl = computed(() =>
    refs.reference.value instanceof HTMLElement ? refs.reference.value : null
  )

  //=======================================================================================
  // Core Functions
  //=======================================================================================

  function createVirtualElement(): VirtualElement {
    let offsetX: number | null = null
    let offsetY: number | null = null
    const domElement = referenceEl.value

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

        const isXAxis = currentAxis.value === "x" || currentAxis.value === "both"
        const isYAxis = currentAxis.value === "y" || currentAxis.value === "both"

        // Calculate coordinates
        let width = 0
        let height = 0
        let x = domRect.x
        let y = domRect.y

        if (domElement) {
          if (offsetX == null && clientCoords.value.x != null && isXAxis) {
            offsetX = domRect.x - clientCoords.value.x
          }
          if (offsetY == null && clientCoords.value.y != null && isYAxis) {
            offsetY = domRect.y - clientCoords.value.y
          }
          x -= offsetX || 0
          y -= offsetY || 0
        }

        // Apply axis locking
        if (isXAxis && clientCoords.value.x != null) {
          x = clientCoords.value.x
        } else {
          offsetX = null
          width = domRect.width
        }

        if (isYAxis && clientCoords.value.y != null) {
          y = clientCoords.value.y
        } else {
          offsetY = null
          height = domRect.height
        }

        if (currentAxis.value === "both") {
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

  const setPointerType = (event: PointerEvent) => {
    pointerType.value = event.pointerType as PointerType
  }

  const handlePointerMove = (event: PointerEvent | MouseEvent) => {
    if (!isEnabled.value || controlledX.value != null || controlledY.value != null) return

    clientCoords.value = {
      x: event.clientX,
      y: event.clientY,
    }

    if (open.value) {
      setPositionReference(createVirtualElement())
    }
  }

  const handleReferenceEnterOrMove = (event: MouseEvent) => {
    if (!isEnabled.value || controlledX.value != null || controlledY.value != null) return

    if (!open.value && isMouseLikePointerType(pointerType.value, true)) {
      clientCoords.value = {
        x: event.clientX,
        y: event.clientY,
      }
      setPositionReference(createVirtualElement())
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
    if (!isEnabled.value || controlledX.value != null || controlledY.value != null || !open.value)
      return

    if (isMouseLikePointerType(pointerType.value, true)) {
      stopPointerMoveListener = useEventListener(window, "pointermove", handleWindowPointerMove, {
        passive: true,
      })
      isMoving.value = true
    } else {
      setPositionReference(referenceEl.value)
    }
  }

  const cleanup = () => {
    stopPointerMoveListener?.()
    stopPointerMoveListener = null
    isMoving.value = false
  }

  watch(
    [controlledX, controlledY, isEnabled],
    ([x, y, enabled]) => {
      if (enabled && x != null && y != null) {
        clientCoords.value = { x, y }
        setPositionReference(createVirtualElement())
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
          setPositionReference(createVirtualElement())
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
      setPositionReference(referenceEl.value)
      if (controlledX.value == null && controlledY.value == null) {
        clientCoords.value = { x: null, y: null }
      }
    } else if (open.value) {
      if (clientCoords.value.x != null || clientCoords.value.y != null) {
        setPositionReference(createVirtualElement())
      }
      startPointerMoveListener()
    }
  })

  onScopeDispose(cleanup)

  watch(referenceEl, (el) => {
    if (!el) return

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

  const onPointerdown = (e: PointerEvent) => {
    if (!isEnabled.value) return
    setPointerType(e)
    if (controlledX.value == null && controlledY.value == null) {
      handlePointerMove(e)
    }
  }
  const onPointerenter = (e: PointerEvent) => {
    if (!isEnabled.value) return
    setPointerType(e)
    handleReferenceEnterOrMove(e)
  }
  const onMousemove = (e: MouseEvent) => {
    if (!isEnabled.value) return
    handleReferenceEnterOrMove(e)
  }
  const onMouseenter = (e: MouseEvent) => {
    if (!isEnabled.value) return
    handleReferenceEnterOrMove(e)
  }
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

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

export interface ClientPointReferenceProps {
  onPointerdown: (event: PointerEvent) => void
  onPointerenter: (event: PointerEvent) => void
  onMousemove: (event: MouseEvent) => void
  onMouseenter: (event: MouseEvent) => void
}
