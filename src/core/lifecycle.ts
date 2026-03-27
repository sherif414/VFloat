import { getCurrentScope, onScopeDispose } from "vue"

export function tryOnScopeDispose(cleanup: () => void): boolean {
  if (!getCurrentScope()) {
    return false
  }

  onScopeDispose(cleanup)
  return true
}

export function createCleanupRegistry() {
  const cleanups = new Set<() => void>()

  const add = (cleanup: () => void) => {
    cleanups.add(cleanup)

    return () => {
      cleanups.delete(cleanup)
    }
  }

  const flush = () => {
    for (const cleanup of [...cleanups].reverse()) {
      cleanups.delete(cleanup)
      cleanup()
    }
  }

  return {
    add,
    flush,
  }
}
