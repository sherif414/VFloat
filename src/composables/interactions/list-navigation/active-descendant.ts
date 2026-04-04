import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { ref, toValue, watch } from "vue";

export interface UseActiveDescendantOptions {
  virtual: MaybeRefOrGetter<boolean>;
  open: Ref<boolean>;
}

export interface UseActiveDescendantReturn {
  activeItem: Ref<HTMLElement | null>;
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

  watch(
    [() => toValue(options.virtual), options.open, () => toValue(activeIndex), anchorEl, listRef],
    ([isVirtual, isOpen, idx], _oldValues, onCleanup) => {
      const anchor = anchorEl.value;

      onCleanup(() => {
        anchor?.removeAttribute("aria-activedescendant");
      });

      if (!anchor || !isVirtual || !isOpen || idx == null) {
        activeItem.value = null;
        return;
      }

      const el = listRef.value[idx];

      if (!el) {
        activeItem.value = null;
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
        activeItem.value = null;
        return;
      }

      anchor.setAttribute("aria-activedescendant", el.id);
      activeItem.value = el;
    },
    {
      flush: "post",
    },
  );

  return { activeItem };
}
