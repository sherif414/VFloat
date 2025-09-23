/**
 * @fileoverview Comprehensive client point positioning composable
 *
 * This file contains a complete modular implementation consolidated into a single file
 * for easier maintenance while preserving the architectural benefits of separation of concerns.
 */

import type { VirtualElement } from "@floating-ui/dom"
import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  type Ref,
  readonly,
  ref,
  toValue,
  watch,
  watchEffect,
} from "vue"
import type { FloatingContext } from "@/composables"
import { isMouseLikePointerType } from "./utils"

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Represents 2D coordinates with optional null values for unset states
 */
export interface Coordinates {
  x: number | null
  y: number | null
}

/**
 * Axis constraint types for coordinate positioning
 */
export type AxisConstraint = "x" | "y" | "both"

/**
 * Tracking mode for client point positioning behavior
 */
export type TrackingMode = "follow" | "static"

/**
 * Dimensions for bounding rectangles
 */
interface Dimensions {
  width: number
  height: number
}

/**
 * Processed pointer event data
 */
interface PointerEventData {
  type: "pointerdown" | "pointermove" | "pointerenter"
  coordinates: Coordinates
  originalEvent: PointerEvent
}

/**
 * Context for tracking strategy operations
 */
interface TrackingContext {
  axis: AxisConstraint
  isOpen: boolean
}

/**
 * Virtual element configuration
 */
interface VirtualElementConfig {
  referenceElement: HTMLElement | null
  coordinates: Coordinates
  lockedCoordinates: Coordinates | null
  axis: AxisConstraint
  fallbackDimensions: Dimensions
}

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
  axis?: MaybeRefOrGetter<AxisConstraint>

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

//=======================================================================================
// 📌 Services
//=======================================================================================

/**
 * Service for calculating bounding rectangles for virtual elements
 */
class BoundingRectCalculator {
  /**
   * Create a virtual element with precise bounding rectangle calculations
   */
  createVirtualElement(config: VirtualElementConfig): VirtualElement {
    return {
      contextElement: config.referenceElement || undefined,
      getBoundingClientRect: () => this.calculateBoundingRect(config),
    }
  }

  /**
   * Calculate bounding rectangle based on configuration
   */
  private calculateBoundingRect(config: VirtualElementConfig): DOMRect {
    const { referenceElement, coordinates, lockedCoordinates, axis, fallbackDimensions } = config

    const refRect = this.getReferenceRect(referenceElement, fallbackDimensions)
    const position = this.calculatePosition(coordinates, axis, refRect, lockedCoordinates)
    const dimensions = this.calculateDimensions(axis, refRect, fallbackDimensions)

    return this.createDOMRect({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
    })
  }

  /**
   * Get reference element rectangle or fallback
   */
  private getReferenceRect(referenceElement: HTMLElement | null, fallback: Dimensions): DOMRect {
    if (referenceElement) {
      try {
        return referenceElement.getBoundingClientRect()
      } catch (error) {
        console.warn("Failed to get reference element bounds:", error)
      }
    }

    // Return fallback rectangle
    return this.createDOMRect({
      x: 0,
      y: 0,
      width: fallback.width,
      height: fallback.height,
    })
  }

  /**
   * Calculate position based on coordinates and axis constraints
   */
  private calculatePosition(
    coordinates: Coordinates,
    axis: AxisConstraint,
    refRect: DOMRect,
    lockedCoordinates: Coordinates | null
  ): { x: number; y: number } {
    const isXAxis = axis === "x" || axis === "both"
    const isYAxis = axis === "y" || axis === "both"

    // Use live coordinates when available and axis allows,
    // otherwise prefer locked coordinates from the initial interaction,
    // and finally fall back to the reference element's rect.
    const x =
      isXAxis && coordinates.x !== null ? coordinates.x : (lockedCoordinates?.x ?? refRect.x)
    const y =
      isYAxis && coordinates.y !== null ? coordinates.y : (lockedCoordinates?.y ?? refRect.y)

    return { x, y }
  }

  /**
   * Calculate dimensions based on axis constraints
   */
  private calculateDimensions(
    axis: AxisConstraint,
    refRect: DOMRect,
    fallback: Dimensions
  ): Dimensions {
    switch (axis) {
      case "both":
        // Point positioning - zero dimensions
        return { width: 0, height: 0 }

      case "x":
        // Horizontal line - full width, zero height
        return { width: refRect.width || fallback.width, height: 0 }

      case "y":
        // Vertical line - zero width, full height
        return { width: 0, height: refRect.height || fallback.height }

      default:
        return { width: 0, height: 0 }
    }
  }

  /**
   * Create a DOMRect-like object
   */
  private createDOMRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
    const { x, y, width, height } = rect

    // Ensure non-negative dimensions
    const safeWidth = Math.max(0, width)
    const safeHeight = Math.max(0, height)

    return {
      x,
      y,
      width: safeWidth,
      height: safeHeight,
      top: y,
      right: x + safeWidth,
      bottom: y + safeHeight,
      left: x,
      toJSON: () => ({ x, y, width: safeWidth, height: safeHeight }),
    } as DOMRect
  }
}

//=======================================================================================
// 📌 Tracking Strategies
//=======================================================================================

/**
 * Abstract base class for tracking strategies
 */
abstract class TrackingStrategy {
  abstract readonly name: TrackingMode

  // The core state every strategy needs: the last known good coordinates
  protected lastKnownCoordinates: Coordinates | null = null

  /**
   * Process a pointer event and return coordinates if the strategy wants to update
   * This is the heart of each strategy's behavior
   */
  abstract process(event: PointerEventData, context: TrackingContext): Coordinates | null

  /**
   * Get coordinates to use when the floating element opens
   * This lets each strategy decide its opening behavior without client code needing to know the details
   */
  getCoordinatesForOpening(): Coordinates | null {
    // Default implementation: use the last known coordinates
    // Strategies can override this if they need different behavior
    return this.lastKnownCoordinates
  }

  /**
   * Called when the floating element opens
   * Strategies can use this to adjust their behavior for the "open" state
   */
  onOpen(): void {
    // Most strategies don't need special opening behavior
    // But this gives them a hook if needed
  }

  /**
   * Called when the floating element closes
   * This is where strategies should clean up any temporary state
   */
  onClose(): void {
    // Default: clear the last known coordinates since the interaction is over
    this.lastKnownCoordinates = null
  }

  /**
   * Reset all strategy state - used when the composable is disabled or reset
   */
  reset(): void {
    this.lastKnownCoordinates = null
  }

  /**
   * Helper to update coordinates with axis constraints applied
   * This centralizes the axis logic so strategies don't need to think about it
   */
  protected applyAxisConstraints(coordinates: Coordinates, axis: AxisConstraint): Coordinates {
    switch (axis) {
      case "x":
        return { x: coordinates.x, y: null }
      case "y":
        return { x: null, y: coordinates.y }
      case "both":
        return coordinates
      default:
        return coordinates
    }
  }

  /**
   * Helper to check if coordinates are valid for the current axis
   * This prevents strategies from trying to use invalid coordinate combinations
   */
  protected isValidForAxis(coordinates: Coordinates, axis: AxisConstraint): boolean {
    switch (axis) {
      case "x":
        return coordinates.x !== null
      case "y":
        return coordinates.y !== null
      case "both":
        return coordinates.x !== null && coordinates.y !== null
      default:
        return false
    }
  }
}

/**
 * Strategy for continuous cursor tracking
 */
class FollowTracker extends TrackingStrategy {
  readonly name = "follow" as const

  /**
   * Follow strategy: always update coordinates based on the current pointer position
   * This creates smooth, continuous tracking behavior
   */
  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates

    // First, check if these coordinates work with our current axis constraints
    if (!this.isValidForAxis(coordinates, context.axis)) {
      return null
    }

    // Apply axis constraints to get the final coordinates
    const constrainedCoordinates = this.applyAxisConstraints(coordinates, context.axis)

    // Always remember the latest valid coordinates for future use
    this.lastKnownCoordinates = constrainedCoordinates

    // The follow strategy's key behavior: different rules for different events
    switch (event.type) {
      case "pointerdown":
        // Always respond to clicks for immediate feedback
        return constrainedCoordinates

      case "pointermove":
        // Only track mouse movements when the floating element is open
        // This prevents unnecessary updates when the element isn't visible
        if (context.isOpen && isMouseLikePointerType(event.originalEvent.pointerType, true)) {
          return constrainedCoordinates
        }
        return null

      case "pointerenter":
        // Respond to hover for initial positioning
        return constrainedCoordinates

      default:
        return null
    }
  }
}

/**
 * Strategy for static positioning at initial interaction
 */
class StaticTracker extends TrackingStrategy {
  readonly name = "static" as const

  // Static strategy needs to remember the "trigger" coordinates from clicks
  // These take priority over hover coordinates for positioning
  private triggerCoordinates: Coordinates | null = null

  /**
   * Static strategy: capture coordinates from trigger events, ignore movement
   * This creates stable positioning that doesn't jump around
   */
  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates

    // First, check if these coordinates work with our current axis constraints
    if (!this.isValidForAxis(coordinates, context.axis)) {
      return null
    }

    // Apply axis constraints to get the final coordinates
    const constrainedCoordinates = this.applyAxisConstraints(coordinates, context.axis)

    // Static strategy behavior: different handling for different event types
    switch (event.type) {
      case "pointerdown":
        // Clicks are "trigger events" - they set the position for static mode
        this.triggerCoordinates = constrainedCoordinates
        this.lastKnownCoordinates = constrainedCoordinates

        // If the floating element is already open, update position immediately
        // This handles cases like clicking while a context menu is open
        return context.isOpen ? constrainedCoordinates : null

      case "pointermove":
      case "pointerenter":
        // Movement and hover update our fallback coordinates but don't trigger positioning
        // This gives us something to fall back to if we don't have trigger coordinates
        this.lastKnownCoordinates = constrainedCoordinates
        return null

      default:
        return null
    }
  }

  /**
   * Get coordinates to use when floating element opens
   */
  getCoordinatesForOpening(): Coordinates | null {
    // 1. Prioritize trigger coordinates (from recent click)
    if (this.triggerCoordinates) {
      return this.triggerCoordinates
    }
    // 2. Fall back to last known hover position
    return this.lastKnownCoordinates
  }

  /**
   * Reset tracking state
   */
  reset(): void {
    super.reset()
    this.triggerCoordinates = null
  }

  onClose(): void {
    this.triggerCoordinates = null
    // Note: we don't clear lastKnownCoordinates here, unlike the base class
    // This lets static mode remember hover positions between open/close cycles
  }
}

//=======================================================================================
// 📌 Main Composable
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

  // Services
  const rectCalculator = new BoundingRectCalculator()

  // Tracking strategies
  const followTracker = new FollowTracker()
  const staticTracker = new StaticTracker()

  // Internal state
  const internalCoordinates = ref<Coordinates>({ x: null, y: null })
  // Locked initial coordinates captured when opening to avoid jumps on constrained axes
  const lockedCoordinates = ref<Coordinates | null>(null)

  // Computed options
  const axis = computed(() => toValue(options.axis ?? "both"))
  const enabled = computed(() => toValue(options.enabled ?? true))
  const externalX = computed(() => toValue(options.x ?? null))
  const externalY = computed(() => toValue(options.y ?? null))
  const trackingMode = computed(() => toValue(options.trackingMode ?? "follow"))
  const isExternallyControlled = computed(
    () => externalX.value !== null || externalY.value !== null
  )

  // Primary coordinates - external takes precedence over internal
  const coordinates = computed<Coordinates>(() => {
    const hasExternalX = externalX.value !== null
    const hasExternalY = externalY.value !== null

    if (hasExternalX || hasExternalY) {
      return {
        x: hasExternalX ? externalX.value : internalCoordinates.value.x,
        y: hasExternalY ? externalY.value : internalCoordinates.value.y,
      }
    }

    return internalCoordinates.value
  })

  // Coordinates constrained by current axis setting
  const constrainedCoordinates = computed<Coordinates>(() => {
    const coords = coordinates.value
    const currentAxis = axis.value

    switch (currentAxis) {
      case "x":
        return { x: coords.x, y: null }
      case "y":
        return { x: null, y: coords.y }
      case "both":
        return coords
    }
  })

  // Current tracking strategy
  const trackingStrategy = computed<TrackingStrategy>(() => {
    return trackingMode.value === "follow" ? followTracker : staticTracker
  })

  /**
   * Set coordinates programmatically
   */
  const setCoordinates = (x: number | null, y: number | null): void => {
    // Don't update if externally controlled
    if (isExternallyControlled.value) return
    internalCoordinates.value = { x, y }
  }

  /**
   * Reset coordinates to null
   */
  const reset = (): void => {
    if (!isExternallyControlled.value) {
      internalCoordinates.value = { x: null, y: null }
    }
  }

  /**
   * Create virtual element based on current coordinates
   */
  const createVirtualElement = (): VirtualElement => {
    const config: VirtualElementConfig = {
      referenceElement: pointerTarget.value,
      coordinates: constrainedCoordinates.value,
      lockedCoordinates: lockedCoordinates.value,
      axis: axis.value,
      fallbackDimensions: { width: 100, height: 30 },
    }

    return rectCalculator.createVirtualElement(config)
  }

  /**
   * Process pointer event with current tracking strategy
   */
  const processPointerEvent = (event: PointerEvent, type: PointerEventData["type"]): void => {
    if (!enabled.value || isExternallyControlled.value) {
      return
    }

    const eventData: PointerEventData = {
      type,
      coordinates: { x: event.clientX, y: event.clientY },
      originalEvent: event,
    }

    const strategy = trackingStrategy.value

    const coordinates = strategy.process(eventData, {
      axis: axis.value,
      isOpen: open.value,
    })

    if (coordinates) {
      setCoordinates(coordinates.x, coordinates.y)
    }
  }

  // Update virtual element when coordinates change
  watch(
    [constrainedCoordinates, lockedCoordinates, axis],
    () => {
      refs.anchorEl.value = createVirtualElement()
    },
    { immediate: true }
  )

  // Handle controlled coordinates
  watch(
    [externalX, externalY, enabled],
    ([x, y, isEnabled]) => {
      if (isEnabled && x != null && y != null) {
        setCoordinates(x, y)
      }
    },
    { immediate: true }
  )

  // Core logic for opening/closing
  watch(open, (isOpen) => {
    if (!enabled.value || isExternallyControlled.value) {
      return
    }

    const strategy = trackingStrategy.value

    if (isOpen) {
      const openingCoords = strategy.getCoordinatesForOpening()

      if (openingCoords) {
        setCoordinates(openingCoords.x, openingCoords.y)
        lockedCoordinates.value = { ...openingCoords }
      } else {
        lockedCoordinates.value = { ...internalCoordinates.value }
      }

      strategy.onOpen()
    } else {
      strategy.onClose()
      reset()
      lockedCoordinates.value = null
    }
  })

  // Event listeners setup
  const onPointerdown = (e: PointerEvent) => {
    processPointerEvent(e, "pointerdown")
  }

  const onPointerenter = (e: PointerEvent) => {
    processPointerEvent(e, "pointerenter")
  }

  const onPointermove = (e: PointerEvent) => {
    processPointerEvent(e, "pointermove")
  }

  // Setup event listeners
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
    coordinates: readonly(coordinates),
    updatePosition: (x: number, y: number) => setCoordinates(x, y),
  }
}
