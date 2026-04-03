import { readonly, ref } from "vue";

const mutableRef = ref(false);

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

  // Start in "pointer mode" so the first keyboard interaction flips the flag.
  switchToPointer();
}

/**
 * Shared signal describing the user's latest input modality.
 *
 * Focus-based interactions use this to avoid treating pointer focus the same
 * way as keyboard focus-visible navigation.
 */
export const isUsingKeyboard = readonly(mutableRef);
