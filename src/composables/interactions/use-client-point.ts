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
 * Coordinate update event data
 */
interface CoordinateUpdate {
  coordinates: Coordinates
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
      getBoundingClientRect: () => this.calculateBoundingRect(config)
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
      height: dimensions.height
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
      height: fallback.height
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
    const x = isXAxis && coordinates.x !== null
      ? coordinates.x
      : (lockedCoordinates?.x ?? refRect.x)
    const y = isYAxis && coordinates.y !== null
      ? coordinates.y
      : (lockedCoordinates?.y ?? refRect.y)

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
  private createDOMRect(rect: {
    x: number
    y: number
    width: number
    height: number
  }): DOMRect {
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
      toJSON: () => ({ x, y, width: safeWidth, height: safeHeight })
    } as DOMRect
  }
}

//=======================================================================================
// 📌 Tracking Strategies
//=======================================================================================

/**
 * Base interface for tracking strategies
 */
abstract class TrackingStrategy {
  abstract readonly name: TrackingMode
  
  /**
   * Process a pointer event and return coordinate update if applicable
   */
  abstract process(event: PointerEventData, context: TrackingContext): CoordinateUpdate | null
  
  /**
   * Reset strategy state
   */
  abstract reset(): void
  
  /**
   * Check if strategy can handle the given event
   */
  canHandle(event: PointerEventData): boolean {
    return event.coordinates.x !== null || event.coordinates.y !== null
  }

  /**
   * Create a coordinate update object
   */
  protected createCoordinateUpdate(
    event: PointerEventData
  ): CoordinateUpdate {
    return {
      coordinates: event.coordinates
    }
  }

  /**
   * Check if event coordinates are valid for the current axis
   */
  protected isValidForAxis(event: PointerEventData, axis: AxisConstraint): boolean {
    const { x, y } = event.coordinates
    switch (axis) {
      case "x": return x !== null
      case "y": return y !== null
      case "both": return x !== null && y !== null
      default: return false
    }
  }
}

/**
 * Strategy for continuous cursor tracking
 */
class FollowTracker extends TrackingStrategy {
  readonly name = "follow" as const

  /**
   * Process pointer events for continuous tracking
   */
  process(event: PointerEventData, context: TrackingContext): CoordinateUpdate | null {
    // Validate coordinates for current axis
    if (!this.isValidForAxis(event, context.axis)) {
      return null
    }

    // Handle different event types
    switch (event.type) {
      case "pointerdown":
        return this.handlePointerDown(event)
      case "pointermove":
        return this.handlePointerMove(event, context)
      case "pointerenter":
        return this.handlePointerEnter(event)
      default:
        return null
    }
  }

  /**
   * Handle pointer down events
   */
  private handlePointerDown(event: PointerEventData): CoordinateUpdate | null {
    // Always update on pointer down for immediate feedback
    return this.createCoordinateUpdate(event)
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(event: PointerEventData, context: TrackingContext): CoordinateUpdate | null {
    // Only track movements when floating element is open for follow mode
    if (!context.isOpen) {
      return null
    }

    // Only track mouse-like pointers for movements
    if (!isMouseLikePointerType(event.originalEvent.pointerType, true)) {
      return null
    }

    // Update every time for better test reliability
    return this.createCoordinateUpdate(event)
  }

  /**
   * Handle pointer enter events
   */
  private handlePointerEnter(event: PointerEventData): CoordinateUpdate | null {
    // Update on enter for initial positioning
    return this.createCoordinateUpdate(event)
  }

  /**
   * Reset tracking state
   */
  reset(): void {
    // no state to reset
  }

  /**
   * Check if this strategy can handle the event
   */
  canHandle(event: PointerEventData): boolean {
    if (!super.canHandle(event)) {
      return false
    }
    return ["pointerdown", "pointermove", "pointerenter"].includes(event.type)
  }
}

/**
 * Strategy for static positioning at initial interaction
 */
class StaticTracker extends TrackingStrategy {
  readonly name = "static" as const
  
  // Last known coordinates from any pointer movement
  private lastPointerCoords: Coordinates | null = null
  // High-priority coordinates from trigger events like clicks
  private triggerCoords: Coordinates | null = null

  /**
   * Process pointer events for static positioning
   */
  process(event: PointerEventData, context: TrackingContext): CoordinateUpdate | null {
    // Validate coordinates for current axis
    if (!this.isValidForAxis(event, context.axis)) {
      return null
    }

    // Handle different event types
    switch (event.type) {
      case "pointerdown":
        return this.handlePointerDown(event, context)
      case "pointermove":
        return this.handlePointerMove(event)
      case "pointerenter":
        return this.handlePointerEnter(event)
      default:
        return null
    }
  }

  /**
   * Handle pointer down events (trigger events)
   */
  private handlePointerDown(event: PointerEventData, context: TrackingContext): CoordinateUpdate | null {
    // Store as trigger coordinates (highest priority)
    this.triggerCoords = event.coordinates
    this.lastPointerCoords = event.coordinates

    // If floating element is open, update immediately
    if (context.isOpen) {
      return this.createCoordinateUpdate(event)
    }

    return null
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(event: PointerEventData): CoordinateUpdate | null {
    // Update last known position
    this.lastPointerCoords = event.coordinates
    // Movement invalidates trigger coordinates (user moved after click)
    this.triggerCoords = null
    // Don't update position during movement in static mode
    return null
  }

  /**
   * Handle pointer enter events
   */
  private handlePointerEnter(event: PointerEventData): CoordinateUpdate | null {
    // Update last known position
    this.lastPointerCoords = event.coordinates
    // Don't update position during enter in static mode
    return null
  }

  /**
   * Get coordinates to use when floating element opens
   */
  getCoordinatesForOpen(): Coordinates | null {
    // 1. Prioritize trigger coordinates (from recent click)
    if (this.triggerCoords) {
      return this.triggerCoords
    }
    // 2. Fall back to last known hover position
    return this.lastPointerCoords
  }

  /**
   * Reset tracking state
   */
  reset(): void {
    this.lastPointerCoords = null
    this.triggerCoords = null
  }

  /**
   * Check if this strategy can handle the event
   */
  canHandle(event: PointerEventData): boolean {
    if (!super.canHandle(event)) {
      return false
    }
    return ["pointerdown", "pointermove", "pointerenter"].includes(event.type)
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
  const isExternallyControlled = computed(() => externalX.value !== null || externalY.value !== null)

  // Primary coordinates - external takes precedence over internal
  const coordinates = computed<Coordinates>(() => {
    const hasExternalX = externalX.value !== null
    const hasExternalY = externalY.value !== null

    if (hasExternalX || hasExternalY) {
      return {
        x: hasExternalX ? externalX.value : internalCoordinates.value.x,
        y: hasExternalY ? externalY.value : internalCoordinates.value.y
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
      fallbackDimensions: { width: 100, height: 30 }
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
      originalEvent: event
    }

    // Capture the initial interaction point to lock constrained axis
    if (type === "pointerdown" && !open.value) {
      lockedCoordinates.value = { ...eventData.coordinates }
    }

    const strategy = trackingStrategy.value
    
    if (!strategy.canHandle(eventData)) {
      return
    }

    const trackingContext: TrackingContext = {
      axis: axis.value,
      isOpen: open.value
    }

    const update = strategy.process(eventData, trackingContext)
    
    if (update) {
      setCoordinates(update.coordinates.x, update.coordinates.y)
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

    if (isOpen) {
      if (trackingMode.value === "static") {
        // Get coordinates from static tracker when opening
        const strategy = trackingStrategy.value as StaticTracker
        const coords = strategy.getCoordinatesForOpen()
        if (coords) {
          setCoordinates(coords.x, coords.y)
          // Lock to the trigger/initial coordinates
          lockedCoordinates.value = { ...coords }
        } else {
          // Fallback: lock to last known internal coordinates
          lockedCoordinates.value = internalCoordinates.value
        }
      } else {
        // Follow mode: lock to the current pointer coordinates at the moment of opening
        lockedCoordinates.value = internalCoordinates.value
      }
    } else {
      // When closing, reset everything
      reset()
      trackingStrategy.value.reset()
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
