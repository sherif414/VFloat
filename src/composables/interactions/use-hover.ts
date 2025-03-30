import {
  type MaybeRef,
  type Ref,
  computed,
  nextTick,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue"
import type { FloatingContext, FloatingElement, ReferenceElement } from "../use-floating"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

type PointerType = "mouse" | "pen" | "touch" | null
type MaybeElement = HTMLElement | null | undefined

export interface HandleCloseContext {
  context: FloatingContext
  open: boolean
  pointerType: PointerType
  x: number
  y: number
  referenceEl: ReferenceElement
  floatingEl: FloatingElement
  isPointInFloating(event: PointerEvent | MouseEvent | TouchEvent): boolean
  originalEvent?: Event
}

export type HandleCloseFn = (
  context: HandleCloseContext,
  onClose: () => void
) => undefined | (() => void)

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
   * @default 0
   */
  restMs?: MaybeRef<number>

  /**
   * Whether hover events should only trigger for mouse pointers.
   * When false, touch interactions will also trigger hover.
   * @default false
   */
  mouseOnly?: MaybeRef<boolean>

  /**
   * If true, moving the mouse over the reference element after entering
   * will trigger the floating element to open immediately.
   * @default true
   */
  move?: MaybeRef<boolean>

  /**
   * Custom function to control closing behavior when pointer leaves
   * the reference element or floating element. Use this for custom
   * behaviors like follow-cursor or safe triangles.
   * @default null
   */
  handleClose?: MaybeRef<HandleCloseFn | null>
}

//=======================================================================================
// 📌 Constants
//=======================================================================================

const SAFE_POLYGON_ATTRIBUTE = "data-usehover-safe-polygon-blocking"
const POINTER_MOVE_THRESHOLD = 10 // Threshold in pixels for movement detection

//=======================================================================================
// 📌 Helper Functions
//=======================================================================================

function getElement(elRef: Ref<ReferenceElement | FloatingElement>): HTMLElement | null {
  const el = toValue(elRef)
  if (!el || el instanceof HTMLElement) return el

  // Get contextElement for VirtualElement if needed for listeners
  if (el.contextElement instanceof HTMLElement) {
    return el.contextElement
  }

  return null
}

function isMouseLikePointerType(pointerType: PointerType): boolean {
  return pointerType === "mouse" || pointerType === "pen"
}

//=======================================================================================
// 📌 Main Logic
//=======================================================================================

/**
 * Enables showing/hiding the floating element when hovering the reference element
 * with enhanced behaviors like delayed open/close, rest detection, and custom
 * exit handling.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for hover behavior
 *
 * @example
 * ```ts
 * const context = useFloating(...)
 * useHover(context, {
 *   delay: { open: 100, close: 300 },
 *   restMs: 150
 * })
 * ```
 */
export function useHover(context: FloatingContext, options: UseHoverOptions = {}): void {
  const { open, onOpenChange, refs } = context
  const {
    enabled: enabledOption = true,
    delay: delayOption = 0,
    restMs: restMsOption = 0,
    mouseOnly: mouseOnlyOption = false,
    move: moveOption = true,
    handleClose: handleCloseOption = null,
  } = options

  //-------------------------
  // State
  //-------------------------
  const pointerType = ref<PointerType>(null)
  // Change from refs to regular variables for timeout IDs
  let openTimeoutId: ReturnType<typeof setTimeout> | null = null
  let closeTimeoutId: ReturnType<typeof setTimeout> | null = null
  let restTimeoutId: ReturnType<typeof setTimeout> | null = null
  const isPointerInside = ref(false) // Tracks if pointer is over reference OR floating
  const isPointerInsideReference = ref(false) // Tracks specifically reference
  const isResting = ref(false) // Tracks if restMs condition was met
  const previousOpen = ref(open.value) // Track external open state changes
  const isHoverLogicBlocked = ref(false) // Prevents hover close if opened by non-hover
  const restCoords = ref<{ x: number; y: number } | null>(null)

  // HandleClose state - use regular variables for non-reactive state
  let handleCloseCleanup: (() => void) | undefined = undefined
  const isHandleCloseLogicActive = ref(false)
  let latestLeaveEvent: PointerEvent | MouseEvent | null = null

  // One-time move listener state
  let oneTimeMoveListenerAttached = false

  //-------------------------
  // Computed Options
  //-------------------------
  const enabled = computed(() => toValue(enabledOption))
  const mouseOnly = computed(() => toValue(mouseOnlyOption))
  const move = computed(() => toValue(moveOption))
  const restMs = computed(() => toValue(restMsOption))
  const handleClose = computed(() => toValue(handleCloseOption))
  const reference = computed(() => getElement(refs.reference))
  const floating = computed(() => refs.floating.value)

  const { openDelay, closeDelay } = computed(() => {
    const delay = toValue(delayOption)
    if (typeof delay === "number") {
      return { openDelay: delay, closeDelay: delay }
    }
    return {
      openDelay: delay?.open ?? 0,
      closeDelay: delay?.close ?? 0,
    }
  }).value

  //-------------------------
  // Timeout Management
  //-------------------------
  function clearTimeouts() {
    if (openTimeoutId) clearTimeout(openTimeoutId)
    if (closeTimeoutId) clearTimeout(closeTimeoutId)
    if (restTimeoutId) clearTimeout(restTimeoutId)
    openTimeoutId = null
    closeTimeoutId = null
    restTimeoutId = null
  }

  function clearOpenTimeout() {
    if (openTimeoutId) clearTimeout(openTimeoutId)
    openTimeoutId = null
  }

  function clearCloseTimeout() {
    if (closeTimeoutId) clearTimeout(closeTimeoutId)
    closeTimeoutId = null
  }

  function clearRestTimeout() {
    if (restTimeoutId) clearTimeout(restTimeoutId)
    restTimeoutId = null
    isResting.value = false
    restCoords.value = null
  }

  //-------------------------
  // Open/Close Control
  //-------------------------
  function openWithDelay(isFromPointerEnter = true) {
    clearCloseTimeout()
    if (open.value || openTimeoutId) return

    if (isFromPointerEnter && isHoverLogicBlocked.value) return

    const effectiveOpenDelay = isMouseLikePointerType(pointerType.value) ? openDelay : 0

    if (effectiveOpenDelay > 0) {
      openTimeoutId = setTimeout(() => {
        onOpenChange(true)
        openTimeoutId = null
      }, effectiveOpenDelay)
    } else {
      onOpenChange(true)
    }
  }

  function closeWithDelay() {
    clearOpenTimeout()
    clearRestTimeout()
    if (!open.value || closeTimeoutId) return

    const effectiveCloseDelay = isMouseLikePointerType(pointerType.value) ? closeDelay : 0

    if (effectiveCloseDelay > 0) {
      closeTimeoutId = setTimeout(() => {
        if (!isPointerInside.value) {
          onOpenChange(false)
        }
        closeTimeoutId = null
      }, effectiveCloseDelay)
    } else {
      onOpenChange(false)
    }
  }

  //-------------------------
  // Rest Detection
  //-------------------------
  function startRestDetection(event: PointerEvent | MouseEvent) {
    clearRestTimeout()
    if (restMs.value <= 0 || openDelay > 0) return

    restCoords.value = { x: event.clientX, y: event.clientY }

    restTimeoutId = setTimeout(() => {
      if (restCoords.value) {
        isResting.value = true
        openWithDelay()
      }
      restTimeoutId = null
    }, restMs.value)
  }

  function handleRestMove(event: PointerEvent | MouseEvent) {
    if (restMs.value <= 0 || openDelay > 0 || !restCoords.value) return

    const dx = Math.abs(event.clientX - restCoords.value.x)
    const dy = Math.abs(event.clientY - restCoords.value.y)

    if (dx > POINTER_MOVE_THRESHOLD || dy > POINTER_MOVE_THRESHOLD) {
      clearRestTimeout()
      startRestDetection(event)
    }
  }

  //-------------------------
  // Safe Polygon Logic
  //-------------------------
  function blockBodyPointerEvents() {
    document.body.style.pointerEvents = "none"
    document.body.setAttribute(SAFE_POLYGON_ATTRIBUTE, "true")
    const refEl = getElement(refs.reference)
    const fltEl = getElement(refs.floating)
    if (refEl) refEl.style.pointerEvents = "auto"
    if (fltEl) fltEl.style.pointerEvents = "auto"
  }

  function unblockBodyPointerEvents() {
    if (document.body.getAttribute(SAFE_POLYGON_ATTRIBUTE)) {
      document.body.style.pointerEvents = ""
      document.body.removeAttribute(SAFE_POLYGON_ATTRIBUTE)
    }
  }

  function cleanupHandleClose() {
    if (handleCloseCleanup) {
      handleCloseCleanup()
      handleCloseCleanup = undefined
    }
    unblockBodyPointerEvents()
    document.removeEventListener("pointermove", NATIVE_onPointerMoveForHandleClose)
    document.removeEventListener("scroll", NATIVE_onScrollOrLeaveForHandleClose, true)
    document.removeEventListener("pointerleave", NATIVE_onScrollOrLeaveForHandleClose)
    isHandleCloseLogicActive.value = false
    latestLeaveEvent = null
  }

  function createHandleCloseContext(event: PointerEvent | MouseEvent): HandleCloseContext {
    const referenceEl = toValue(refs.reference)
    const floatingEl = toValue(refs.floating)

    return {
      context,
      open: open.value,
      pointerType: pointerType.value,
      x: event.clientX,
      y: event.clientY,
      referenceEl,
      floatingEl,
      isPointInFloating: (ev: PointerEvent | MouseEvent | TouchEvent) => {
        const flt = getElement(refs.floating)
        if (!flt) return false
        const target = ev.target as Node
        return flt.contains(target)
      },
      originalEvent: event,
    }
  }

  //-------------------------
  // Native Event Handlers
  //-------------------------
  const NATIVE_triggerCloseFromHandleClose = () => {
    cleanupHandleClose()
    closeWithDelay()
  }

  const NATIVE_onPointerMoveForHandleClose = () => {
    // This function primarily exists so the user's handleClose can access
    // real-time pointer movements if it needs to.
  }

  const NATIVE_onScrollOrLeaveForHandleClose = (event: Event) => {
    if (handleClose.value && isHandleCloseLogicActive.value && latestLeaveEvent) {
      const contextSnapshot: HandleCloseContext = createHandleCloseContext(latestLeaveEvent)
      contextSnapshot.originalEvent = event

      handleCloseCleanup = handleClose.value(contextSnapshot, NATIVE_triggerCloseFromHandleClose)
    } else {
      cleanupHandleClose()
      closeWithDelay()
    }
  }

  //-------------------------
  // Event Handlers
  //-------------------------
  const onPointerEnterReference = (event: PointerEvent) => {
    if (!enabled.value || (mouseOnly.value && event.pointerType !== "mouse")) {
      return
    }
    pointerType.value = event.pointerType as PointerType
    isPointerInside.value = true
    isPointerInsideReference.value = true

    if (isHandleCloseLogicActive.value) {
      cleanupHandleClose()
    }

    clearCloseTimeout()

    if (open.value) return

    isHoverLogicBlocked.value = false

    if (restMs.value > 0 && openDelay <= 0) {
      startRestDetection(event)
    } else {
      openWithDelay()
    }
  }

  const onPointerEnterFloating = (event: PointerEvent) => {
    if (!enabled.value || (mouseOnly.value && event.pointerType !== "mouse")) {
      return
    }
    pointerType.value = event.pointerType as PointerType
    isPointerInside.value = true

    if (isHandleCloseLogicActive.value) {
      cleanupHandleClose()
    }

    clearCloseTimeout()
  }

  const onPointerLeaveReference = (event: PointerEvent) => {
    if (!enabled.value || (mouseOnly.value && event.pointerType !== "mouse")) return
    isPointerInsideReference.value = false
    pointerType.value = event.pointerType as PointerType

    const floatingEl = getElement(refs.floating)
    if (floatingEl && event.relatedTarget && floatingEl.contains(event.relatedTarget as Node)) {
      clearRestTimeout()
      return
    }

    isPointerInside.value = false
    clearRestTimeout()

    if (handleClose.value) {
      clearCloseTimeout()
      latestLeaveEvent = event

      nextTick(() => {
        if (!isPointerInside.value && handleClose.value && !isHandleCloseLogicActive.value) {
          isHandleCloseLogicActive.value = true
          blockBodyPointerEvents()

          const contextSnapshot = createHandleCloseContext(event)
          handleCloseCleanup = handleClose.value(
            contextSnapshot,
            NATIVE_triggerCloseFromHandleClose
          )

          document.addEventListener("pointermove", NATIVE_onPointerMoveForHandleClose, {
            passive: true,
          })
          document.addEventListener("scroll", NATIVE_onScrollOrLeaveForHandleClose, {
            capture: true,
            passive: true,
          })
          document.documentElement.addEventListener(
            "pointerleave",
            NATIVE_onScrollOrLeaveForHandleClose
          )
        }
      })
    } else {
      closeWithDelay()
    }
  }

  const onPointerLeaveFloating = (event: PointerEvent) => {
    if (!enabled.value) return
    pointerType.value = event.pointerType as PointerType

    let referenceHtmlEl = null
    const refVal = toValue(refs.reference)
    if (refVal instanceof HTMLElement) {
      referenceHtmlEl = refVal
    } else if (refVal?.contextElement instanceof HTMLElement) {
      referenceHtmlEl = refVal.contextElement
    }

    if (
      referenceHtmlEl &&
      event.relatedTarget &&
      referenceHtmlEl.contains(event.relatedTarget as Node)
    ) {
      return
    }

    isPointerInside.value = false

    if (handleClose.value) {
      clearCloseTimeout()
      latestLeaveEvent = event

      nextTick(() => {
        if (!isPointerInside.value && handleClose.value && !isHandleCloseLogicActive.value) {
          isHandleCloseLogicActive.value = true
          blockBodyPointerEvents()
          const contextSnapshot = createHandleCloseContext(event)
          handleCloseCleanup = handleClose.value(
            contextSnapshot,
            NATIVE_triggerCloseFromHandleClose
          )
          document.addEventListener("pointermove", NATIVE_onPointerMoveForHandleClose, {
            passive: true,
          })
          document.addEventListener("scroll", NATIVE_onScrollOrLeaveForHandleClose, {
            capture: true,
            passive: true,
          })
          document.documentElement.addEventListener(
            "pointerleave",
            NATIVE_onScrollOrLeaveForHandleClose
          )
        }
      })
    } else {
      closeWithDelay()
    }
  }

  const onPointerMoveReference = (event: PointerEvent) => {
    if (!enabled.value || (mouseOnly.value && event.pointerType !== "mouse")) {
      return
    }
    pointerType.value = event.pointerType as PointerType

    handleRestMove(event)

    if (
      move.value &&
      !open.value &&
      !openTimeoutId &&
      !restTimeoutId &&
      isPointerInsideReference.value
    ) {
      clearCloseTimeout()
      isHoverLogicBlocked.value = false
      openWithDelay()
    }
  }

  const onPointerMoveReferenceOnce = (event: PointerEvent) => {
    if (move.value && !open.value && !openTimeoutId && !restTimeoutId) {
      pointerType.value = event.pointerType as PointerType
      isHoverLogicBlocked.value = false
      openWithDelay()
    }
    const refEl = getElement(refs.reference)
    if (refEl) {
      refEl.removeEventListener("pointermove", onPointerMoveReferenceOnce)
      oneTimeMoveListenerAttached = false
    }
  }

  const onPointerEnterReferenceForMove = () => {
    if (
      move.value &&
      !oneTimeMoveListenerAttached &&
      !open.value &&
      !openTimeoutId &&
      isPointerInsideReference.value
    ) {
      const el = reference.value
      if (el) {
        el.addEventListener("pointermove", onPointerMoveReferenceOnce)
        oneTimeMoveListenerAttached = true
      }
    }
  }

  //-------------------------
  // Event Listener Management
  //-------------------------
  function removeReferenceListeners(el: MaybeElement) {
    if (!el) return
    el.removeEventListener("pointerenter", onPointerEnterReference)
    el.removeEventListener("pointerleave", onPointerLeaveReference)
    el.removeEventListener("pointermove", onPointerMoveReference)
    el.removeEventListener("pointermove", onPointerMoveReferenceOnce)
    el.removeEventListener("pointerenter", onPointerEnterReferenceForMove)
  }

  function removeFloatingListeners(el: MaybeElement) {
    if (!el) return
    el.removeEventListener("pointerenter", onPointerEnterFloating)
    el.removeEventListener("pointerleave", onPointerLeaveFloating)
  }

  function attachReferenceListeners(el: HTMLElement | null) {
    if (!el) return
    el.addEventListener("pointerenter", onPointerEnterReference)
    el.addEventListener("pointerenter", onPointerEnterReferenceForMove)
    el.addEventListener("pointerleave", onPointerLeaveReference)
    el.addEventListener("pointermove", onPointerMoveReference)
  }

  function attachFloatingListeners(el: HTMLElement | null) {
    if (!el) return
    el.addEventListener("pointerenter", onPointerEnterFloating)
    el.addEventListener("pointerleave", onPointerLeaveFloating)
  }

  //-------------------------
  // Watchers
  //-------------------------
  watch(open, (newOpen, oldOpen) => {
    if (newOpen && !oldOpen && !isPointerInside.value) {
      isHoverLogicBlocked.value = true
    }

    if (!newOpen && oldOpen) {
      clearTimeouts()
      clearRestTimeout()
      cleanupHandleClose()
      isHoverLogicBlocked.value = false
    }
    previousOpen.value = newOpen
  })

  watch(
    [reference, floating, enabled],
    ([referenceEl, floatingEl, isEnabled], [oldRef, oldFlt]) => {
      removeReferenceListeners(oldRef)
      removeFloatingListeners(oldFlt)
      oneTimeMoveListenerAttached = false

      cleanupHandleClose()

      if (isEnabled) {
        attachReferenceListeners(referenceEl)
        attachFloatingListeners(floatingEl)
      }
    },
    { immediate: true, flush: "post" }
  )

  //-------------------------
  // Cleanup
  //-------------------------
  onScopeDispose(() => {
    clearTimeouts()
    clearRestTimeout()
    cleanupHandleClose()

    const referenceEl = getElement(refs.reference)
    const floatingEl = getElement(refs.floating)

    removeReferenceListeners(referenceEl)
    removeFloatingListeners(floatingEl)

    unblockBodyPointerEvents()
  })
}
