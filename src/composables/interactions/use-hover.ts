import type { Coords } from "@floating-ui/dom"
import {
  computed,
  type MaybeRef,
  onScopeDispose,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "../positioning/use-floating"
import { type SafePolygonOptions, safePolygon } from "./polygon"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

export interface UseHoverOptions {
  /**
   * Whether hover event listeners are enabled.
   * @default true
   */
  enabled?: MaybeRef<boolean>

  /**
   * Delay in milliseconds before showing/hiding the floating element.
   * Can be a single number for both open and close, or an object
   * specifying different delays.
   * @default 0
   */
  delay?: MaybeRef<number | { open?: number; close?: number }>

  /**
   * Time in milliseconds the pointer must rest within the reference
   * element before opening the floating element.
   * this option is ignored if an open delay is specified.
   * @default 0
   */
  restMs?: MaybeRef<number>

  /**
   * Whether hover events should only trigger for mouse like pointers (mouse, pen ,stylus ..etc).
   * @default false
   */
  mouseOnly?: MaybeRef<boolean>

  /**
   * Enable floating-ui style safe polygon algorithm that keeps the
   * floating element open while the pointer traverses the rectangle/triangle
   * region between the reference and floating elements.
   * – `true` → enabled with defaults
   * – `false | undefined` → disabled (current behaviour)
   * – `SafePolygonOptions` → enabled with custom buffer
   */
  safePolygon?: MaybeRef<boolean | SafePolygonOptions>
}

//=======================================================================================
// 📌 Constants
//=======================================================================================

const POINTER_MOVE_THRESHOLD = 10 // Threshold in pixels for movement detection

//=======================================================================================
// 📌 Helper Functions
//=======================================================================================

interface UseDelayedOpenOptions {
  delay: MaybeRef<number | { open?: number; close?: number }>
}

function useDelayedOpen(
  show: (event?: Event) => void,
  hide: (event?: Event) => void,
  options: UseDelayedOpenOptions
) {
  const { delay } = options

  const showDelay = computed<number>(() => {
    const delayVal = toValue(delay)
    return (typeof delayVal === "number" ? delayVal : delayVal.open) ?? 0
  })
  const hideDelay = computed<number>(() => {
    const delayVal = toValue(delay)
    return (typeof delayVal === "number" ? delayVal : delayVal.close) ?? 0
  })

  let showTimeoutID: ReturnType<typeof setTimeout> | undefined
  let hideTimeoutID: ReturnType<typeof setTimeout> | undefined

  const clearTimeouts = () => {
    clearTimeout(showTimeoutID)
    clearTimeout(hideTimeoutID)
  }

  onScopeDispose(clearTimeouts)

  return {
    show: (overrideDelay?: number, event?: Event) => {
      clearTimeouts()
      const resolvedDelay = overrideDelay ?? showDelay.value

      if (resolvedDelay === 0) show(event)
      else showTimeoutID = setTimeout(() => show(event), resolvedDelay)
    },

    hide: (overrideDelay?: number, event?: Event) => {
      clearTimeouts()
      const resolvedDelay = overrideDelay ?? hideDelay.value

      if (resolvedDelay === 0) hide(event)
      else hideTimeoutID = setTimeout(() => hide(event), resolvedDelay)
    },

    showDelay,
    hideDelay,
    clearTimeouts,
  }
}

//=======================================================================================
// 📌 Main Logic
//=======================================================================================

/**
 * Enables showing/hiding the floating element when hovering the reference element
 * with enhanced behaviors like delayed open/close, rest detection, and custom
 * exit handling.
 *
 * The composable supports both standalone usage with FloatingContext and tree-aware
 * usage with TreeNode<FloatingContext> for complex nested floating UI structures.
 *
 * @param context - The floating context or tree node with open state and change handler
 * @param options - Configuration options for hover behavior
 *
 * @example Basic standalone usage
 * ```ts
 * const context = useFloating(...)
 * useHover(context, {
 *   delay: { open: 100, close: 300 },
 *   restMs: 150
 * })
 * ```
 *
 * @example Tree-aware usage for nested floating elements
 * ```ts
 * const tree = useFloatingTree(rootContext)
 * const parentNode = tree.root
 * const childNode = tree.addNode(childContext, parentNode.id)
 *
 * // Tree-aware behavior: child hover won't end when hovering over child,
 * // but will end when hovering outside the entire hierarchy
 * useHover(childNode, {
 *   delay: { close: 300 },
 *   safePolygon: true
 * })
 * ```
 */
export function useHover(context: FloatingContext, options: UseHoverOptions = {}): void {
  const {
    open,
    setOpen,
    refs: { anchorEl, floatingEl },
  } = context
  const {
    enabled: enabledOption = true,
    delay = 0,
    restMs: restMsOption = 0,
    mouseOnly = false,
    safePolygon: safePolygonOption = false,
  } = options

  const enabled = computed(() => toValue(enabledOption))
  const restMs = computed(() => toValue(restMsOption))
  const reference = computed(() => {
    const el = anchorEl.value
    if (!el || el instanceof HTMLElement) return el
    return (el.contextElement as HTMLElement) ?? null
  })

  const { hide, show, showDelay, clearTimeouts } = useDelayedOpen(
    (event?: Event) => {
      open.value || setOpen(true, "hover", event)
    },
    (event?: Event) => {
      open.value && setOpen(false, "hover", event)
    },
    { delay }
  )

  //-------------------------
  // Rest Detection
  //-------------------------

  let restCoords: Coords | null = null
  let restTimeoutId: ReturnType<typeof setTimeout> | undefined
  const isRestMsEnabled = computed<boolean>(() => showDelay.value === 0 && restMs.value > 0)

  function onPointerMoveForRest(e: PointerEvent): void {
    if (!enabled.value || !isValidPointerType(e) || !isRestMsEnabled.value) return
    if (!restCoords) return
    const newCoords = { x: e.clientX, y: e.clientY }

    const dx = Math.abs(newCoords.x - restCoords.x)
    const dy = Math.abs(newCoords.y - restCoords.y)

    if (dx > POINTER_MOVE_THRESHOLD || dy > POINTER_MOVE_THRESHOLD) {
      restCoords = newCoords
      clearTimeout(restTimeoutId)
      restTimeoutId = setTimeout(() => {
        show(0, e)
      }, restMs.value)
    }
  }

  function onPointerEnterForRest(e: PointerEvent) {
    if (!enabled.value || !isValidPointerType(e) || !isRestMsEnabled.value) return
    restCoords = { x: e.clientX, y: e.clientY }
    restTimeoutId = setTimeout(() => {
      show(0, e)
    }, restMs.value)
  }

  function onPointerLeaveForRest() {
    clearTimeout(restTimeoutId)
    restCoords = null
  }

  watchPostEffect(() => {
    const el = reference.value
    if (!el || !enabled.value || !isRestMsEnabled.value) return
    el.addEventListener("pointerenter", onPointerEnterForRest)
    el.addEventListener("pointermove", onPointerMoveForRest)
    el.addEventListener("pointerleave", onPointerLeaveForRest)

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onPointerEnterForRest)
      el.removeEventListener("pointermove", onPointerMoveForRest)
      el.removeEventListener("pointerleave", onPointerLeaveForRest)
    })
  })

  onScopeDispose(() => {
    clearTimeout(restTimeoutId)
  })

  //-------------------------
  // General Event Handlers
  //-------------------------
  function isValidPointerType(e: PointerEvent): boolean {
    if (toValue(mouseOnly)) {
      // When mouseOnly is true, only accept actual mouse events
      return e.pointerType === "mouse"
    }
    // When mouseOnly is false, accept mouse, pen, and touch
    return true
  }

  function onPointerEnterReference(e: PointerEvent): void {
    if (!enabled.value || !isValidPointerType(e) || isRestMsEnabled.value) return
    cleanupPolygon()
    show(undefined, e)
  }

  function onPointerEnterFloating(e: PointerEvent): void {
    if (!enabled.value || !isValidPointerType(e)) return
    clearTimeouts()
    cleanupPolygon()
  }

  let polygonMouseMoveHandler: ((e: MouseEvent) => void) | null = null

  function cleanupPolygon() {
    if (polygonMouseMoveHandler) {
      document.removeEventListener("pointermove", polygonMouseMoveHandler)
      polygonMouseMoveHandler = null
    }
    // Clear the polygon visualization
    const polygonOptions = safePolygonOptions.value
    if (polygonOptions?.onPolygonChange) {
      polygonOptions.onPolygonChange([])
    }
  }

  const safePolygonEnabled = computed(() => !!toValue(safePolygonOption))
  const safePolygonOptions = computed<SafePolygonOptions | undefined>(() => {
    const val = toValue(safePolygonOption)
    if (typeof val === "object" && val) return val
    if (val === true) return {}
    return undefined
  })

  function onPointerLeave(e: PointerEvent): void {
    if (!enabled.value || !isValidPointerType(e)) return

    const { clientX, clientY } = e
    const relatedTarget = e.relatedTarget as Node | null

    if (safePolygonEnabled.value) {
      setTimeout(() => {
        cleanupPolygon()
        const refEl = reference.value
        const floatEl = floatingEl.value

        if (!refEl || !floatEl) {
          hide(undefined, e)
          return
        }

        polygonMouseMoveHandler = safePolygon(safePolygonOptions.value)({
          x: clientX,
          y: clientY,
          placement: context.placement.value,
          elements: {
            domReference: refEl,
            floating: floatEl,
          },
          buffer: safePolygonOptions.value?.buffer ?? 1,
          onClose: () => {
            cleanupPolygon()
            hide(undefined)
          },
        })

        if (polygonMouseMoveHandler) {
          document.addEventListener("pointermove", polygonMouseMoveHandler)
        }
      }, 0)
    } else {
      // Standard logic for standalone usage
      if (floatingEl.value?.contains(relatedTarget)) {
        return // Pointer moved to floating element - don't hide
      }

      hide(undefined, e)
    }
  }

  watchPostEffect(() => {
    const el = reference.value
    if (!el || !enabled.value) return

    el.addEventListener("pointerenter", onPointerEnterReference)
    el.addEventListener("pointerleave", onPointerLeave)

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onPointerEnterReference)
      el.removeEventListener("pointerleave", onPointerLeave)
    })
  })

  watchPostEffect(() => {
    const el = floatingEl.value
    if (!el || !enabled.value) return

    el.addEventListener("pointerenter", onPointerEnterFloating)
    el.addEventListener("pointerleave", onPointerLeave)

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onPointerEnterFloating)
      el.removeEventListener("pointerleave", onPointerLeave)
    })
  })

  onScopeDispose(() => {
    cleanupPolygon()
  })
}
