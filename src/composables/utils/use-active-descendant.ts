import { type ComputedRef, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue"

export interface UseActiveDescendantOptions {
  virtual: MaybeRefOrGetter<boolean>
  open: Ref<boolean>
}

export interface UseActiveDescendantReturn {
  /**
   * Reference to the currently active element in the list.
   * Updated whenever the active index changes.
   */
  activeItem: Ref<HTMLElement | null>
}

/**
 * Manages "Virtual Focus" (via aria-activedescendant) for a list of items.
 *
 * **Important:** All items in `listRef` MUST have an `id` attribute set in the template.
 * The composable will not auto-generate IDs to avoid hydration mismatches and re-render issues.
 *
 * @param anchorEl - The element that will receive the aria-activedescendant attribute
 * @param listRef - Array of list item elements (each must have an id attribute)
 * @param activeIndex - The currently active index in the list
 * @param options - Configuration options
 * @returns Object containing the activeItem ref
 */
export function useActiveDescendant(
  anchorEl: ComputedRef<HTMLElement | null>,
  listRef: Ref<Array<HTMLElement | null>>,
  activeIndex: MaybeRefOrGetter<number | null>,
  options: UseActiveDescendantOptions
): UseActiveDescendantReturn {
  const activeItem = ref<HTMLElement | null>(null)

  watch(
    [() => toValue(options.virtual), options.open, () => toValue(activeIndex), anchorEl, listRef],
    ([isVirtual, isOpen, idx], _oldValues, onCleanup) => {
      const anchor = anchorEl.value

      // Cleanup function to remove attribute when component unmounts or watcher re-runs
      // Note: Only cleanup DOM state, not activeItem to prevent state flickering
      onCleanup(() => {
        anchor?.removeAttribute("aria-activedescendant")
      })

      // Early return if conditions not met - cleanup already handled attribute removal
      if (!anchor || !isVirtual || !isOpen || idx == null) {
        activeItem.value = null
        return
      }

      const el = listRef.value[idx]

      // Fix: Clear active item when element is not found (cleanup already removed attribute)
      if (!el) {
        activeItem.value = null
        return
      }

      // Fix: Require IDs to be set in the template - don't mutate DOM directly
      if (!el.id) {
        if (import.meta.env.DEV) {
          console.warn(
            "[useActiveDescendant] List item at index",
            idx,
            "is missing an 'id' attribute. All list items must have stable IDs for proper accessibility."
          )
        }
        activeItem.value = null
        return
      }

      // Set the aria-activedescendant attribute and update the active item
      anchor.setAttribute("aria-activedescendant", el.id)
      activeItem.value = el
    },
    {
      // Ensure watcher runs after DOM updates to avoid race conditions
      // when activeIndex and list data change simultaneously
      flush: "post",
    }
  )

  return { activeItem }
}
