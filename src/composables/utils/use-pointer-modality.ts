import { ref } from "vue"
import { useEventListener } from "@vueuse/core"

export function usePointerModality() {
  const isPointer = ref(true)

  useEventListener(window, "keydown", () => {
    isPointer.value = false
  }, { capture: true })

  useEventListener(window, "pointerdown", () => {
    isPointer.value = true
  }, { capture: true })

  useEventListener(window, "pointermove", () => {
    isPointer.value = true
  }, { capture: true })

  return isPointer
}
