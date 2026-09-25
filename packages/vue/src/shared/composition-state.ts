import { effectScope, getCurrentScope, onScopeDispose, type Ref, ref } from "vue";
import { getDocument, getWindow, isServer } from "@/shared/env";
import { isWebKit } from "@/shared/platform";
import { useEventListener } from "@/shared/use-event-listener";

interface CompositionState {
  scope: ReturnType<typeof effectScope>;
  isComposing: Ref<boolean>;
  consumers: number;
}

// Shared client-side singleton across all composable instances.
// SSR Safety: The `isServer` guard at the start of `useComposition()` returns early,
// preventing any shared state allocation or leakage across SSR requests.
let sharedCompositionState: CompositionState | undefined;

export type UseCompositionReturn = (event?: KeyboardEvent | null) => boolean;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Exposes an evaluator function to check whether the user is currently composing text through an IME.
 *
 * Maintains a reference-counted shared singleton across active composable scopes, attaching
 * document-level composition listeners only while at least one consumer is active.
 *
 * @returns The `isImeComposing` function.
 */
export function useComposition(): UseCompositionReturn {
  if (isServer) {
    return isImeComposing;
  }

  const state = getSharedCompositionState();

  if (getCurrentScope()) {
    state.consumers += 1;

    onScopeDispose(() => {
      state.consumers -= 1;
      if (state.consumers <= 0) {
        state.scope.stop();
        sharedCompositionState = undefined;
      }
    });
  }

  return isImeComposing;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Returns true if IME text composition is currently active or within the WebKit debounce window.
 *
 * If a `KeyboardEvent` is provided, also checks whether the event itself is marked as composing
 * (`isComposing`, `keyCode === 229`, or `key === "Process"`).
 *
 * @param event - Optional native KeyboardEvent to evaluate.
 */
function isImeComposing(event?: KeyboardEvent | null): boolean {
  if (event) {
    if (event.isComposing || event.key === "Process" || event.keyCode === 229) {
      return true;
    }
  }
  return sharedCompositionState?.isComposing.value ?? false;
}

function getSharedCompositionState(): CompositionState {
  if (sharedCompositionState) {
    return sharedCompositionState;
  }

  const scope = effectScope(true);
  const isComposing = ref(false);

  scope.run(() => {
    let compositionTimeoutId: ReturnType<Window["setTimeout"]> | undefined;

    const clearPendingTimeout = () => {
      if (compositionTimeoutId !== undefined) {
        const ownerWin = getWindow(getDocument());
        ownerWin?.clearTimeout(compositionTimeoutId);
        compositionTimeoutId = undefined;
      }
    };

    useEventListener(
      () => getDocument(),
      "compositionstart",
      () => {
        clearPendingTimeout();
        isComposing.value = true;
      },
    );

    useEventListener(
      () => getDocument(),
      "compositionend",
      () => {
        clearPendingTimeout();

        if (isWebKit()) {
          // WebKit (Safari on macOS and iOS) fires `compositionend` before the trailing
          // `keydown` event (e.g. Escape or Enter) when confirming or cancelling an IME
          // candidate selection.
          //
          // Specification:
          // W3C UI Events § 3.6.5 "Key Events During Composition"
          // https://www.w3.org/TR/uievents/#events-composition-key-events
          //
          // Upstream issue:
          // WebKit Bug 165004: "compositionend event is fired before keydown event"
          // https://bugs.webkit.org/show_bug.cgi?id=165004
          //
          // Upstream fix:
          // WebKit Bug 311717: "Fix a regression and turn on correct composition event ordering by default"
          // https://bugs.webkit.org/show_bug.cgi?id=311717
          //
          // If `isComposing` is reset synchronously on `compositionend`, the trailing `keydown`
          // arrives with `isComposing: false`, erroneously triggering dismissal or activation of floating overlays.
          // In WebKit/Safari, a 0ms/1ms timer can race with the event loop, so a 5ms delay is used.
          const ownerWin = getWindow(getDocument());
          compositionTimeoutId = ownerWin?.setTimeout(() => {
            isComposing.value = false;
            compositionTimeoutId = undefined;
          }, 5);
        } else {
          // Spec-compliant browsers (Chrome, Firefox): the confirmation keydown
          // fires before compositionend with event.isComposing === true.
          // Reset synchronously to avoid a false-positive suppression window.
          isComposing.value = false;
        }
      },
    );

    // --- Stuck State Fallbacks ------------------------------------------------

    // If the window loses focus (e.g. user Alt-Tabs or switches apps) or tab visibility changes
    // during active composition, `compositionend` may never fire. Reset cleanly.
    useEventListener(
      () => getWindow(getDocument()),
      "blur",
      () => {
        clearPendingTimeout();
        isComposing.value = false;
      },
    );

    useEventListener(
      () => getDocument(),
      "visibilitychange",
      () => {
        if (getDocument()?.hidden) {
          clearPendingTimeout();
          isComposing.value = false;
        }
      },
    );

    onScopeDispose(() => {
      clearPendingTimeout();
    });
  });

  sharedCompositionState = {
    scope,
    isComposing,
    consumers: 0,
  };

  return sharedCompositionState;
}
