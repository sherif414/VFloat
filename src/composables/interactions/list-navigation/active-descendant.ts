import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { ref, toValue, watch } from "vue";

export interface UseActiveDescendantOptions {
  virtual: MaybeRefOrGetter<boolean>;
  open: Ref<boolean>;
}

export interface UseActiveDescendantReturn {
  activeItem: Ref<HTMLElement | null>;
  cleanup: () => void;
}

/**
 * Manages "Virtual Focus" (via aria-activedescendant) for a list of items.
 */
export function useActiveDescendant(
  anchorEl: ComputedRef<HTMLElement | null>,
  listRef: Ref<Array<HTMLElement | null>>,
  activeIndex: MaybeRefOrGetter<number | null>,
  options: UseActiveDescendantOptions,
): UseActiveDescendantReturn {
  const activeItem = ref<HTMLElement | null>(null);
  let currentAnchor: HTMLElement | null = null;

  const clearActiveDescendant = () => {
    currentAnchor?.removeAttribute("aria-activedescendant");
    currentAnchor = null;
    activeItem.value = null;
  };

  const stopWatch = watch(
    [() => toValue(options.virtual), options.open, () => toValue(activeIndex), anchorEl, listRef],
    ([isVirtual, isOpen, idx], _oldValues, onCleanup) => {
      clearActiveDescendant();

      const anchor = anchorEl.value;
      onCleanup(clearActiveDescendant);

      if (!anchor || !isVirtual || !isOpen || idx == null) {
        return;
      }

      const el = listRef.value[idx];

      if (!el) {
        return;
      }

      if (!el.id) {
        if (import.meta.env.DEV) {
          console.warn(
            "[useActiveDescendant] List item at index",
            idx,
            "is missing an 'id' attribute. All list items must have stable IDs for proper accessibility.",
          );
        }
        return;
      }

      anchor.setAttribute("aria-activedescendant", el.id);
      currentAnchor = anchor;
      activeItem.value = el;
    },
    {
      flush: "post",
      immediate: true,
    },
  );

  return {
    activeItem,
    cleanup: () => {
      stopWatch();
      clearActiveDescendant();
    },
  };
}
