import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, ref, toValue } from "vue"

// =======================================================================================
// 📌 Types
// =======================================================================================

export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to use capture phase for document event listeners.
   * @default false
   */
  capture?: boolean

  /**
   * Callback function to be executed when the escape key is pressed.
   */
  onEscape: (event: KeyboardEvent) => void
}

// =======================================================================================
// 📌 Composition
// =======================================================================================

/**
 * A composable to handle the escape key press, with composition event handling.
 *
 * @param options - {@link UseEscapeKeyOptions}
 */
export function useEscapeKey(options: UseEscapeKeyOptions): void {
  const { enabled = true, onEscape, capture } = options
  const { isComposing } = useComposition()

  useEventListener(
    document,
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !toValue(enabled) || isComposing()) {
        return
      }
      onEscape(event)
    },
    capture
  )
}

// =======================================================================================
// 📌 Helper Functions
// =======================================================================================

function useComposition() {
  const isComposing = ref(false)

  useEventListener(document, "compositionstart", () => {
    isComposing.value = true
  })

  useEventListener(document, "compositionend", () => {
    isComposing.value = false
  })

  return {
    isComposing: () => isComposing.value,
  }
}
