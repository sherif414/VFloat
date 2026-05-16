import type { VirtualElement } from "@/types";

export interface Coordinates {
  /**
   * Horizontal viewport coordinate.
   */
  x: number | null;

  /**
   * Vertical viewport coordinate.
   */
  y: number | null;
}

/**
 * Restricts client-point tracking to a single axis or both axes.
 */
export type AxisConstraint = "x" | "y" | "both";

/**
 * Defines how the virtual anchor should react after opening.
 */
export type TrackingMode = "follow" | "static";

export interface PointerEventData {
  /**
   * Pointer event type consumed by client-point tracking strategies.
   */
  type: "pointerdown" | "pointermove" | "pointerenter";

  /**
   * Pointer coordinates extracted from the native event.
   */
  coordinates: Coordinates;

  /**
   * Original browser event for pointer metadata such as pointer type.
   */
  originalEvent: PointerEvent;
}

export interface TrackingContext {
  /**
   * Whether the floating element is currently open.
   */
  isOpen: boolean;
}

export interface VirtualElementFactoryOptions {
  /**
   * Latest tracked coordinates for the virtual anchor.
   */
  coordinates: Coordinates;

  /**
   * Real DOM element associated with the interaction, when available.
   */
  referenceElement?: HTMLElement | null;

  /**
   * Coordinates captured at open time for partially locked tracking modes.
   */
  baselineCoordinates?: Coordinates | null;

  /**
   * Axis constraint applied to the generated virtual rect.
   */
  axis?: AxisConstraint;
}

export interface VirtualElementFactoryContract {
  /**
   * Builds a Floating UI compatible virtual element from pointer data.
   */
  create(options: VirtualElementFactoryOptions): VirtualElement;
}
