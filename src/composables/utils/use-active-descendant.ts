import { type ComputedRef, computed, type MaybeRefOrGetter, type Ref, toValue, watch } from "vue"

export interface UseActiveDescendantOptions {
  virtual: MaybeRefOrGetter<boolean>
  open: Ref<boolean>
  virtualItemRef?: Ref<HTMLElement | null>
}

export function useActiveDescendant(
  anchorEl: ComputedRef<HTMLElement | null>,
  listRef: Ref<Array<HTMLElement | null>>,
  activeIndex: MaybeRefOrGetter<number | null>,
  options: UseActiveDescendantOptions
): void {
  const virt = computed(() => !!toValue(options.virtual))

  watch([virt, options.open, computed(() => toValue(activeIndex))], ([isVirtual, isOpen, idx]) => {
    const anchor = anchorEl.value
    if (!anchor) return
    if (!isVirtual || !isOpen || idx == null) {
      anchor.removeAttribute("aria-activedescendant")
      return
    }
    const el = listRef.value[idx]
    if (!el) return
    if (!el.id) el.id = `vfloat-option-${Math.random().toString(16).slice(2, 10)}`
    anchor.setAttribute("aria-activedescendant", el.id)
    if (options.virtualItemRef) options.virtualItemRef.value = el
  })
}
