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
import type { AnchorElement } from "../use-floating"
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

const sanitizeCoordinate = (value: number | null | undefined): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
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
  trackingMode?: TrackingMode
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

export interface UseClientPointContext {
  open: Readonly<Ref<boolean>>
  refs: {
    anchorEl: Ref<AnchorElement>
  }
}

//=======================================================================================
// 📌 Services
//=======================================================================================

/**
 * Virtual element factory for floating positioning anchors.
 * Creates virtual DOM elements that serve as positioning anchors.
 */
export class VirtualElementFactory {
  private static readonly DEFAULT_DIMENSIONS = { width: 100, height: 30 }

  /**
   * Create a virtual anchor element
   */
  create(options: {
    coordinates: Coordinates
    referenceElement?: HTMLElement | null
    baselineCoordinates?: Coordinates | null
    axis?: AxisConstraint
  }): VirtualElement {
    const config = this.buildConfiguration(options)

    return {
      contextElement: config.referenceElement || undefined,
      getBoundingClientRect: () => this.buildBoundingRect(config),
    }
  }

  /**
   * Build configuration from options with defaults
   */
  private buildConfiguration(options: {
    coordinates: Coordinates
    referenceElement?: HTMLElement | null
    baselineCoordinates?: Coordinates | null
    axis?: AxisConstraint
  }): {
    coordinates: Coordinates
    referenceElement: HTMLElement | null
    baselineCoordinates: Coordinates | null
    axis: AxisConstraint
  } {
    return {
      coordinates: options.coordinates,
      referenceElement: options.referenceElement ?? null,
      baselineCoordinates: options.baselineCoordinates ?? null,
      axis: options.axis ?? "both",
    }
  }

  /**
   * Build the bounding rectangle for the virtual element
   */
  private buildBoundingRect(config: {
    coordinates: Coordinates
    referenceElement: HTMLElement | null
    baselineCoordinates: Coordinates | null
    axis: AxisConstraint
  }): DOMRect {
    const referenceRect = this.getReferenceRect(config.referenceElement)
    const position = this.resolvePosition(config, referenceRect)
    const size = this.calculateSize(config.axis, referenceRect)

    return this.buildDOMRect({
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    })
  }

  /**
   * Get reference element bounds with fallback
   */
  private getReferenceRect(element: HTMLElement | null): DOMRect {
    if (element) {
      try {
        return element.getBoundingClientRect()
      } catch (error) {
        console.warn("VirtualElementFactory: Failed to get element bounds", { element, error })
      }
    }

    return this.buildDOMRect({
      x: 0,
      y: 0,
      width: VirtualElementFactory.DEFAULT_DIMENSIONS.width,
      height: VirtualElementFactory.DEFAULT_DIMENSIONS.height,
    })
  }

  /**
   * Resolve final position from coordinate sources
   */
  private resolvePosition(
    config: {
      coordinates: Coordinates
      baselineCoordinates: Coordinates | null
      axis: AxisConstraint
    },
    referenceRect: DOMRect
  ): { x: number; y: number } {
    return {
      x: this.resolveAxisCoordinate({
        current: config.coordinates.x,
        baseline: config.baselineCoordinates?.x ?? null,
        fallback: referenceRect.x,
        isAxisEnabled: config.axis === "x" || config.axis === "both",
      }),
      y: this.resolveAxisCoordinate({
        current: config.coordinates.y,
        baseline: config.baselineCoordinates?.y ?? null,
        fallback: referenceRect.y,
        isAxisEnabled: config.axis === "y" || config.axis === "both",
      }),
    }
  }

  /**
   * Resolve coordinate for a single axis with clear precedence
   */
  private resolveAxisCoordinate(sources: {
    current: number | null
    baseline: number | null
    fallback: number
    isAxisEnabled: boolean
  }): number {
    const { current, baseline, fallback, isAxisEnabled } = sources

    // Priority 1: Current coordinates if axis allows
    if (isAxisEnabled && current !== null) {
      return current
    }

    // Priority 2: Baseline coordinates
    if (baseline !== null) {
      return baseline
    }

    // Priority 3: Reference element fallback
    return fallback
  }

  /**
   * Calculate virtual element size based on axis constraints
   */
  private calculateSize(
    axis: AxisConstraint,
    referenceRect: DOMRect
  ): {
    width: number
    height: number
  } {
    const ensurePositive = (value: number, fallback: number) => Math.max(0, value || fallback)

    switch (axis) {
      case "both":
        return { width: 0, height: 0 }
      case "x":
        return {
          width: ensurePositive(
            referenceRect.width,
            VirtualElementFactory.DEFAULT_DIMENSIONS.width
          ),
          height: 0,
        }
      case "y":
        return {
          width: 0,
          height: ensurePositive(
            referenceRect.height,
            VirtualElementFactory.DEFAULT_DIMENSIONS.height
          ),
        }
    }
  }

  /**
   * Build a DOMRect object
   */
  private buildDOMRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
    const { x, y, width, height } = rect
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
export abstract class TrackingStrategy {
  abstract readonly name: TrackingMode

  // The core state every strategy needs: the last known good coordinates
  protected lastKnownCoordinates: Coordinates | null = null

  /**
   * Process a pointer event and return coordinates if the strategy wants to update
   * This is the heart of each strategy's behavior
   */
  abstract process(event: PointerEventData, context: TrackingContext): Coordinates | null

  /**
   * Get the list of pointer events this strategy needs to listen for
   * This allows strategies to optimize performance by only registering necessary events
   */
  abstract getRequiredEvents(): PointerEventData["type"][]

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
}

/**
 * Strategy for continuous cursor tracking
 */
export class FollowTracker extends TrackingStrategy {
  readonly name = "follow" as const

  /**
   * Follow strategy needs all pointer events for continuous tracking
   */
  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown", "pointermove", "pointerenter"]
  }

  /**
   * Follow strategy: always update coordinates based on the current pointer position
   * This creates smooth, continuous tracking behavior
   */
  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates

    // Always remember the latest coordinates for future use
    this.lastKnownCoordinates = coordinates

    // The follow strategy's key behavior: different rules for different events
    switch (event.type) {
      case "pointerdown":
        // Always respond to clicks for immediate feedback
        return coordinates

      case "pointermove":
        // Only track mouse movements when the floating element is open
        // This prevents unnecessary updates when the element isn't visible
        if (context.isOpen && isMouseLikePointerType(event.originalEvent.pointerType, true)) {
          return coordinates
        }
        return null

      case "pointerenter":
        // Respond to hover for initial positioning
        return coordinates

      default:
        return null
    }
  }
}

/**
 * Strategy for static positioning at initial interaction
 */
export class StaticTracker extends TrackingStrategy {
  readonly name = "static" as const

  // Static strategy needs to remember the "trigger" coordinates from clicks
  // These take priority over hover coordinates for positioning
  private triggerCoordinates: Coordinates | null = null

  /**
   * Static strategy only needs click events, not hover or continuous movement
   * This optimization avoids registering unnecessary pointer events
   */
  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown"]
  }

  /**
   * Static strategy: capture coordinates from trigger events, ignore movement
   * This creates stable positioning that doesn't jump around
   */
  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates
    // Clicks are "trigger events" - they set the position for static mode
    this.triggerCoordinates = coordinates
    this.lastKnownCoordinates = coordinates

    // If the floating element is already open, update position immediately
    // This handles cases like clicking while a context menu is open
    return context.isOpen ? coordinates : null
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
  context: UseClientPointContext,
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const { open, refs } = context

  // Services
  const virtualElementFactory = new VirtualElementFactory()

  // Internal state
  const internalCoordinates = ref<Coordinates>({ x: null, y: null })
  // Locked initial coordinates captured when opening to avoid jumps on constrained axes
  const lockedCoordinates = ref<Coordinates | null>(null)

  // Computed options
  const axis = computed(() => toValue(options.axis ?? "both"))
  const enabled = computed(() => toValue(options.enabled ?? true))
  const externalX = computed(() => sanitizeCoordinate(toValue(options.x ?? null)))
  const externalY = computed(() => sanitizeCoordinate(toValue(options.y ?? null)))
  const isExternallyControlled = computed(
    () => externalX.value !== null && externalY.value !== null
  )

  // Primary coordinates - external takes precedence over internal
  const coordinates = computed<Coordinates>(() => {
    if (isExternallyControlled.value) {
      return {
        x: externalX.value,
        y: externalY.value,
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
  const trackingStrategy: TrackingStrategy =
    (options.trackingMode ?? "follow") === "follow" ? new FollowTracker() : new StaticTracker()

  /**
   * Set coordinates programmatically
   */
  const setCoordinates = (x: number | null, y: number | null): void => {
    // Don't update if externally controlled
    if (isExternallyControlled.value) return
    internalCoordinates.value = {
      x: sanitizeCoordinate(x),
      y: sanitizeCoordinate(y),
    }
  }

  /**
   * Reset coordinates to null
   */
  const resetCoordinates = (): void => {
    if (!isExternallyControlled.value) {
      internalCoordinates.value = { x: null, y: null }
    }
  }

  /**
   * Process pointer event with current tracking strategy
   */
  const processPointerEvent = (event: PointerEvent, type: PointerEventData["type"]): void => {
    const eventData: PointerEventData = {
      type,
      coordinates: { x: event.clientX, y: event.clientY },
      originalEvent: event,
    }

    const coordinates = trackingStrategy.process(eventData, {
      axis: axis.value,
      isOpen: open.value,
    })

    if (coordinates) {
      setCoordinates(coordinates.x, coordinates.y)
    }
  }

  // Update virtual element when coordinates change
  watch(
    [constrainedCoordinates, lockedCoordinates, axis, pointerTarget],
    () => {
      refs.anchorEl.value = virtualElementFactory.create({
        coordinates: constrainedCoordinates.value,
        referenceElement: pointerTarget.value,
        baselineCoordinates: lockedCoordinates.value,
        axis: axis.value,
      })
    },
    { immediate: true }
  )

  // Core logic for opening/closing
  watch(open, (isOpen) => {
    if (!enabled.value || isExternallyControlled.value) {
      return
    }

    if (isOpen) {
      const openingCoords = trackingStrategy.getCoordinatesForOpening()

      if (openingCoords) {
        setCoordinates(openingCoords.x, openingCoords.y)
        lockedCoordinates.value = { ...openingCoords }
      } else {
        lockedCoordinates.value = { ...internalCoordinates.value }
      }
    } else {
      trackingStrategy.onClose()
      resetCoordinates()
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

  // Setup event listeners based on strategy requirements
  watchEffect(() => {
    if (isExternallyControlled.value || !enabled.value) return
    const el = pointerTarget.value
    if (!el) return

    // Get required events from the current strategy
    const requiredEvents = trackingStrategy.getRequiredEvents()

    // Only register listeners for events the strategy actually needs
    const handlers: Partial<Record<PointerEventData["type"], (e: PointerEvent) => void>> = {
      pointerenter: onPointerenter,
      pointerdown: onPointerdown,
      pointermove: onPointermove,
    }

    // Register only required event listeners
    requiredEvents.forEach((eventType) => {
      const handler = handlers[eventType]
      if (handler) {
        el.addEventListener(eventType, handler)
      }
    })

    onWatcherCleanup(() => {
      // Clean up only the events we registered
      requiredEvents.forEach((eventType) => {
        const handler = handlers[eventType]
        if (handler) {
          el.removeEventListener(eventType, handler)
        }
      })
    })
  })

  return {
    coordinates: readonly(coordinates),
    updatePosition: (x: number, y: number) => setCoordinates(x, y),
  }
}
