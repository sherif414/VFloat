import { useEventListener } from "@vueuse/core"
import { readonly, ref } from "vue"

const mutableRef = ref(false)

if (typeof window !== "undefined") {
  useEventListener(
    window,
    "keydown",
    () => {
      mutableRef.value = true
    },
    { capture: true }
  )

  useEventListener(
    window,
    "pointerdown",
    () => {
      mutableRef.value = false
    },
    { capture: true }
  )

  useEventListener(
    window,
    "pointermove",
    () => {
      mutableRef.value = false
    },
    { capture: true }
  )
}

export const isUsingKeyboard = readonly(mutableRef)
