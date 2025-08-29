import type { PointerType } from "@vueuse/core"
import { useEventListener } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-tree"
import {
  findDescendantContainingTarget,
  getContextFromParameter,
  isButtonTarget,
  isClickOnScrollbar,
  isEventTargetWithin,
  isHTMLElement,
  isMouseLikePointerType,
  isSpaceIgnored,
  isTargetWithinElement,
  isVirtualElement,
} from "./utils"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the reference element
 * and optionally when clicking outside both the reference and floating elements.
 *
 * This composable provides unified event handlers for both inside click interactions
 * (to open/toggle floating elements) and outside click interactions (to close them).
 *
 * The composable supports both standalone usage with FloatingContext and tree-aware
 * usage with TreeNode<FloatingContext> for complex nested floating UI structures.
 *
 * @param context - The floating context or tree node with open state and change handler.
 * @param options - Configuration options for click behavior.
 *
 * @example Basic standalone usage with outside click enabled
 * ```ts
 * const context = useFloating(...)
 * useClick(context, {
 *   toggle: true,
 *   outsideClick: true,
 *   outsideEvent: 'pointerdown'
 * })
 * ```
 *
 * @example Tree-aware usage for nested floating elements
 * ```ts
 * const tree = useFloatingTree(rootContext)
 * const parentNode = tree.root
 * const childNode = tree.addNode(childContext, parentNode.id)
 *
 * // Tree-aware behavior: child won't close when clicked,
 * // but will close when parent or outside is clicked
 * useClick(childNode, { outsideClick: true })
 * ```
 *
 * @example Custom outside click handler
 * ```ts
 * useClick(context, {
 *   outsideClick: true,
 *   onOutsideClick: (event, context) => {
 *     if (confirm('Close dialog?')) {
 *       context.setOpen(false)
 *     }
 *   }
 * })
 * ```
 */
export function useClick(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseClickOptions = {}
): void {
  // Extract floating context from either standalone context or tree node
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const { open, setOpen, refs } = floatingContext
  const {
    enabled = true,
    event: eventOption = "click",
    toggle = true,
    ignoreMouse = false,
    ignoreKeyboard = false,
    ignoreTouch = false,
    // Outside click options
    outsideClick = false,
    outsideEvent = "pointerdown",
    outsideCapture = true,
    onOutsideClick,
    preventScrollbarClick = true,
    handleDragEvents = true,
  } = options

  let pointerType: PointerType | undefined
  let didKeyDown = false
  let dragStartedInside = false
  let interactionInProgress = false

  const isEnabled = computed(() => toValue(enabled))
  const isOutsideClickEnabled = computed(() => toValue(outsideClick))

  const anchorEl = computed(() => {
    const el = refs.anchorEl.value
    if (!el) return null
    if (el instanceof HTMLElement) return el
    if (isVirtualElement(el) && el.contextElement instanceof HTMLElement) {
      return el.contextElement
    }
    return null
  })

  const floatingEl = computed(() => refs.floatingEl.value)

  // --- Event Handlers --- //

  function handleOpenChange() {
    interactionInProgress = true
    try {
      if (open.value) {
        toValue(toggle) && setOpen(false)
      } else {
        setOpen(true)
      }
    } finally {
      // Reset interaction state after a micro-task to allow events to complete
      Promise.resolve().then(() => {
        interactionInProgress = false
      })
    }
  }

  function resetInteractionState() {
    pointerType = undefined
    didKeyDown = false
    dragStartedInside = false
  }

  function onPointerDown(e: PointerEvent) {
    pointerType = e.pointerType as PointerType
  }

  function onMouseDown(e: MouseEvent) {
    // Ignore non-primary buttons
    if (e.button !== 0) return
    if (toValue(eventOption) === "click") return
    if (shouldIgnorePointerType(pointerType)) return

    handleOpenChange()
  }

  function onClick(): void {
    if (toValue(eventOption) === "mousedown" && pointerType) {
      // If pointerdown exists, reset it and skip click, as mousedown handled it.
      resetInteractionState()
      return
    }

    if (shouldIgnorePointerType(pointerType)) {
      resetInteractionState()
      return
    }

    handleOpenChange()
    resetInteractionState()
  }

  function onKeyDown(e: KeyboardEvent) {
    pointerType = undefined

    if (e.defaultPrevented || toValue(ignoreKeyboard) || isButtonTarget(e)) {
      return
    }

    const el = anchorEl.value
    if (!el) return

    if (e.key === " " && !isSpaceIgnored(el)) {
      // Prevent scrolling
      e.preventDefault()
      didKeyDown = true
    }

    if (e.key === "Enter") {
      handleOpenChange()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const el = anchorEl.value // Get current element inside handler
    if (!el) return

    if (e.defaultPrevented || toValue(ignoreKeyboard) || isButtonTarget(e) || isSpaceIgnored(el)) {
      return
    }

    if (e.key === " " && didKeyDown) {
      didKeyDown = false
      handleOpenChange()
    }
  }

  // --- Outside Click Event Handlers ---

  function onOutsideClickHandler(event: MouseEvent) {
    if (!isEnabled.value || !isOutsideClickEnabled.value || !open.value) {
      return
    }

    // A `mousedown` or `pointerdown` event started inside and ended outside.
    if (toValue(outsideEvent) === "click" && toValue(handleDragEvents) && dragStartedInside) {
      dragStartedInside = false
      return
    }

    // Don't process outside clicks during ongoing interactions
    if (interactionInProgress) {
      return
    }

    const target = event.target as Node | null
    if (!target) return

    // Clicked on a scrollbar
    if (
      toValue(preventScrollbarClick) &&
      isHTMLElement(target) &&
      floatingEl.value &&
      isClickOnScrollbar(event, target)
    ) {
      return
    }

    // Use tree-aware logic if tree context is available
    if (treeContext) {
      if (!isClickOutsideNodeHierarchy(treeContext, target)) {
        return
      }
    } else {
      if (
        isEventTargetWithin(event, anchorEl.value) ||
        isEventTargetWithin(event, floatingEl.value)
      ) {
        return
      }
    }

    // Use custom handler if provided, otherwise use default behavior
    if (onOutsideClick) {
      onOutsideClick(event, floatingContext)
    } else {
      setOpen(false)
    }
  }

  function onFloatingMouseDown() {
    dragStartedInside = true
  }

  function onFloatingMouseUp() {
    // Reset drag state after a brief delay to allow click events to process
    setTimeout(() => {
      dragStartedInside = false
    }, 0)
  }

  // --- Helper Functions ---

  function shouldIgnorePointerType(type: PointerType | undefined): boolean {
    if (isMouseLikePointerType(type, true) && toValue(ignoreMouse)) {
      return true
    }
    if (type === "touch" && toValue(ignoreTouch)) {
      return true
    }
    return false
  }

  // --- Watch for changes in enabled state or reference element ---

  watchPostEffect(() => {
    const el = anchorEl.value
    if (!isEnabled.value || !el) return

    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("click", onClick)
    el.addEventListener("keydown", onKeyDown)
    el.addEventListener("keyup", onKeyUp)

    onWatcherCleanup(() => {
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("mousedown", onMouseDown)
      el.removeEventListener("click", onClick)
      el.removeEventListener("keydown", onKeyDown)
      el.removeEventListener("keyup", onKeyUp)
      // Reset state on cleanup
      resetInteractionState()
    })
  })

  // --- Outside Click Listeners ---

  // Document listener for outside clicks
  useEventListener(
    () => (isEnabled.value && isOutsideClickEnabled.value ? document : null),
    () => toValue(outsideEvent),
    onOutsideClickHandler,
    { capture: toValue(outsideCapture) }
  )

  // Floating element listeners for drag detection
  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(handleDragEvents)
        ? floatingEl.value
        : null,
    "mousedown",
    onFloatingMouseDown,
    { capture: true }
  )

  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(handleDragEvents)
        ? floatingEl.value
        : null,
    "mouseup",
    onFloatingMouseUp,
    { capture: true }
  )
}

//=======================================================================================
// 📌 Tree-Aware Logic Helpers
//=======================================================================================

/**
 * Determines if a click occurred outside the current node's hierarchy.
 *
 * Returns true if the click should close the current node (click is outside),
 * false if the click should be ignored (click is on current node or descendants).
 *
 * @param currentNode - The tree node to check against
 * @param target - The click target
 * @returns True if the click is outside the node hierarchy and should close the node
 */
function isClickOutsideNodeHierarchy(
  currentNode: TreeNode<FloatingContext>,
  target: Node
): boolean {
  // Check if click is within current node's elements
  if (
    isTargetWithinElement(target, currentNode.data.refs.anchorEl.value) ||
    isTargetWithinElement(target, currentNode.data.refs.floatingEl.value)
  ) {
    return false // Click on current node - don't close
  }

  // Check if click is within any descendant
  const descendantNode = findDescendantContainingTarget(currentNode, target)
  if (descendantNode) {
    return false // Click on descendant - don't close
  }

  // Click is outside the node hierarchy - should close
  return true
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring the useClick behavior.
 */
export interface UseClickOptions {
  // --- Inside Click Options ---

  /**
   * Whether the Hook is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The type of event to use to determine a "click" with mouse input.
   * Keyboard clicks work as normal.
   * @default 'click'
   */
  event?: MaybeRefOrGetter<"click" | "mousedown">

  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore the logic for mouse input.
   * @default false
   */
  ignoreMouse?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore keyboard handlers (Enter and Space key functionality).
   * @default false
   */
  ignoreKeyboard?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore touch events.
   * @default false
   */
  ignoreTouch?: MaybeRefOrGetter<boolean>

  // --- Outside Click Options ---

  /**
   * Whether to enable outside click detection to close the floating element.
   * @default false
   */
  outsideClick?: MaybeRefOrGetter<boolean>

  /**
   * The event to use for outside click detection.
   * @default 'pointerdown'
   */
  outsideEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">

  /**
   * Whether to use capture phase for document outside click listener.
   * @default true
   */
  outsideCapture?: MaybeRefOrGetter<boolean>

  /**
   * Custom function to handle outside clicks.
   * If provided, this function will be called instead of the default behavior.
   * The function receives the event and context as parameters.
   * @param event - The mouse event that triggered the outside click
   * @param context - The floating context containing refs and state
   */
  onOutsideClick?: (event: MouseEvent, context: FloatingContext) => void

  /**
   * Whether to prevent clicks on scrollbars from triggering outside click.
   * @default true
   */
  preventScrollbarClick?: MaybeRefOrGetter<boolean>

  /**
   * Whether to handle drag events that start inside and end outside.
   * @default true
   */
  handleDragEvents?: MaybeRefOrGetter<boolean>
}
