import { type MaybeRefOrGetter, type Ref, computed, onScopeDispose, ref, toValue, watch } from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables typeahead functionality for list navigation
 *
 * This composable provides keyboard typeahead functionality to find and select
 * items in a list based on their text content, useful for dropdown menus,
 * select components, and other list-based UIs.
 *
 * @param context - The floating context with open state
 * @param options - Configuration options for typeahead behavior
 * @returns Event handlers and state for typeahead functionality
 *
 * @example
 * ```ts
 * const { getReferenceProps, getFloatingProps, typedString } = useTypeahead({
 *   open: floating.open,
 *   listRef: listRef,
 *   activeIndex: activeIndex,
 *   onMatch: setActiveIndex
 * })
 * ```
 */
export function useTypeahead(
  context: FloatingContext & {
    open: Ref<boolean>
  },
  options: UseTypeaheadOptions
): UseTypeaheadReturn {
  const {
    enabled = true,
    listRef,
    activeIndex,
    selectedIndex,
    onMatch,
    findMatch,
    resetMs = 1000,
    ignoreKeys = [],
    onTypingChange,
  } = options

  const isEnabled = computed(() => toValue(enabled))

  const typedString = ref("")
  let typingTimeoutId: number | null = null
  let isTyping = false

  // Get list items from the list container
  const listContentRef = computed(() => {
    if (!listRef.value) return []

    return Array.from(listRef.value.querySelectorAll("[data-floating-index]")) as HTMLElement[]
  })

  // Reset the typed string after a delay
  const resetTypedStringAfterDelay = () => {
    if (typingTimeoutId) {
      window.clearTimeout(typingTimeoutId)
    }

    typingTimeoutId = window.setTimeout(() => {
      typedString.value = ""
      if (isTyping) {
        isTyping = false
        onTypingChange?.(false)
      }
    }, toValue(resetMs))
  }

  // Cleanup on unmount
  onScopeDispose(() => {
    if (typingTimeoutId) {
      window.clearTimeout(typingTimeoutId)
    }
  })

  // Handle key presses for typeahead
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value || !context.open.value) return

    // Get the key as a string
    const key = event.key.length === 1 ? event.key.toLowerCase() : ""

    // Ignore if key is in the ignore list or not a printable character
    if (key === "" || toValue(ignoreKeys).includes(key)) return

    // Don't handle if modifier keys are pressed (except shift)
    if (event.ctrlKey || event.altKey || event.metaKey) return

    // Update typed string and reset timeout
    typedString.value += key

    if (!isTyping) {
      isTyping = true
      onTypingChange?.(true)
    }

    resetTypedStringAfterDelay()

    // Custom find function or default behavior
    if (findMatch) {
      const index = findMatch(listContentRef.value, typedString.value)
      if (index !== null && index >= 0) {
        event.preventDefault()
        onMatch?.(index)
        return
      }
    }

    // Default search behavior - first match only
    const currentIndex = toValue(selectedIndex) ?? toValue(activeIndex)
    const startingIndex = currentIndex !== null ? currentIndex + 1 : 0
    const items = listContentRef.value
    const totalItems = items.length

    // If we have no items, don't try to search
    if (totalItems === 0) return

    // Try to find a match, starting from the next item after current
    // and wrapping around to the beginning
    for (let i = 0; i < totalItems; i++) {
      const index = (startingIndex + i) % totalItems
      const item = items[index]
      const itemText = getItemText(item).trim().toLowerCase()

      if (itemText.startsWith(typedString.value.toLowerCase())) {
        event.preventDefault()
        onMatch?.(index)
        return
      }
    }

    // If no match is found with prefix, try to find a match anywhere in the strings
    // (less precise but better than nothing)
    for (let i = 0; i < totalItems; i++) {
      const index = (startingIndex + i) % totalItems
      const item = items[index]
      const itemText = getItemText(item).trim().toLowerCase()

      if (itemText.includes(typedString.value.toLowerCase())) {
        event.preventDefault()
        onMatch?.(index)
        return
      }
    }
  }

  return {
    getReferenceProps: () => ({
      onKeyDown: handleKeyDown,
    }),
    getFloatingProps: () => ({
      onKeyDown: handleKeyDown,
    }),
    typedString,
    resetMs,
  }
}

//=======================================================================================
// 📌 Utilities
//=======================================================================================

/**
 * Gets the text content of an HTML element
 */
function getItemText(item: HTMLElement): string {
  // Try to use aria-label first
  const ariaLabel = item.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel

  // Then look for inner text
  const textContent = item.textContent
  return textContent || ""
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring typeahead behavior
 */
export interface UseTypeaheadOptions {
  /**
   * Whether typeahead is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Ref to the list container element
   */
  listRef: Ref<HTMLElement | null>

  /**
   * The active index in the list
   */
  activeIndex: MaybeRefOrGetter<number | null>

  /**
   * Callback for when typeahead matches an index
   */
  onMatch?: (index: number) => void

  /**
   * Custom function to find a match based on the typeahead string
   */
  findMatch?: (list: Array<HTMLElement | null>, typedString: string) => number | null

  /**
   * Amount of time in ms to reset the typeahead string
   * @default 1000
   */
  resetMs?: MaybeRefOrGetter<number>

  /**
   * Array of keys to ignore for typeahead
   */
  ignoreKeys?: MaybeRefOrGetter<string[]>

  /**
   * Currently selected index (if different from active)
   */
  selectedIndex?: MaybeRefOrGetter<number | null>

  /**
   * Callback for when the typing state changes
   */
  onTypingChange?: (isTyping: boolean) => void
}

/**
 * Return value of the useTypeahead composable
 */
export interface UseTypeaheadReturn {
  /**
   * Reference element props for typeahead
   */
  getReferenceProps: () => {
    onKeyDown: (event: KeyboardEvent) => void
  }

  /**
   * Floating element props for typeahead
   */
  getFloatingProps: () => {
    onKeyDown: (event: KeyboardEvent) => void
  }

  /**
   * The current typeahead string
   */
  typedString: Ref<string>

  /**
   * The amount of time to reset the typeahead string
   */
  resetMs: MaybeRefOrGetter<number>
}
