import type { VirtualElement } from "@/types"

export interface Coordinates {
  x: number | null
  y: number | null
}

export type AxisConstraint = "x" | "y" | "both"
export type TrackingMode = "follow" | "static"

export interface PointerEventData {
  type: "pointerdown" | "pointermove" | "pointerenter"
  coordinates: Coordinates
  originalEvent: PointerEvent
}

export interface TrackingContext {
  isOpen: boolean
}

export interface VirtualElementFactoryOptions {
  coordinates: Coordinates
  referenceElement?: HTMLElement | null
  baselineCoordinates?: Coordinates | null
  axis?: AxisConstraint
}

export interface VirtualElementFactoryContract {
  create(options: VirtualElementFactoryOptions): VirtualElement
}
