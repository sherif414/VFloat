import { useEventListener } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, type Ref, onScopeDispose, onWatcherCleanup, ref, toValue, watch, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import { getContextFromParameter, isTypeableElement } from "@/utils"
import { useActiveDescendant } from "../utils/use-active-descendant"
import { isUsingKeyboard } from "../utils/use-pointer-modality"

type Dimensions = { width: number; height: number }

export interface UseListNavigationOptions {
  listRef: Ref<Array<HTMLElement | null>>
  activeIndex?: MaybeRefOrGetter<number | null>
  onNavigate?: (index: number | null) => void
  enabled?: MaybeRefOrGetter<boolean>
  loop?: MaybeRefOrGetter<boolean>
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">
  disabledIndices?: Array<number> | ((index: number) => boolean)
  focusItemOnHover?: MaybeRefOrGetter<boolean>
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>
  scrollItemIntoView?: boolean | ScrollIntoViewOptions
  selectedIndex?: MaybeRefOrGetter<number | null>
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">
  nested?: MaybeRefOrGetter<boolean>
  parentOrientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">
  rtl?: MaybeRefOrGetter<boolean>
  virtual?: MaybeRefOrGetter<boolean>
  virtualItemRef?: Ref<HTMLElement | null>
  cols?: MaybeRefOrGetter<number>
  itemSizes?: Dimensions[]
  dense?: MaybeRefOrGetter<boolean>
  allowEscape?: MaybeRefOrGetter<boolean>
}

export interface UseListNavigationReturn {
  cleanup: () => void
}

export function useListNavigation(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseListNavigationOptions
): UseListNavigationReturn {
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const { refs, open, setOpen } = floatingContext

  const {
    listRef,
    activeIndex,
    onNavigate,
    enabled = true,
    loop = false,
    orientation = "vertical",
    disabledIndices,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    scrollItemIntoView = true,
    selectedIndex = null,
    focusItemOnOpen = "auto",
    nested = false,
    rtl = false,
    virtual = false,
    virtualItemRef,
    cols = 1,
    allowEscape = false,
  } = options

  const isEnabled = computed(() => toValue(enabled))
  const anchorEl = computed(() => (
    refs.anchorEl.value instanceof HTMLElement
      ? refs.anchorEl.value
      : refs.anchorEl.value?.contextElement instanceof HTMLElement
        ? (refs.anchorEl.value as any).contextElement
        : null
  ))
  const floatingEl = computed(() => refs.floatingEl.value)

  const isVirtual = computed(() => !!toValue(virtual))
  const isRtl = computed(() => !!toValue(rtl))
  const gridCols = computed(() => Math.max(1, Number(toValue(cols) ?? 1)))

  const getActiveIndex = () => (activeIndex !== undefined ? toValue(activeIndex) : null)
  const isDisabled = (idx: number) => {
    if (!disabledIndices) return false
    return Array.isArray(disabledIndices)
      ? disabledIndices.includes(idx)
      : !!disabledIndices(idx)
  }

  const getFirstEnabledIndex = () => {
    const items = listRef.value
    for (let i = 0; i < items.length; i++) {
      if (items[i] && !isDisabled(i)) return i
    }
    return null
  }

  const getLastEnabledIndex = () => {
    const items = listRef.value
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i] && !isDisabled(i)) return i
    }
    return null
  }

  function doSwitch(ori: "vertical" | "horizontal" | "both", vertical: boolean, horizontal: boolean) {
    switch (ori) {
      case "vertical":
        return vertical
      case "horizontal":
        return horizontal
      default:
        return vertical || horizontal
    }
  }

  function isMainOrientationKey(key: string, ori: "vertical" | "horizontal" | "both") {
    const vertical = key === "ArrowUp" || key === "ArrowDown"
    const horizontal = key === "ArrowLeft" || key === "ArrowRight"
    return doSwitch(ori, vertical, horizontal)
  }

  function isMainOrientationToEndKey(key: string, ori: "vertical" | "horizontal" | "both", rtlFlag: boolean) {
    const vertical = key === "ArrowDown"
    const horizontal = rtlFlag ? key === "ArrowLeft" : key === "ArrowRight"
    return doSwitch(ori, vertical, horizontal) || key === "Enter" || key === " " || key === ""
  }

  function isCrossOrientationOpenKey(key: string, ori: "vertical" | "horizontal" | "both", rtlFlag: boolean) {
    const vertical = rtlFlag ? key === "ArrowLeft" : key === "ArrowRight"
    const horizontal = key === "ArrowDown"
    return doSwitch(ori, vertical, horizontal)
  }

  function isCrossOrientationCloseKey(key: string, ori: "vertical" | "horizontal" | "both", rtlFlag: boolean, c?: number) {
    const vertical = rtlFlag ? key === "ArrowRight" : key === "ArrowLeft"
    const horizontal = key === "ArrowUp"
    if (ori === "both" || (ori === "horizontal" && c && c > 1)) {
      return false
    }
    return doSwitch(ori, vertical, horizontal)
  }

  const findNextEnabled = (start: number, dir: 1 | -1, wrap: boolean) => {
    const items = listRef.value
    const len = items.length
    let i = start
    for (let step = 0; step < len; step++) {
      if (i < 0 || i >= len) {
        if (!wrap) return null
        i = (i + len) % len
      }
      if (items[i] && !isDisabled(i)) return i
      i += dir
    }
    return null
  }

  const focusItem = (index: number | null, forceScroll = false) => {
    if (index == null) return
    const el = listRef.value[index]
    if (!el) return
    if (isVirtual.value) {
      // In virtual mode, ARIA and virtualItemRef management is handled by useActiveDescendant
      return
    } else {
      el.focus({ preventScroll: true })
      const opts = scrollItemIntoView
      const shouldScroll = !!opts && (forceScroll || isUsingKeyboard.value)
      if (shouldScroll) {
        el.scrollIntoView?.(typeof opts === "boolean" ? { block: "nearest", inline: "nearest" } : opts)
      }
    }
  }

  let lastKey: string | null = null

  const handleAnchorKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled.value) return
    if (e.defaultPrevented) return
    const target = e.target as Element | null
    if (target && isTypeableElement(target)) return

    const key = e.key
    const ori = toValue(orientation)
    lastKey = key
    if (open.value && isVirtual.value) {
      handleFloatingKeyDown(e)
      return
    }
    const isMainKey =
      (ori === "vertical" && (key === "ArrowDown" || key === "ArrowUp")) ||
      (ori === "horizontal" && (key === "ArrowLeft" || key === "ArrowRight")) ||
      (ori === "both" && (key === "ArrowDown" || key === "ArrowUp" || key === "ArrowLeft" || key === "ArrowRight"))

    if (!isMainKey) return

    if (!open.value && toValue(openOnArrowKeyDown)) {
      e.preventDefault()
      setOpen(true, "keyboard-activate", e)
      const sel = selectedIndex !== undefined ? toValue(selectedIndex) : null
      const initial = sel ?? (isMainOrientationToEndKey(key, ori, isRtl.value) ? getFirstEnabledIndex() : getLastEnabledIndex())
      if (initial != null) onNavigate?.(initial)
      return
    }
  }

  const handleFloatingKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled.value) return
    if (e.defaultPrevented) return

    const key = e.key
    const ori = toValue(orientation)

    const current = getActiveIndex()
    const items = listRef.value
    if (!items.length) return

    const wrap = !!toValue(loop)

    if (key === "Home") {
      e.preventDefault()
      const idx = getFirstEnabledIndex()
      if (idx != null) onNavigate?.(idx)
      return
    }
    if (key === "End") {
      e.preventDefault()
      const idx = getLastEnabledIndex()
      if (idx != null) onNavigate?.(idx)
      return
    }

    if (toValue(nested) && isCrossOrientationCloseKey(key, ori, isRtl.value, gridCols.value)) {
      e.preventDefault()
      setOpen(false, "programmatic", e)
      const parent = treeContext?.parent.value
      const parentAnchor = parent?.data.refs.anchorEl.value
      if (parentAnchor instanceof HTMLElement) {
        parentAnchor.focus({ preventScroll: true })
      } else if ((parentAnchor as any)?.contextElement instanceof HTMLElement) {
        ;(parentAnchor as any).contextElement.focus({ preventScroll: true })
      }
      return
    }

    const go = (dir: 1 | -1) => {
      const start = current == null ? (dir === 1 ? -1 : items.length) : current + dir
      let next = findNextEnabled(start, dir, wrap)
      if (next == null && wrap) {
        if (toValue(allowEscape) && isVirtual.value) {
          e.preventDefault()
          onNavigate?.(null)
          return
        }
        next = dir === 1 ? getFirstEnabledIndex() : getLastEnabledIndex()
      }
      if (next != null) {
        e.preventDefault()
        onNavigate?.(next)
      }
    }

    if (gridCols.value > 1 && (ori === "horizontal" || ori === "both")) {
      if (key === "ArrowRight") return go(1)
      if (key === "ArrowLeft") return go(-1)
      if (key === "ArrowDown") {
        const idx = current == null ? -gridCols.value : current
        let candidate = idx + gridCols.value
        while (candidate < items.length && isDisabled(candidate)) candidate += gridCols.value
        if (candidate < items.length) {
          e.preventDefault()
          onNavigate?.(candidate)
          return
        }
        if (wrap) {
          if (toValue(allowEscape) && isVirtual.value) {
            e.preventDefault()
            onNavigate?.(null)
            return
          }
          const first = getFirstEnabledIndex()
          if (first != null) {
            e.preventDefault()
            onNavigate?.(first)
            return
          }
        }
      }
      if (key === "ArrowUp") {
        const idx = current == null ? items.length : current
        let candidate = idx - gridCols.value
        while (candidate >= 0 && isDisabled(candidate)) candidate -= gridCols.value
        if (candidate >= 0) {
          e.preventDefault()
          onNavigate?.(candidate)
          return
        }
        if (wrap) {
          if (toValue(allowEscape) && isVirtual.value) {
            e.preventDefault()
            onNavigate?.(null)
            return
          }
          const last = getLastEnabledIndex()
          if (last != null) {
            e.preventDefault()
            onNavigate?.(last)
            return
          }
        }
      }
    }

    if (ori === "vertical") {
      if (key === "ArrowDown") return go(1)
      if (key === "ArrowUp") return go(-1)
    } else if (ori === "horizontal") {
      if ((isRtl.value && key === "ArrowLeft") || (!isRtl.value && key === "ArrowRight")) return go(1)
      if ((isRtl.value && key === "ArrowRight") || (!isRtl.value && key === "ArrowLeft")) return go(-1)
    } else {
      if (key === "ArrowDown") return go(1)
      if (key === "ArrowUp") return go(-1)
      if ((isRtl.value && key === "ArrowLeft") || (!isRtl.value && key === "ArrowRight")) return go(1)
      if ((isRtl.value && key === "ArrowRight") || (!isRtl.value && key === "ArrowLeft")) return go(-1)
    }
  }

  watch(
    [open, computed(() => getActiveIndex())],
    ([isOpen, idx]) => {
      if (!isEnabled.value) return
      if (!isOpen) return
      if (idx == null) return
      focusItem(idx)
    },
    { flush: "post" }
  )

  const stopAnchor = useEventListener(() => (isEnabled.value ? anchorEl.value : null), "keydown", handleAnchorKeyDown)
  const stopFloating = useEventListener(() => (isEnabled.value ? floatingEl.value : null), "keydown", handleFloatingKeyDown)

  const removeItemHoverWatch = watchPostEffect(() => {
    if (!isEnabled.value || !toValue(focusItemOnHover)) return
    const container = floatingEl.value
    if (!container) return
    const onOver = (evt: MouseEvent) => {
      const target = evt.target as Element | null
      if (!target) return
      const items = listRef.value
      let idx = -1
      for (let i = 0; i < items.length; i++) {
        const el = items[i]
        if (el && (el === target || el.contains(target))) {
          idx = i
          break
        }
      }
      if (idx >= 0) onNavigate?.(idx)
    }
    container.addEventListener("mouseover", onOver)
    onWatcherCleanup(() => {
      container.removeEventListener("mouseover", onOver)
    })
  })

  const prevOpen = ref(open.value)
  watch(
    () => open.value,
    (isOpen) => {
      if (!isEnabled.value) return
      if (isOpen && !prevOpen.value) {
        const f = toValue(focusItemOnOpen)
        if (f === true || (f === "auto" && lastKey != null)) {
          const sel = selectedIndex !== undefined ? toValue(selectedIndex) : null
          let idx = sel ?? (lastKey && isMainOrientationToEndKey(lastKey, toValue(orientation), isRtl.value) ? getFirstEnabledIndex() : getLastEnabledIndex())
          if (idx != null) {
            onNavigate?.(idx)
            focusItem(idx, true)
          }
        }
      }
      prevOpen.value = isOpen
    },
    { flush: "post" }
  )

  // Manage aria-activedescendant and virtualItemRef via dedicated composable
  useActiveDescendant(anchorEl, listRef, computed(() => getActiveIndex()), { virtual, open, virtualItemRef })

  onScopeDispose(() => {
    stopAnchor()
    stopFloating()
    removeItemHoverWatch()
  })

  return { cleanup: () => { stopAnchor(); stopFloating(); removeItemHoverWatch() } }
}
