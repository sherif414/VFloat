import { effectScope, getCurrentScope, onScopeDispose, type Ref, ref } from "vue";
import { useEventListener } from "@/composables/utils/use-event-listener";

interface CompositionState {
  scope: ReturnType<typeof effectScope>;
  isComposing: Ref<boolean>;
  consumers: number;
}

let sharedCompositionState: CompositionState | undefined;

/**
 * Creates the shared IME composition tracker used by keyboard-driven interactions.
 *
 * The listeners live in their own effect scope so multiple composables can share
 * one global source of truth and still clean it up when the last consumer leaves.
 */
function getSharedCompositionState(): CompositionState {
  if (sharedCompositionState) {
    return sharedCompositionState;
  }

  const scope = effectScope(true);
  const isComposing = ref(false);

  scope.run(() => {
    useEventListener(document, "compositionstart", () => {
      isComposing.value = true;
    });

    useEventListener(document, "compositionend", () => {
      isComposing.value = false;
    });
  });

  sharedCompositionState = {
    scope,
    isComposing,
    consumers: 0,
  };

  return sharedCompositionState;
}

/**
 * Exposes whether the user is currently composing text through an IME.
 */
export function useComposition() {
  const state = getSharedCompositionState();

  state.consumers += 1;

  if (getCurrentScope()) {
    onScopeDispose(() => {
      state.consumers -= 1;

      if (state.consumers <= 0) {
        // Tear down the shared listeners once nothing depends on them anymore.
        state.scope.stop();
        sharedCompositionState = undefined;
      }
    });
  }

  return {
    isComposing: state.isComposing,
  };
}
