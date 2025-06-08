import { ref } from "vue"
import { useEventListener } from "@vueuse/core"

export function useComposition() {
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
