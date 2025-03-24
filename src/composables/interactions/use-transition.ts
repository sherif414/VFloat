import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  nextTick,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages the transition status for floating elements
 *
 * This composable provides state management for transitioning floating elements,
 * tracking whether they are open, closed, or in transition.
 *
 * @param context - The floating context with open state
 * @param options - Configuration options for transitions
 * @returns The transition status and mounting state
 *
 * @example
 * ```ts
 * const { status, isMounted } = useTransitionStatus({
 *   open: floating.open,
 *   duration: 200
 * })
 * ```
 */
export function useTransitionStatus(
  context: FloatingContext & {
    open: Ref<boolean>
  },
  options: UseTransitionOptions = {}
): UseTransitionStatusReturn {
  const { open } = context
  const { enabled = true, duration = 250 } = options

  const isEnabled = computed(() => toValue(enabled))
  const status = ref<TransitionStatus>("unmounted")
  const isMounted = computed(() => status.value !== "unmounted")

  const getDuration = (state: "open" | "close") => {
    const durationValue = toValue(duration)
    return typeof durationValue === "number" ? durationValue : durationValue[state]
  }

  let timeoutId: number | null = null

  // Cleanup timeout on unmount
  onScopeDispose(() => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }
  })

  watch(
    () => open.value,
    (isOpen) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }

      if (!isEnabled.value) {
        status.value = isOpen ? "open" : "unmounted"
        options.onStart?.(isOpen ? "open" : "close")
        options.onComplete?.(isOpen ? "open" : "close")
        return
      }

      if (isOpen) {
        status.value = "initial"

        // DOM forces a reflow, so use nextTick
        nextTick(() => {
          status.value = "open"
          options.onStart?.("open")

          timeoutId = window.setTimeout(() => {
            options.onComplete?.("open")
            timeoutId = null
          }, getDuration("open"))
        })
      } else {
        status.value = "close"
        options.onStart?.("close")

        timeoutId = window.setTimeout(() => {
          status.value = "unmounted"
          options.onComplete?.("close")
          timeoutId = null
        }, getDuration("close"))
      }
    },
    { immediate: true }
  )

  return { status, isMounted }
}

/**
 * Provides transition styles for floating elements
 *
 * This composable generates CSS styles for transitioning floating elements,
 * with configurable duration, easing, and transition properties.
 *
 * @param context - The floating context with open state
 * @param options - Configuration options for transitions
 * @returns CSS styles and mounting state
 *
 * @example
 * ```ts
 * const { styles, isMounted } = useTransitionStyles({
 *   open: floating.open,
 *   duration: 200,
 *   easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
 * })
 * ```
 */
export function useTransitionStyles(
  context: FloatingContext & {
    open: Ref<boolean>
  },
  options: UseTransitionOptions = {}
): UseTransitionStylesReturn {
  const { duration = 250, easing = "ease" } = options

  const { status } = useTransitionStatus(context, options)
  const styles = ref<{
    opacity?: string
    transform?: string
    transition?: string
  }>({})

  const isMounted = computed(() => status.value !== "unmounted")

  const getTransitionProperty = (state: "open" | "close") => {
    const durationValue = toValue(duration)
    const durationMs = typeof durationValue === "number" ? durationValue : durationValue[state]

    const easingValue = toValue(easing)
    const easingFn = typeof easingValue === "string" ? easingValue : easingValue[state]

    return `${durationMs}ms ${easingFn}`
  }

  const setStyles = (state: TransitionStatus) => {
    if (state === "unmounted") {
      styles.value = {}
    } else if (state === "initial") {
      styles.value = {
        opacity: "0",
        transform: "translateY(2px) scale(0.99)",
      }
    } else if (state === "open") {
      styles.value = {
        opacity: "1",
        transform: "translateY(0) scale(1)",
        transition: `opacity ${getTransitionProperty("open")}, transform ${getTransitionProperty(
          "open"
        )}`,
      }
    } else if (state === "close") {
      styles.value = {
        opacity: "0",
        transform: "translateY(2px) scale(0.99)",
        transition: `opacity ${getTransitionProperty("close")}, transform ${getTransitionProperty(
          "close"
        )}`,
      }
    }
  }

  watch(() => status.value, setStyles, { immediate: true })

  return { isMounted, styles }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring transitions
 */
export interface UseTransitionOptions {
  /**
   * Whether transitions are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The duration of the transition in ms
   * @default 250
   */
  duration?: MaybeRefOrGetter<number | { open: number; close: number }>

  /**
   * The CSS transition-timing-function
   * @default 'ease'
   */
  easing?: MaybeRefOrGetter<string | { open: string; close: string }>

  /**
   * Function to call when the transition starts
   */
  onStart?: (state: "open" | "close") => void

  /**
   * Function to call when the transition ends
   */
  onComplete?: (state: "open" | "close") => void
}

/**
 * The possible states of a transition
 */
export type TransitionStatus = "unmounted" | "initial" | "open" | "close"

/**
 * Return value of the useTransitionStatus composable
 */
export interface UseTransitionStatusReturn {
  /**
   * Current status of the transition
   */
  status: Ref<TransitionStatus>

  /**
   * Whether the element is currently mounted in the DOM
   */
  isMounted: Ref<boolean>
}

/**
 * Return value of the useTransitionStyles composable
 */
export interface UseTransitionStylesReturn {
  /**
   * Whether the element is currently mounted in the DOM
   */
  isMounted: Ref<boolean>

  /**
   * CSS styles for the transition
   */
  styles: Ref<{
    opacity?: string
    transform?: string
    transition?: string
  }>
}
