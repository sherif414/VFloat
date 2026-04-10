import { type MaybeRefOrGetter, toValue, watch } from "vue";
import type { Fn } from "@/types";

/**
 * Attaches an event listener to a reactive target and keeps it in sync as the target or event name changes.
 */
export function useEventListener<TEvent extends Event = Event>(
  target: MaybeRefOrGetter<EventTarget | null | undefined>,
  event: MaybeRefOrGetter<string>,
  listener: (event: TEvent) => void,
  options?: boolean | AddEventListenerOptions,
): Fn {
  let removeListener: Fn | undefined;

  const cleanup = () => {
    removeListener?.();
    removeListener = undefined;
  };

  const stopWatch = watch(
    () => [toValue(target), toValue(event)] as const,
    ([currentTarget, currentEvent], _, onCleanup) => {
      cleanup();

      if (!currentTarget || !currentEvent) return;

      const listenerOptions =
        typeof options === "object" && options !== null ? { ...options } : options;

      currentTarget.addEventListener(currentEvent, listener as EventListener, listenerOptions);

      removeListener = () => {
        currentTarget.removeEventListener(currentEvent, listener as EventListener, listenerOptions);
      };

      onCleanup(cleanup);
    },
    {
      immediate: true,
      flush: "post",
    },
  );

  return () => {
    stopWatch();
    cleanup();
  };
}
