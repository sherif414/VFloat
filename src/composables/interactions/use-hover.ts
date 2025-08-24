import type { Fn } from "@/types"
import type { Coords } from "@floating-ui/dom"
import {
  type MaybeRef,
  computed,
  onScopeDispose,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext, FloatingElement, AnchorElement } from "../use-floating"
import type { TreeNode } from "@/composables/use-tree"
import { safePolygon, type SafePolygonOptions } from "./polygon"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

type PointerType = "mouse" | "pen" | "touch" | null

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

function isMouseLikePointerType(pointerType: PointerType): boolean {
  return pointerType === "mouse" || pointerType === "pen"
}

interface UseDelayedOpenOptions {
  delay: MaybeRef<number | { open?: number; close?: number }>
}

function useDelayedOpen(show: Fn, hide: Fn, options: UseDelayedOpenOptions) {
  const { delay } = options

  const showDelay = computed<number>(() => {
    const delayVal = toValue(delay)
    return (typeof delayVal === "number" ? delayVal : delayVal.open) ?? 0
  })
  const hideDelay = computed<number>(() => {
    const delayVal = toValue(delay)
    return (typeof delayVal === "number" ? delayVal : delayVal.close) ?? 0
  })

  let showTimeoutID: ReturnType<typeof setTimeout> | undefined = undefined
  let hideTimeoutID: ReturnType<typeof setTimeout> | undefined = undefined

  const clearTimeouts = () => {
    clearTimeout(showTimeoutID)
    clearTimeout(hideTimeoutID)
  }

  onScopeDispose(clearTimeouts)

  return {
    show: (overrideDelay?: number) => {
      clearTimeouts()
      const resolvedDelay = overrideDelay ?? showDelay.value

      if (resolvedDelay === 0) show()
      else showTimeoutID = setTimeout(show, resolvedDelay)
    },

    hide: (overrideDelay?: number) => {
      clearTimeouts()
      const resolvedDelay = overrideDelay ?? hideDelay.value

      if (resolvedDelay === 0) hide()
      else hideTimeoutID = setTimeout(hide, resolvedDelay)
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
export function useHover(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseHoverOptions = {}
): void {
  // Extract floating context from either standalone context or tree node
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const {
    open,
    setOpen,
    refs: { anchorEl, floatingEl },
  } = floatingContext
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
    () => {
      open.value || setOpen(true)
    },
    () => {
      open.value && setOpen(false)
    },
    { delay }
  )

  //-------------------------
  // Rest Detection
  //-------------------------

  let restCoords: Coords | null = null
  let restTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined
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
        show(0)
      }, restMs.value)
    }
  }

  function onPointerEnterForRest(e: PointerEvent) {
    if (!enabled.value || !isValidPointerType(e) || !isRestMsEnabled.value) return
    restCoords = { x: e.clientX, y: e.clientY }
    restTimeoutId = setTimeout(() => {
      show(0)
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
    show()
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
  }

  const safePolygonEnabled = computed(() => !!toValue(safePolygonOption))
  const safePolygonOptions = computed<SafePolygonOptions | undefined>(() => {
    const val = toValue(safePolygonOption)
    if (typeof val === "object" && val) return val
    if (val === true) return {}
    return undefined
  })

  function onPointerLeave(e: PointerEvent): void {
    if (!enabled.value || !isValidPointerType(e)) return;

    const { clientX, clientY } = e;
    const relatedTarget = e.relatedTarget as Node | null;

    if (safePolygonEnabled.value) {
      setTimeout(() => {
        cleanupPolygon();
        const refEl = reference.value;
        const floatEl = floatingEl.value;

        if (!refEl || !floatEl) {
          hide();
          return;
        }

        // Use tree-aware polygon if tree context is available
        if (treeContext) {
          polygonMouseMoveHandler = createTreeAwareSafePolygon(
            treeContext,
            { x: clientX, y: clientY },
            safePolygonOptions.value,
            floatingContext,
            () => {
              cleanupPolygon();
              hide();
            }
          );
        } else {
          polygonMouseMoveHandler = safePolygon(safePolygonOptions.value)({
            x: clientX,
            y: clientY,
            placement: floatingContext.placement.value,
            elements: {
              domReference: refEl,
              floating: floatEl,
            },
            buffer: safePolygonOptions.value?.buffer ?? 1,
            onClose: () => {
              cleanupPolygon();
              hide();
            },
          });
        }
        
        if (polygonMouseMoveHandler) {
          document.addEventListener("pointermove", polygonMouseMoveHandler);
        }
      }, 0);
    } else {
      // Use tree-aware logic if tree context is available
      if (treeContext) {
        if (!isPointerLeavingNodeHierarchy(treeContext, relatedTarget)) {
          return; // Pointer moved to current node or descendant - don't hide
        }
      } else {
        // Standard logic for standalone usage
        if (floatingEl.value?.contains(relatedTarget)) {
          return; // Pointer moved to floating element - don't hide
        }
      }
      
      hide();
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

//=======================================================================================
// 📌 Tree-Aware Helper Functions
//=======================================================================================

/**
 * Type guard to determine if the context parameter is a TreeNode.
 * @param context - The context parameter to check
 * @returns True if the context is a TreeNode
 */
function isTreeNode(
  context: FloatingContext | TreeNode<FloatingContext>
): context is TreeNode<FloatingContext> {
  return (
    context !== null &&
    typeof context === "object" &&
    "data" in context &&
    "id" in context &&
    "children" in context &&
    "parent" in context
  )
}

/**
 * Extracts floating context and tree context from the parameter.
 * @param context - Either a FloatingContext or TreeNode<FloatingContext>
 * @returns Object containing both floating context and optional tree context
 */
function getContextFromParameter(context: FloatingContext | TreeNode<FloatingContext>): {
  floatingContext: FloatingContext
  treeContext: TreeNode<FloatingContext> | null
} {
  if (isTreeNode(context)) {
    return {
      floatingContext: context.data,
      treeContext: context,
    }
  }
  return {
    floatingContext: context,
    treeContext: null,
  }
}

/**
 * Checks if a target node is within an anchor or floating element, handling VirtualElement.
 * @param target - The target node to check
 * @param element - The element to check containment against (can be VirtualElement or null)
 * @returns True if the target is within the element
 */
function isTargetWithinElement(target: Node, element: any): boolean {
  if (!element) return false

  // Handle VirtualElement (has contextElement)
  if (typeof element === "object" && element !== null && "contextElement" in element) {
    const contextElement = element.contextElement
    if (contextElement instanceof Element) {
      return contextElement.contains(target)
    }
    return false
  }

  // Handle regular Element
  if (element instanceof Element) {
    return element.contains(target)
  }

  return false
}

/**
 * Determines if the pointer is leaving to an area outside the current node's hierarchy.
 *
 * Returns true if the hover should end (pointer left to outside area),
 * false if the hover should continue (pointer moved to current node or descendants).
 *
 * @param currentNode - The tree node to check against
 * @param target - The related target from the pointer leave event
 * @returns True if the pointer left to outside the node hierarchy
 */
function isPointerLeavingNodeHierarchy(
  currentNode: TreeNode<FloatingContext>,
  target: Node | null
): boolean {
  if (!target) {
    return true // No related target means leaving to outside
  }

  // Check if pointer moved to current node's elements
  if (
    isTargetWithinElement(target, currentNode.data.refs.anchorEl.value) ||
    isTargetWithinElement(target, currentNode.data.refs.floatingEl.value)
  ) {
    return false // Pointer moved to current node - don't end hover
  }

  // Check if pointer moved to any open descendant
  const descendantNode = findDescendantContainingTarget(currentNode, target)
  if (descendantNode) {
    return false // Pointer moved to descendant - don't end hover
  }

  // Pointer left to outside the node hierarchy - should end hover
  return true
}

/**
 * Finds a descendant node that contains the target element.
 * @param node - The parent node to search from
 * @param target - The target element to find
 * @returns The descendant node containing the target, or null
 */
function findDescendantContainingTarget(
  node: TreeNode<FloatingContext>,
  target: Node
): TreeNode<FloatingContext> | null {
  for (const child of node.children.value) {
    if (child.data.open.value) {
      if (
        isTargetWithinElement(target, child.data.refs.anchorEl.value) ||
        isTargetWithinElement(target, child.data.refs.floatingEl.value)
      ) {
        return child
      }

      // Recursively check descendants
      const descendant = findDescendantContainingTarget(child, target)
      if (descendant) return descendant
    }
  }
  return null
}

/**
 * Creates a tree-aware safe polygon that considers descendant floating elements.
 * @param currentNode - The tree node context
 * @param exitPoint - The pointer exit coordinates
 * @param options - Safe polygon options
 * @param context - The floating context
 * @param onClose - Callback to execute when polygon should close
 * @returns Enhanced polygon handler function
 */
function createTreeAwareSafePolygon(
  currentNode: TreeNode<FloatingContext>,
  exitPoint: Coords,
  options: SafePolygonOptions | undefined,
  context: FloatingContext,
  onClose: () => void
): ((event: MouseEvent) => void) | null {
  const refEl = currentNode.data.refs.anchorEl.value
  const floatEl = currentNode.data.refs.floatingEl.value

  if (!refEl || !floatEl) {
    return null
  }

  // For tree-aware mode, we need to consider descendant elements
  // The safe polygon should not close if pointer moves to a descendant
  const originalPolygon = safePolygon(options)({
    x: exitPoint.x,
    y: exitPoint.y,
    placement: context.placement.value,
    elements: {
      domReference: refEl,
      floating: floatEl,
    },
    buffer: options?.buffer ?? 1,
    onClose: () => {
      onClose()
    },
  })

  // Wrap the original polygon with tree-aware logic
  return (event: MouseEvent) => {
    const target = event.target as Node | null
    if (!target) {
      originalPolygon(event)
      return
    }

    // Check if pointer moved to a descendant element
    const descendantNode = findDescendantContainingTarget(currentNode, target)
    if (descendantNode) {
      // Pointer moved to descendant - don't close, cleanup polygon
      onClose() // This will cleanup the polygon but won't hide
      return
    }

    // Use original polygon logic for all other cases
    originalPolygon(event)
  }
}
