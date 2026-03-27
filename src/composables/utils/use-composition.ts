import { effectScope, getCurrentScope, onScopeDispose, type Ref, ref } from "vue"
import { useEventListener } from "@/composables/utils/use-event-listener"

interface CompositionState {
  scope: ReturnType<typeof effectScope>
  isComposing: Ref<boolean>
  consumers: number
}

let sharedCompositionState: CompositionState | undefined

function getSharedCompositionState(): CompositionState {
  if (sharedCompositionState) {
    return sharedCompositionState
  }

  const scope = effectScope(true)
  const isComposing = ref(false)

  scope.run(() => {
    useEventListener(document, "compositionstart", () => {
      isComposing.value = true
    })

    useEventListener(document, "compositionend", () => {
      isComposing.value = false
    })
  })

  sharedCompositionState = {
    scope,
    isComposing,
    consumers: 0,
  }

  return sharedCompositionState
}

export function useComposition() {
  const state = getSharedCompositionState()

  state.consumers += 1

  if (getCurrentScope()) {
    onScopeDispose(() => {
      state.consumers -= 1

      if (state.consumers <= 0) {
        state.scope.stop()
        sharedCompositionState = undefined
      }
    })
  }

  return {
    isComposing: state.isComposing,
  }
}
