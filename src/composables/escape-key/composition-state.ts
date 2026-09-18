import { effectScope, getCurrentScope, onScopeDispose, type Ref, ref } from "vue";
import { getDocument, isServer } from "@/shared/env";
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
    useEventListener(
      () => getDocument(),
      "compositionstart",
      () => {
        isComposing.value = true;
      },
    );

    useEventListener(
      () => getDocument(),
      "compositionend",
      () => {
        isComposing.value = false;
      },
    );
  });

  sharedCompositionState = {
    scope,
    isComposing,
    consumers: 0,
  };

  return sharedCompositionState;
}
