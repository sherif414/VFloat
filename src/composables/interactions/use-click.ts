import { type MaybeRefOrGetter, type Ref, computed, toValue } from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the reference element
 *
 * This composable provides event handlers for click interactions with the reference element
 * to control the visibility of the floating element.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for click behavior
 * @returns Event handler props for the reference element
 *
 * @example
 * ```ts
 * const { getReferenceProps } = useClick(context,{
 *   event: "mousedown",
 * })
 * ```
 */
export function useClick(context: FloatingContext, options: UseClickOptions = {}): UseClickReturn {
  const { open, onOpenChange } = context
  const { enabled = true, toggle = true, event = "click", ignoreNonPrimaryClick = false } = options

  const isEnabled = computed(() => toValue(enabled))

  const eventHandler = (event: MouseEvent) => {
    if (!isEnabled.value) return

    if (toValue(ignoreNonPrimaryClick) && event.button !== 0) {
      return
    }

    if (toValue(toggle)) {
      onOpenChange(!open.value)
    } else {
      onOpenChange(true)
    }
  }

  return {
    getReferenceProps: () => {
      const clickEvent = toValue(event)

      switch (clickEvent) {
        case "mousedown":
          return { onMousedown: eventHandler }
        case "mouseup":
          return { onMouseup: eventHandler }
        default:
          return { onClick: eventHandler }
      }
    },
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring click behavior on reference elements
 */
export interface UseClickOptions {
  /**
   * Whether click event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to toggle or just set the open state on click
   * @default true
   */
  toggle?: MaybeRefOrGetter<boolean>

  /**
   * The event to listen for
   * @default 'click'
   */
  event?: MaybeRefOrGetter<"mousedown" | "mouseup" | "click">

  /**
   * Whether to ignore mouse button events other than left click
   * @default false
   */
  ignoreNonPrimaryClick?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useClick composable
 */
export interface UseClickReturn {
  /**
   * Reference element props that enable click functionality
   */
  getReferenceProps: () => {
    onClick?: (event: MouseEvent) => void
    onMousedown?: (event: MouseEvent) => void
    onMouseup?: (event: MouseEvent) => void
  }
}
