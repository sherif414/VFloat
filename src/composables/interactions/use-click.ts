import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, computed, toValue } from "vue"
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
export function useClick(context: FloatingContext, options: UseClickOptions = {}): void {
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

  const reference = computed(() =>
    context.refs.reference.value instanceof HTMLElement ? context.refs.reference.value : null
  )
  useEventListener(reference, event, eventHandler)
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
