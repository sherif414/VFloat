import { ref, readonly } from "vue"
import { useEventListener } from "@vueuse/core"

const mutableRef = ref(false)

// Add listeners only on client-side
if (typeof window !== 'undefined') {
  useEventListener(window, "keydown", () => {
    mutableRef.value = true
  }, { capture: true })

  useEventListener(window, "pointerdown", () => {
    mutableRef.value = false
  }, { capture: true })

  useEventListener(window, "pointermove", () => {
    mutableRef.value = false
  }, { capture: true })
}

/**
 * Track whether the user is currently interacting via the keyboard.
 *
 * A readonly ref that is true when keyboard interactions are detected,
 * false when pointer interactions are detected.
 */
export const isUsingKeyboard = readonly(mutableRef)
