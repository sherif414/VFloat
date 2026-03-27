import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom"
import type { MaybeRefOrGetter, Ref } from "vue"
import { ref } from "vue"
import { createRefSetter } from "@/core/elements"
import { setFloatingInternals } from "@/core/floating-internals"
import type { OpenChangeReason, VirtualElement } from "@/types"
import { createOpenStateController } from "./internal/open-state"
import { createPositionController } from "./internal/position-controller"

export type AnchorElement = HTMLElement | VirtualElement | null
export type FloatingElement = HTMLElement | null

export type FloatingStyles = {
  position: Strategy
  top: string
  left: string
  transform?: string
  "will-change"?: string
} & {
  // biome-ignore lint/suspicious/noExplicitAny: CSS custom property passthrough
  [key: `--${string}`]: any
}

export interface UseFloatingOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  transform?: MaybeRefOrGetter<boolean | undefined>
  middlewares?: MaybeRefOrGetter<Middleware[]>
  autoUpdate?: boolean | AutoUpdateOptions
  open?: Ref<boolean>
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void
}

export interface FloatingRefs {
  anchorEl: Ref<AnchorElement>
  floatingEl: Ref<FloatingElement>
  arrowEl: Ref<HTMLElement | null>
  setAnchor: (value: AnchorElement) => void
  setFloating: (value: FloatingElement) => void
  setArrow: (value: HTMLElement | null) => void
}

export interface FloatingState {
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void
}

export interface FloatingPosition {
  x: Readonly<Ref<number>>
  y: Readonly<Ref<number>>
  strategy: Readonly<Ref<Strategy>>
  placement: Readonly<Ref<Placement>>
  middlewareData: Readonly<Ref<MiddlewareData>>
  isPositioned: Readonly<Ref<boolean>>
  styles: Readonly<Ref<FloatingStyles>>
  update: () => void
}

export interface FloatingRoot {
  refs: FloatingRefs
  state: FloatingState
  position: FloatingPosition
}

export interface FloatingContext extends FloatingRoot {
  /**
   * Deprecated flat aliases kept during the grouped-return transition.
   */
  open: FloatingState["open"]
  setOpen: FloatingState["setOpen"]
  x: FloatingPosition["x"]
  y: FloatingPosition["y"]
  strategy: FloatingPosition["strategy"]
  placement: FloatingPosition["placement"]
  middlewareData: FloatingPosition["middlewareData"]
  isPositioned: FloatingPosition["isPositioned"]
  floatingStyles: FloatingPosition["styles"]
  update: FloatingPosition["update"]
}

export function useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options: UseFloatingOptions = {}
): FloatingContext {
  const stateController = createOpenStateController({
    open: options.open,
    onOpenChange: options.onOpenChange,
  })
  const arrowEl = ref<HTMLElement | null>(null)

  const refs: FloatingRefs = {
    anchorEl,
    floatingEl,
    arrowEl,
    setAnchor: createRefSetter(anchorEl),
    setFloating: createRefSetter(floatingEl),
    setArrow: createRefSetter(arrowEl),
  }

  const positionController = createPositionController({
    anchorEl,
    floatingEl,
    open: stateController.open,
    placement: options.placement,
    strategy: options.strategy,
    transform: options.transform,
    middlewares: options.middlewares,
    autoUpdate: options.autoUpdate,
  })

  const state: FloatingState = {
    open: stateController.open,
    setOpen: stateController.setOpen,
  }

  const position: FloatingPosition = {
    x: positionController.position.x,
    y: positionController.position.y,
    strategy: positionController.position.strategy,
    placement: positionController.position.placement,
    middlewareData: positionController.position.middlewareData,
    isPositioned: positionController.position.isPositioned,
    styles: positionController.position.styles,
    update: positionController.position.update,
  }

  const context = {
    refs,
    state,
    position,
    open: state.open,
    setOpen: state.setOpen,
    x: position.x,
    y: position.y,
    strategy: position.strategy,
    placement: position.placement,
    middlewareData: position.middlewareData,
    isPositioned: position.isPositioned,
    floatingStyles: position.styles,
    update: position.update,
  } satisfies FloatingContext

  setFloatingInternals(context, {
    middlewareRegistry: positionController.middlewareRegistry,
  })

  return context
}
