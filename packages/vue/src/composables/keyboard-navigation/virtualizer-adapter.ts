import type { MaybeRefOrGetter, Ref } from "vue";
import { toValue } from "vue";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates an adapter from a TanStack `@tanstack/vue-virtual` Virtualizer instance.
 *
 * Bridges the virtualizer's imperative scroll API with VFloat's
 * `useAriaActivedescendant` composable for coordinated virtual list navigation.
 *
 * @param virtualizerRef - A Vue ref holding a TanStack Virtualizer instance.
 * @returns A {@link VirtualizerAdapter} compatible with `useAriaActivedescendant`.
 *
 * @example
 * ```ts
 * const virtualizer = useVirtualizer({
 *   count: items.length,
 *   getScrollElement: () => parentRef.value,
 *   estimateSize: () => 35,
 * });
 * const adapter = createTanStackVirtualAdapter(virtualizer);
 * const { activeIndex } = useAriaActivedescendant({ anchorEl, virtualizer: adapter });
 * ```
 */
export function createTanStackVirtualAdapter(
  virtualizerRef: Ref<{
    scrollToIndex: (
      index: number,
      options?: { align?: "auto" | "start" | "end" | "center" },
    ) => void;
    options: { count: number };
    getVirtualItems: () => Array<{ index: number }>;
  }>,
): VirtualizerAdapter {
  return {
    scrollToIndex: (index, options) => {
      virtualizerRef.value.scrollToIndex(index, {
        align: options?.align ?? "auto",
      });
    },
    count: () => virtualizerRef.value.options.count,
    isIndexRendered: (index) => {
      const items = virtualizerRef.value.getVirtualItems();
      return items.some((item) => item.index === index);
    },
  };
}

/**
 * Creates a generic adapter for a custom virtual scroller implementation.
 *
 * @param options - Custom virtualizer methods conforming to the adapter contract.
 * @returns A {@link VirtualizerAdapter} compatible with `useAriaActivedescendant`.
 *
 * @example
 * ```ts
 * const adapter = createCustomVirtualAdapter({
 *   scrollToIndex: (idx, opts) => myScroller.scrollTo(idx, opts),
 *   count: () => items.value.length,
 * });
 * ```
 */
export function createCustomVirtualAdapter(options: {
  scrollToIndex: (index: number, options?: { align?: "auto" | "start" | "end" | "center" }) => void;
  count?: MaybeRefOrGetter<number>;
  isIndexRendered?: (index: number) => boolean;
}): VirtualizerAdapter {
  return {
    scrollToIndex: options.scrollToIndex,
    count: options.count ? () => toValue(options.count!) : undefined,
    isIndexRendered: options.isIndexRendered,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Adapter interface bridging external virtualizer engines (e.g. TanStack Virtual)
 * with VFloat's active descendant navigation.
 */
export interface VirtualizerAdapter {
  /**
   * Imperatively scrolls to the item at the given index.
   */
  scrollToIndex: (index: number, options?: { align?: "auto" | "start" | "end" | "center" }) => void;

  /**
   * Total item count managed by the virtualizer.
   * When provided, used to resolve `totalCount` when neither `itemCount`
   * nor `elementsList` are supplied.
   */
  count?: MaybeRefOrGetter<number>;

  /**
   * Checks whether a virtual item index is currently mounted in the DOM.
   * Useful for sentinel element strategies or overscan validation.
   */
  isIndexRendered?: (index: number) => boolean;
}
