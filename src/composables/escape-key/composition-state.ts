import { effectScope, getCurrentScope, onScopeDispose, type Ref, ref } from "vue";
import { getDocument, getWindow, isServer } from "@/shared/env";
import { isWebKit } from "@/shared/platform";
import { useEventListener } from "@/shared/use-event-listener";

interface CompositionState {
  scope: ReturnType<typeof effectScope>;
  isComposing: Ref<boolean>;
  consumers: number;
}

let sharedCompositionState: CompositionState | undefined;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Exposes whether the user is currently composing text through an IME.
 */
export function useComposition() {
  if (isServer) {
    return {
      isComposing: ref(false),
    };
  }

  const state = getSharedCompositionState();

  state.consumers += 1;

  if (getCurrentScope()) {
    onScopeDispose(() => {
      state.consumers -= 1;
      if (state.consumers <= 0) {
        state.scope.stop();
        sharedCompositionState = undefined;
      }
    });
  }

  return {
    isComposing: state.isComposing,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function getSharedCompositionState(): CompositionState {
  if (sharedCompositionState) {
    return sharedCompositionState;
  }

  const scope = effectScope(true);
  const isComposing = ref(false);

  scope.run(() => {
    let compositionTimeoutId: ReturnType<typeof setTimeout> | number | undefined;

    const clearPendingTimeout = () => {
      if (compositionTimeoutId !== undefined) {
        const ownerWin = getWindow(getDocument());
        ownerWin?.clearTimeout(compositionTimeoutId as number);
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

        // WebKit (Safari on macOS and iOS) fires `compositionend` before the trailing
        // `keydown` event (e.g. Escape or Enter) when confirming or cancelling an IME
        // candidate selection.
        //
        // Specification:
        // W3C UI Events § 3.5.3.3 "Composition Events and Key Events"
        // https://www.w3.org/TR/uievents/#events-composition-key-events
        //
        // Upstream issue:
        // WebKit Bug 165004: "compositionend event is fired before keydown event"
        // https://bugs.webkit.org/show_bug.cgi?id=165004
        //
        // If `isComposing` is reset synchronously on `compositionend`, the trailing `keydown`
        // arrives with `isComposing: false`, erroneously triggering dismissal of floating overlays.
        // To preserve IME protection during the trailing keydown, delay resetting `isComposing`
        // until the next event loop tick. In WebKit/Safari, a 0ms/1ms timer can race with the
        // event loop, so a 5ms delay is used. In non-WebKit environments, 0ms executes on the
        // next macrotask.
        const ownerWin = getWindow(getDocument());
        const delay = isWebKit() ? 5 : 0;

        compositionTimeoutId = ownerWin?.setTimeout(() => {
          isComposing.value = false;
          compositionTimeoutId = undefined;
        }, delay);
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
