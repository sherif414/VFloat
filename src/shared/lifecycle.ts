import { getCurrentScope, onScopeDispose } from "vue";

/**
 * Registers a cleanup only when called inside an active Vue effect scope.
 */
export function tryOnScopeDispose(cleanup: () => void): boolean {
  if (!getCurrentScope()) {
    return false;
  }

  onScopeDispose(cleanup);
  return true;
}

/**
 * Collects multiple cleanup callbacks and flushes them in reverse order so later setup is torn down first.
 */
export function createCleanupRegistry() {
  const cleanups = new Set<() => void>();

  const add = (cleanup: () => void) => {
    cleanups.add(cleanup);

    return () => {
      cleanups.delete(cleanup);
    };
  };

  const flush = () => {
    for (const cleanup of [...cleanups].reverse()) {
      cleanups.delete(cleanup);
      cleanup();
    }
  };

  return {
    add,
    flush,
  };
}
