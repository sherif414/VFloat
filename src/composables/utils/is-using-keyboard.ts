import { readonly, ref } from "vue"

const mutableRef = ref(false)

if (typeof window !== "undefined") {
  const options = { capture: true }

  function switchToKeyboard() {
    mutableRef.value = true

    window.removeEventListener("keydown", switchToKeyboard, options)
    window.addEventListener("pointerdown", switchToPointer, options)
  }

  function switchToPointer() {
    mutableRef.value = false

    window.removeEventListener("pointerdown", switchToPointer, options)
    window.addEventListener("keydown", switchToKeyboard, options)
  }

  switchToPointer()
}

export const isUsingKeyboard = readonly(mutableRef)
