import { readonly, ref } from "vue";

//=======================================================================================
// 📌 Main
//=======================================================================================

const mutableRef = ref(false);

/**
 * Shared signal describing the user's latest input modality.
 */
export const isUsingKeyboard = readonly(mutableRef);

//=======================================================================================
// 📌 Helpers
//=======================================================================================

if (typeof window !== "undefined") {
  const options = { capture: true };

  function switchToKeyboard() {
    mutableRef.value = true;

    window.removeEventListener("keydown", switchToKeyboard, options);
    window.addEventListener("pointerdown", switchToPointer, options);
  }

  function switchToPointer() {
    mutableRef.value = false;

    window.removeEventListener("pointerdown", switchToPointer, options);
    window.addEventListener("keydown", switchToKeyboard, options);
  }

  switchToPointer();
}

//=======================================================================================
// 📌 Types
//=======================================================================================
