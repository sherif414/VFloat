import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onScopeDispose,
  onWatcherCleanup,
  toValue,
  watch,
  watchEffect,
} from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when hovering the reference element
 *
 * This composable provides event handlers for mouse enter/leave events to control
 * the visibility of floating elements with optional delay and hover behavior
 * for both reference and floating elements.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for hover behavior
 * @returns Event handler props for reference and floating elements
 *
 * @example
 * ```ts
 * const { getReferenceProps, getFloatingProps } = useHover({
 *   open: floating.open,
 *   onOpenChange: floating.onOpenChange,
 *   delay: 200
 * })
 * ```
 */
export function useHover(
  context: FloatingContext & {
    open: Ref<boolean>
    onOpenChange: (open: boolean) => void
  },
  options: UseHoverOptions = {}
): void {
  const { open, onOpenChange, refs } = context
  const { floating } = refs

  const { enabled = true, delay = 0, handleFloatingHover = true, move = false } = options

  let timeoutId: number | null = null
  let handlerRef: ((event: MouseEvent) => void) | null = null
  const reference = computed(() =>
    refs.reference.value instanceof HTMLElement ? refs.reference.value : null
  )

  const closeWithDelay = (runCallback = true) => {
    const closeDelay = getDelay("close")

    if (closeDelay) {
      clearTimeout(timeoutId!)
      timeoutId = window.setTimeout(() => {
        if (runCallback) {
          onOpenChange(false)
        }
      }, closeDelay)
    } else if (runCallback) {
      onOpenChange(false)
    }
  }

  const clearPointerEvents = () => {
    if (handlerRef && reference.value) {
      reference.value.removeEventListener("mousemove", handlerRef)
      handlerRef = null
    }
  }

  const getDelay = (type: "open" | "close"): number => {
    const delayValue = toValue(delay)

    if (typeof delayValue === "number") {
      return delayValue
    }

    return delayValue?.[type] ?? 0
  }

  // Cleanup timeouts on unmount
  onScopeDispose(() => {
    clearTimeout(timeoutId!)
    clearPointerEvents()
  })

  // Determine if the component is enabled
  const isEnabled = computed(() => toValue(enabled))

  // Reset timeout when component is disabled
  watchEffect(() => {
    if (!isEnabled.value && timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  const onMouseenter = (_event: MouseEvent) => {
    if (!isEnabled.value) return

    clearTimeout(timeoutId!)

    const openDelay = getDelay("open")

    if (openDelay) {
      timeoutId = window.setTimeout(() => {
        onOpenChange(true)
      }, openDelay)
    } else {
      onOpenChange(true)
    }

    if (toValue(move) && !handlerRef) {
      handlerRef = () => {
        if (open.value) return

        onOpenChange(true)
      }

      reference.value?.addEventListener("mousemove", handlerRef)
    }
  }

  const onMouseleave = (event: MouseEvent) => {
    if (!isEnabled.value) return

    clearPointerEvents()

    if (!handleFloatingHover || !floating || !event.relatedTarget) {
      closeWithDelay()
      return
    }

    let targetIsNotInsideFloating = true
    let node = event.relatedTarget as Node | null
    while (node) {
      if (node === floating.value) {
        targetIsNotInsideFloating = false
        break
      }
      node = node.parentNode
    }

    if (targetIsNotInsideFloating) {
      closeWithDelay()
    }
  }

  const onMousemove = (event: MouseEvent) => {
    if (!isEnabled.value || !handlerRef) return
    handlerRef(event)
  }

  const onFocus = (_event: FocusEvent) => {
    if (!isEnabled.value) return

    onOpenChange(true)
  }

  const onBlur = (event: FocusEvent) => {
    if (!isEnabled.value) return

    if (!floating) {
      onOpenChange(false)
      return
    }

    if (event.relatedTarget && floating.value?.contains(event.relatedTarget as Node)) {
      return
    }

    onOpenChange(false)
  }

  const onFloatingMouseenter = (_event: MouseEvent) => {
    if (!isEnabled.value || !handleFloatingHover) return

    clearTimeout(timeoutId!)
  }

  const onFloatingMouseleave = (_event: MouseEvent) => {
    if (!isEnabled.value || !handleFloatingHover) return

    closeWithDelay()
  }

  watchEffect(() => {
    const el = reference.value
    if (!el) return

    el.addEventListener("mouseenter", onMouseenter)
    el.addEventListener("mouseleave", onMouseleave)
    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)

    if (toValue(move)) {
      el.addEventListener("mousemove", onMousemove)
    }

    onWatcherCleanup(() => {
      el.removeEventListener("mouseenter", onMouseenter)
      el.removeEventListener("mouseleave", onMouseleave)
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
      el.removeEventListener("mousemove", onMousemove)
    })
  })

  watchEffect(() => {
    const el = floating.value
    if (!el || !toValue(handleFloatingHover)) return

    el.addEventListener("mouseenter", onFloatingMouseenter)
    el.addEventListener("mouseleave", onFloatingMouseleave)

    onWatcherCleanup(() => {
      el.removeEventListener("mouseenter", onFloatingMouseenter)
      el.removeEventListener("mouseleave", onFloatingMouseleave)
    })
  })
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring hover behavior
 */
export interface UseHoverOptions {
  /**
   * Whether hover event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Delay in milliseconds before showing/hiding the floating element
   */
  delay?: MaybeRefOrGetter<number | { open?: number; close?: number }>

  /**
   * Whether to keep the floating element open when hovering over it
   * @default true
   */
  handleFloatingHover?: MaybeRefOrGetter<boolean>

  /**
   * Whether to register move events
   * @default false
   */
  move?: MaybeRefOrGetter<boolean>

  /**
   * For use with FloatingDelayGroup
   * @internal
   */
  restMs?: number
}

/**
 * Return value of the useHover composable
 */
export interface UseHoverReturn {
  /**
   * Reference element props that enable hover functionality
   */
  getReferenceProps: () => {
    onMouseenter: (event: MouseEvent) => void
    onMouseleave: (event: MouseEvent) => void
    onMousemove?: (event: MouseEvent) => void
    onFocus: (event: FocusEvent) => void
    onBlur: (event: FocusEvent) => void
  }

  /**
   * Floating element props that enable hover functionality
   */
  getFloatingProps: () => {
    onMouseenter: (event: MouseEvent) => void
    onMouseleave: (event: MouseEvent) => void
  }
}
