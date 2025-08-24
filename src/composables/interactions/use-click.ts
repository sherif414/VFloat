import type { PointerType } from "@vueuse/core"
import { useEventListener } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-tree"
import type { VirtualElement } from "@floating-ui/dom"

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

    // Prevent stealing focus from the floating element if it's already open
    // and reference is not the target (e.g. clicking scrollbar).
    const target = e.target as HTMLElement | null
    if (!open.value && target && anchorEl.value?.contains(target)) {
      e.preventDefault()
    }

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

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Checks if the pointer type is mouse-like (mouse or pen).
 * @param pointerType - The pointer type string.
 * @param strict - If true, only considers "mouse".
 * @returns True if the pointer type is mouse-like.
 */
function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false
  const isMouse = pointerType === "mouse"
  return strict ? isMouse : isMouse || pointerType === "pen"
}

/**
 * Checks if the event target is a button-like element.
 * @param event - The KeyboardEvent.
 * @returns True if the target is a button.
 */
function isButtonTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  return (
    target.tagName === "BUTTON" ||
    (target.tagName === "INPUT" && target.getAttribute("type") === "button") ||
    target.getAttribute("role") === "button"
  )
}

/**
 * Checks if the element is an input, textarea, or contenteditable element.
 * @param element - The element to check.
 * @returns True if the element is typeable.
 */
function isTypeableElement(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element.isContentEditable && element.contentEditable !== "false")
  )
}

/**
 * Checks if the Space key press should be ignored for the given element.
 * @param element - The element to check.
 * @returns True if Space should be ignored.
 */
function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element)
}

/**
 * Checks if the value is an HTML element.
 * @param node - The value to check.
 * @returns True if the value is an HTML element.
 */
function isHTMLElement(node: unknown | null): node is HTMLElement {
  return node instanceof Element && node instanceof HTMLElement
}

/**
 * Checks if the value is a VirtualElement.
 * @param el - The value to check.
 * @returns True if the value is a VirtualElement.
 */
function isVirtualElement(el: unknown): el is VirtualElement {
  return typeof el === "object" && el !== null && "contextElement" in el
}

/**
 * Checks if the event target is within the given element.
 * @param event - The event to check.
 * @param element - The element to check containment against.
 * @returns True if the event target is within the element.
 */
function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false

  if ("composedPath" in event && typeof event.composedPath === "function") {
    return (event.composedPath() as Node[]).includes(element)
  }

  return element.contains(event.target as Node)
}

/**
 * Checks if a click event occurred on a scrollbar.
 * @param event - The mouse event.
 * @param target - The target HTML element.
 * @returns True if the click was on a scrollbar.
 */
function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect()
  const scrollbarWidth = target.offsetWidth - target.clientWidth
  const scrollbarHeight = target.offsetHeight - target.clientHeight

  // Convert event coordinates to element-relative coordinates
  const elementX = event.clientX - rect.left
  const elementY = event.clientY - rect.top

  // Check vertical scrollbar (typically on the right)
  if (scrollbarWidth > 0) {
    const scrollbarStart = target.clientWidth
    if (elementX >= scrollbarStart && elementX <= target.offsetWidth) {
      return true
    }
  }

  // Check horizontal scrollbar (typically on the bottom)
  if (scrollbarHeight > 0) {
    const scrollbarStart = target.clientHeight
    if (elementY >= scrollbarStart && elementY <= target.offsetHeight) {
      return true
    }
  }

  return false
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
