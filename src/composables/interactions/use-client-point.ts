import type { VirtualElement } from "@floating-ui/dom"
import type { PointerType } from "@vueuse/core"
import type { FloatingContext } from "@/composables"
import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  readonly,
  type Ref,
  ref,
  toValue,
  watch,
  watchEffect,
} from "vue"
import { isMouseLikePointerType } from "./utils"

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
 * useClientPoint(context, {
 *   axis: "x",
 *   enabled: true
 * })
 * ```
 */
export function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: FloatingContext,
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const { open, refs } = context

  // State
  const clientCoords = ref<{ x: number | null; y: number | null }>({ x: null, y: null })
  let pointerType: PointerType | undefined

  // Last known coordinates from any pointer movement. Ideal for hover-delay.
  let lastPointerCoords: { x: number; y: number } | null = null
  // High-priority coordinates from a trigger event like a click. Ideal for context menus.
  let triggerCoords: { x: number; y: number } | null = null

  // Computed options
  const axis = computed(() => toValue(options.axis ?? "both"))
  const enabled = computed(() => toValue(options.enabled ?? true))
  const externalX = computed(() => toValue(options.x ?? null))
  const externalY = computed(() => toValue(options.y ?? null))
  const trackingMode = computed(() => toValue(options.trackingMode ?? "follow"))

  const setPosition = (x: number | null, y: number | null) => {
    clientCoords.value = { x, y }

    if (open.value && x != null && y != null) {
      refs.anchorEl.value = createVirtualElement(pointerTarget.value, axis.value, { x, y })
    }
  }

  // Handle controlled coordinates
  watch(
    [externalX, externalY, enabled],
    ([x, y, isEnabled]) => {
      if (isEnabled && x != null && y != null) {
        setPosition(x, y)
      }
    },
    { immediate: true }
  )

  // Core logic for opening/closing
  watch(open, (isOpen) => {
    if (!enabled.value || (externalX.value != null && externalY.value != null)) {
      return
    }

    if (isOpen) {
      if (trackingMode.value === "static") {
        // 1. Prioritize coordinates from a recent trigger event (the click)
        // 2. Fall back to the last known position (the hover)

        const coordsToUse = triggerCoords ?? lastPointerCoords
        if (coordsToUse) {
          setPosition(coordsToUse.x, coordsToUse.y)
        }
      }
    } else {
      // When closing, reset everything
      clientCoords.value = { x: null, y: null }
      triggerCoords = null
    }
  })

  // --- Event Listeners ---

  const onPointerdown = (e: PointerEvent) => {
    pointerType = e.pointerType as PointerType
    const coords = { x: e.clientX, y: e.clientY }
    lastPointerCoords = coords

    if (trackingMode.value === "static") {
      // This is a potential trigger event. Store its coordinates.
      triggerCoords = coords
    } else {
      // 'follow' mode
      setPosition(coords.x, coords.y)
    }
  }

  const onPointerenter = (e: PointerEvent) => {
    pointerType = e.pointerType as PointerType
    updateLastPointerCoords(e)
  }

  const onPointermove = (e: PointerEvent) => {
    updateLastPointerCoords(e)

    // A move event invalidates a previous click trigger.
    // This makes the logic default back to standard hover tracking.
    triggerCoords = null

    if (
      open.value &&
      isMouseLikePointerType(pointerType, true) &&
      trackingMode.value === "follow"
    ) {
      setPosition(e.clientX, e.clientY)
    }
  }

  const updateLastPointerCoords = (e: PointerEvent) => {
    lastPointerCoords = { x: e.clientX, y: e.clientY }
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
    coordinates: readonly(clientCoords),
    updatePosition: (x: number, y: number) => setPosition(x, y),
  }
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Creates a virtual element based on client coordinates and axis constraints.
 * @param referenceEl - The DOM element used as fallback context, if available.
 * @param currentAxis - The axis ('x', 'y', 'both') to consider for positioning.
 * @param clientCoords - The current client coordinates (x, y).
 * @returns A VirtualElement object for Floating UI.
 */
function createVirtualElement(
  referenceEl: HTMLElement | null,
  currentAxis: "x" | "y" | "both",
  clientCoords: { x: number | null; y: number | null }
): VirtualElement {
  const domRect = referenceEl?.getBoundingClientRect() ?? {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }

  return {
    contextElement: referenceEl || undefined,
    getBoundingClientRect: () => {
      const isXAxis = currentAxis === "x" || currentAxis === "both"
      const isYAxis = currentAxis === "y" || currentAxis === "both"

      // Use client coordinates when available and axis is enabled, otherwise use reference element
      const x = isXAxis && clientCoords.x != null ? clientCoords.x : domRect.x
      const y = isYAxis && clientCoords.y != null ? clientCoords.y : domRect.y

      // For point positioning (both axes), create a zero-size rect at the cursor
      // For line positioning (single axis), maintain the reference element's dimension on the other axis
      const width = currentAxis === "both" || currentAxis === "y" ? 0 : domRect.width
      const height = currentAxis === "both" || currentAxis === "x" ? 0 : domRect.height

      return {
        width: Math.max(0, width),
        height: Math.max(0, height),
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

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Tracking mode for client point positioning behavior
 */
export type TrackingMode = "follow" | "static"

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

  /**
   * Tracking behavior mode:
   * - "follow": Continuous cursor tracking (default)
   * - "static": Position at initial interaction, no subsequent tracking
   * @default "follow"
   */
  trackingMode?: MaybeRefOrGetter<TrackingMode>
}

export interface UseClientPointReturn {
  /**
   * Reactive object containing the current client coordinates (x/y)
   */
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  /**
   * Function to manually update the floating element's position
   */
  updatePosition: (x: number, y: number) => void
}
