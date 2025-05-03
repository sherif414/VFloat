import type { PointerType } from "@vueuse/core"
import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  type Ref,
  ref,
  toValue,
  watch,
  watchEffect,
} from "vue"
import type { FloatingContext } from "@/composables"
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
 * @param pointerTarget - The DOM element whose bounding box is used as the reference for pointer event listeners and initial positioning.
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
 * const { coordinates } = useClientPoint(context)
 * ```
 */
export function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: FloatingContext,
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const { open, refs } = context

  // Tracking state
  let pointerType: PointerType | undefined = undefined
  const clientCoords = ref<{ x: number | null; y: number | null }>({ x: null, y: null })

  // Computed options
  const axis = computed(() => toValue(options.axis ?? "both"))
  const enabled = computed(() => toValue(options.enabled ?? true))
  const externalX = computed(() => toValue(options.x ?? null))
  const externalY = computed(() => toValue(options.y ?? null))

  const updateCoords = (newX: number, newY: number) => {
    clientCoords.value = {
      x: newX,
      y: newY,
    }

    if (open.value) {
      refs.reference.value = createVirtualElement(
        pointerTarget.value,
        axis.value,
        clientCoords.value
      )
    }
  }

  watchEffect(() => {
    const x = externalX.value
    const y = externalY.value
    
    if (enabled.value && x != null && y != null) {
      updateCoords(x, y)
    }
  })

  const onPointerdown = (e: PointerEvent) => {
    pointerType = e.pointerType as PointerType
    updateCoords(e.clientX, e.clientY)
  }

  const onPointerenter = (e: PointerEvent) => {
    pointerType = e.pointerType as PointerType

    if (!open.value && isMouseLikePointerType(pointerType, true)) {
      updateCoords(e.clientX, e.clientY)
    }
  }

  const onPointermove = (e: MouseEvent) => {
    if (open.value && isMouseLikePointerType(pointerType, true)) {
      updateCoords(e.clientX, e.clientY)
    }
  }

  watchEffect(() => {
    if (externalX.value != null || externalY.value != null) return
    const el = pointerTarget.value
    if (!el || !enabled.value) return

    el.addEventListener("pointerenter", onPointerenter)
    el.addEventListener("pointerdown", onPointerdown)
    el.addEventListener("pointermove", onPointermove)

    onWatcherCleanup(() => {
      el?.removeEventListener("pointerenter", onPointerenter)
      el?.removeEventListener("pointerdown", onPointerdown)
      el?.removeEventListener("pointermove", onPointermove)
    })
  })

  return {
    coordinates: clientCoords,
    updatePosition: updateCoords,
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
   * Reactive object containing the current client coordinates (x/y)
   */
  coordinates: Ref<{ x: number | null; y: number | null }>
  /**
   * Function to manually update the floating element's position
   */
  updatePosition: (x: number, y: number) => void
}
