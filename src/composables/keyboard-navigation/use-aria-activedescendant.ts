import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  nextTick,
  readonly,
  type Ref,
  shallowRef,
  toValue,
  useId,
  watch,
  watchPostEffect,
} from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import { useEventListener } from "@/shared/use-event-listener";
import { resolveKeyIntent } from "./intent";
import { findNextNavigableIndex, resolveNavigableIndexByIntent } from "./navigation";
import { useRtl } from "./rtl";
import type { VirtualizerAdapter } from "./virtualizer-adapter";

const WHITESPACE_REGEX = /\s/;

const NON_EDITABLE_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages virtual focus and keyboard navigation for text-input-driven components using `aria-activedescendant`.
 *
 * Physical DOM focus remains pinned on the `<input>` target to preserve the text cursor, IME
 * composition, and mobile software keyboards, while virtual focus navigates suggestions.
 *
 * For standalone composite widgets (menus, tabs, toolbars, trees, non-searchable listboxes),
 * use {@link useRovingFocus}.
 *
 * @param options - Configuration for target element, items, orientation, and virtualizer.
 * @returns State, navigation actions, and prop getters.
 *
 * @example Generic Combobox with static DOM list
 * ```ts
 * const targetEl = useTemplateRef<HTMLInputElement>("input");
 * const containerEl = useTemplateRef<HTMLElement>("listbox");
 * const elementsList = ref<Array<HTMLElement | null>>([]);
 *
 * const { activeIndex, activeId, getTargetProps, getItemProps } =
 *   useAriaActivedescendant({
 *     targetEl,
 *     containerEl,
 *     elementsList,
 *     onSelect: (index) => selectItem(index),
 *   });
 * ```
 *
 * @example Virtualized list with TanStack Virtual
 * ```ts
 * const adapter = createTanStackVirtualAdapter(virtualizer);
 * const { activeIndex, activeId, getTargetProps, getItemProps } =
 *   useAriaActivedescendant({
 *     targetEl,
 *     containerEl,
 *     virtualizer: adapter,
 *     getItemKey: (idx) => items[idx].id,
 *     onSelect: (index) => selectItem(index),
 *   });
 * ```
 */
export function useAriaActivedescendant(
  options: UseAriaActivedescendantOptions,
): UseAriaActivedescendantReturn {
  const {
    targetEl,
    containerEl,
    elementsList,
    itemCount: rawItemCount,
    activeIndex: controlledActiveIndex,
    defaultIndex = -1,
    idPrefix,
    getItemId,
    getItemKey,
    orientation = "vertical",
    loop = false,
    pageSize = 10,
    rtl,
    enabled = true,
    scrollIntoView = true,
    editable = "auto",
    preventPointerDown = true,
    focusOnHover = false,
    clearOnPointerLeave = false,
    resetOnBlur = false,
    focusDisabledElements = false,
    virtualizer,
    onSelect,
    onActiveIndexChange,
    isKeyHandled,
  } = options;

  // --- Shared Options & Root State --------------------------------------------

  const isEnabled = computed(() => toValue(enabled));
  const currentOrientation = computed(() => toValue(orientation));
  const isLoop = computed(() => !!toValue(loop));
  const isFocusOnHover = computed(() => !!toValue(focusOnHover));
  const canFocusDisabled = computed(() => !!toValue(focusDisabledElements));
  const isPreventPointerDown = computed(() => toValue(preventPointerDown) ?? true);
  const isScrollIntoView = computed(() => toValue(scrollIntoView) ?? true);
  const currentPageSize = computed(() => Math.max(1, toValue(pageSize) ?? 10));
  const targetElement = computed(() => toValue(targetEl) ?? null);
  const containerElement = computed(() => toValue(containerEl) ?? null);
  const isRtl = useRtl(targetElement, { rtl });

  const isEditable = computed(() => {
    const opt = toValue(editable);
    if (typeof opt === "boolean") return opt;
    return isEditableElement(targetElement.value);
  });

  if (import.meta.env.DEV) {
    if (rawItemCount !== undefined && elementsList !== undefined) {
      console.warn(
        "[VFloat useAriaActivedescendant] Both `itemCount` and `elementsList` were provided. `elementsList` takes precedence. Consider providing only one to avoid configuration conflicts.",
      );
    }
  }

  const activeIndex = useControllableState({
    value: controlledActiveIndex,
    initialValue: defaultIndex,
    onChange: onActiveIndexChange,
  });

  const totalCount = computed(() => {
    const elements = toValue(elementsList);
    if (elements) {
      let len = elements.length;
      while (len > 0 && elements[len - 1] == null) {
        len--;
      }
      return len;
    }
    if (rawItemCount !== undefined) return toValue(rawItemCount);
    if (virtualizer?.count) return toValue(virtualizer.count);
    return 0;
  });

  // --- Reactive Bounds Auto-Correction ----------------------------------------

  watch(
    totalCount,
    (count) => {
      if (!isEnabled.value) return;
      if (count === 0 || activeIndex.value >= count) {
        // Active index is out of bounds due to dynamic collection shrinkage (e.g. filtering)
        activeIndex.value = -1;
      }
    },
    { flush: "post" },
  );

  // --- ID Generation & Resolution ---------------------------------------------

  const baseId = idPrefix ?? `vfloat-${useId()}`;

  function resolveItemId(index: number, key?: string | number): string {
    const resolvedKey = key ?? getItemKey?.(index);
    if (getItemId) {
      return getItemId(index, resolvedKey);
    }
    if (resolvedKey !== undefined) {
      return `${baseId}-opt-${resolvedKey}`;
    }
    return `${baseId}-opt-${index}`;
  }

  // --- Item Validity & Disabled Predicates ------------------------------------

  /**
   * Whether the item at `idx` can receive virtual focus. Returns false for
   * out-of-bounds indices and disabled items (unless `focusDisabledElements`
   * is enabled, in which case all in-bounds items are navigable).
   */
  function isItemNavigable(idx: number): boolean {
    if (idx < 0 || idx >= totalCount.value) return false;
    if (canFocusDisabled.value) return true;

    if (options.isItemDisabled) {
      return !options.isItemDisabled(idx);
    }

    const elements = toValue(elementsList);
    if (elements?.[idx]) {
      return !isElementDisabled(elements[idx]);
    }

    return true;
  }

  /**
   * Whether the item at `idx` is actually disabled, regardless of the
   * `focusDisabledElements` option. Used exclusively by the selection guard:
   * per WAI-ARIA APG, disabled items in composite widgets may be focusable
   * for discoverability but must not be activatable.
   */
  function isActualDisabled(idx: number): boolean {
    if (options.isItemDisabled) {
      return options.isItemDisabled(idx);
    }
    const elements = toValue(elementsList);
    if (elements?.[idx]) {
      return isElementDisabled(elements[idx]);
    }
    return false;
  }

  // --- DOM Element Lookup & Validation ----------------------------------------

  /**
   * Finds a mounted, connected DOM element representing the item at `idx` with expected `id`.
   * Prioritizes O(1) direct array lookups and document hash map lookups before falling back
   * to subtree selector scanning.
   */
  function findMountedElement(idx: number, id: string): HTMLElement | null {
    if (typeof document === "undefined") return null;

    // 1. O(1) direct lookup in elementsList
    const elements = toValue(elementsList);
    if (elements?.[idx] && elements[idx].isConnected) {
      return elements[idx];
    }

    // 2. O(1) native hash-map lookup on document
    try {
      const docEl = document.getElementById(id);
      if (docEl && docEl.isConnected) {
        const container = containerElement.value;
        if (!container || container.contains(docEl)) {
          return docEl;
        }
      }
    } catch {
      // Guard getElementById errors
    }

    // 3. Fallback container query for virtualized / dynamic items
    const container = containerElement.value;
    if (container) {
      try {
        const byId = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (byId && byId.isConnected) return byId;
      } catch {
        // ID selector escape guard
      }
      const byIndex = container.querySelector<HTMLElement>(`[data-index="${idx}"]`);
      if (byIndex && byIndex.isConnected) return byIndex;
    }

    return null;
  }

  // --- Active Descendant DOM Validation & Commit ------------------------------

  const committedActiveId = shallowRef<string | undefined>(undefined);
  let lastRetriedIndex = -1;

  /**
   * Synchronizes and validates that the currently active item exists in the DOM.
   * Per WAI-ARIA ownership and ID requirements, `aria-activedescendant` is only
   * committed when the referenced element is actually mounted in the DOM.
   */
  function syncActiveElementId(): void {
    const idx = activeIndex.value;
    if (!isEnabled.value || idx < 0 || idx >= totalCount.value) {
      if (committedActiveId.value !== undefined) {
        committedActiveId.value = undefined;
      }
      lastRetriedIndex = -1;
      return;
    }

    // Fast-path for virtualizer adapter: skip DOM queries if virtualizer knows index is not rendered
    if (virtualizer?.isIndexRendered && !virtualizer.isIndexRendered(idx)) {
      committedActiveId.value = undefined;
      return;
    }

    const targetId = resolveItemId(idx);
    if (!isValidAriaId(targetId)) {
      committedActiveId.value = undefined;
      return;
    }

    const mountedEl = findMountedElement(idx, targetId);
    if (mountedEl) {
      const actualId = mountedEl.id && isValidAriaId(mountedEl.id) ? mountedEl.id : targetId;
      committedActiveId.value = actualId;
      lastRetriedIndex = -1;
      return;
    }

    // Element is not in the DOM yet (e.g. virtualized off-screen). Clear attribute.
    committedActiveId.value = undefined;

    // Deduplicate nextTick retries: schedule at most once per activeIndex change
    if (lastRetriedIndex !== idx && typeof window !== "undefined") {
      lastRetriedIndex = idx;
      void nextTick(() => {
        if (activeIndex.value === idx && isEnabled.value) {
          const retryEl = findMountedElement(idx, targetId);
          if (retryEl) {
            const actualId = retryEl.id && isValidAriaId(retryEl.id) ? retryEl.id : targetId;
            committedActiveId.value = actualId;
          }
        }
      });
    }
  }

  watchPostEffect(() => {
    // Track reactive dependencies for auto-commit when DOM or state updates
    void activeIndex.value;
    void isEnabled.value;
    void totalCount.value;
    void toValue(elementsList);
    void containerElement.value;
    syncActiveElementId();
  });

  let isMutationPending = false;

  watch(
    containerElement,
    (container, _, onCleanup) => {
      if (!container || typeof MutationObserver === "undefined") return;

      const observer = new MutationObserver(() => {
        if (activeIndex.value < 0 || !isEnabled.value) return;

        if (isMutationPending) return;
        isMutationPending = true;

        queueMicrotask(() => {
          isMutationPending = false;
          if (activeIndex.value >= 0 && isEnabled.value) {
            syncActiveElementId();
          }
        });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["id", "data-index"],
      });

      onCleanup(() => {
        observer.disconnect();
        isMutationPending = false;
      });
    },
    { immediate: true, flush: "post" },
  );

  const activeId = computed<string | undefined>(() => committedActiveId.value);

  // --- Scroll & Virtualizer Coordination --------------------------------------

  function scrollToActiveItem(idx: number, force = false): void {
    if (idx < 0 || !isEnabled.value) return;
    if (!force && !isScrollIntoView.value) return;

    if (virtualizer) {
      virtualizer.scrollToIndex(idx, { align: "auto" });
      return;
    }

    const elements = toValue(elementsList);
    const targetEl =
      elements?.[idx] ??
      (containerElement.value ? findMountedElement(idx, resolveItemId(idx)) : null);

    if (!targetEl) return;

    const container = containerElement.value;
    if (!container) {
      targetEl.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      return;
    }

    const { dx, dy } =
      targetEl.offsetParent === container
        ? resolveOffsetScrollDelta(targetEl, container, currentOrientation.value)
        : resolveBoundedScrollDelta(
            targetEl.getBoundingClientRect(),
            container.getBoundingClientRect(),
            currentOrientation.value,
          );

    if (dy !== 0) {
      container.scrollTop += dy;
    }
    if (dx !== 0) {
      container.scrollLeft += dx;
    }
  }

  let suppressNextScroll = false;

  // Watch activeIndex to ensure externally controlled changes trigger scroll reveal
  watch(
    () => activeIndex.value,
    (newIndex) => {
      if (suppressNextScroll) {
        suppressNextScroll = false;
        return;
      }
      if (newIndex >= 0 && isEnabled.value && isScrollIntoView.value) {
        scrollToActiveItem(newIndex);
      }
    },
    { flush: "post" },
  );

  // Watch isEnabled to ensure re-enabling triggers scroll reveal if an item is active
  watch(
    () => isEnabled.value,
    (enabled) => {
      if (enabled && activeIndex.value >= 0 && isScrollIntoView.value) {
        scrollToActiveItem(activeIndex.value);
      }
    },
    { flush: "post" },
  );

  // --- Virtual Focus Dispatcher -----------------------------------------------

  /**
   * Single transition point for programmatic active index changes. Updates state and
   * triggers scroll synchronization. Setting to `-1` clears the active
   * descendant without scrolling.
   */
  function setVirtualFocus(idx: number, focusOptions: { preventScroll?: boolean } = {}): void {
    if (idx === -1) {
      activeIndex.value = -1;
      return;
    }

    if (!isItemNavigable(idx)) return;

    if (focusOptions.preventScroll) {
      suppressNextScroll = true;
    } else {
      lastHoveredEl = null;
    }

    const wasActive = activeIndex.value === idx;
    activeIndex.value = idx;

    if (!focusOptions.preventScroll && isScrollIntoView.value) {
      if (wasActive) {
        scrollToActiveItem(idx);
      }
    }
  }

  // --- Keyboard Navigation ----------------------------------------------------

  function navigate(
    intent: "first" | "last" | "next" | "previous" | "page-up" | "page-down",
  ): void {
    const total = totalCount.value;
    if (total === 0) return;

    const current = activeIndex.value >= 0 ? activeIndex.value : -1;
    let targetIdx: number | null = null;

    if (intent === "page-up" || intent === "page-down") {
      const delta = intent === "page-down" ? 1 : -1;
      const size = currentPageSize.value;
      let probe = current >= 0 ? current : delta === 1 ? -1 : total;
      let found = current;

      for (let step = 0; step < size; step++) {
        const next = findNextNavigableIndex(
          probe,
          delta,
          total,
          (i) => !isItemNavigable(i),
          isLoop.value,
        );
        if (next === null) break;
        found = next;
        probe = next;
      }

      if (found >= 0 && found !== current) {
        targetIdx = found;
      } else if (!isLoop.value) {
        // Clamp to edge boundary when unable to advance a full page
        targetIdx = resolveNavigableIndexByIntent(
          delta === 1 ? "last" : "first",
          current,
          total,
          (i) => !isItemNavigable(i),
          false,
        );
      }
    } else {
      targetIdx = resolveNavigableIndexByIntent(
        intent,
        current,
        total,
        (i) => !isItemNavigable(i),
        isLoop.value,
      );
    }

    if (targetIdx !== null) {
      setVirtualFocus(targetIdx);
    }
  }

  useEventListener(targetElement, "keydown", (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;
    if (e.isComposing || e.keyCode === 229) return;

    if (isKeyHandled && !isKeyHandled(e)) return;

    const target = e.target as Element | null;
    const editableTarget = isEditable.value || isEditableElement(target);

    // If target is editable (e.g. text input), preserve native typing and caret navigation
    if (editableTarget) {
      if (e.key === " " || e.key === "Spacebar" || e.key === "Home" || e.key === "End") {
        return;
      }
    }

    if (e.key === "PageUp" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      navigate("page-up");
      return;
    }

    if (e.key === "PageDown" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      navigate("page-down");
      return;
    }

    const intent = resolveKeyIntent(e, {
      orientation: currentOrientation.value,
      rtl: isRtl.value,
    });

    if (!intent) return;

    if (intent === "select") {
      const idx = activeIndex.value;
      if (idx < 0 || idx >= totalCount.value) {
        return;
      }
      if (!isActualDisabled(idx)) {
        e.preventDefault();
        onSelect?.(idx, e);
      }
      return;
    }

    if (intent === "first" || intent === "last" || intent === "next" || intent === "previous") {
      e.preventDefault();
      navigate(intent);
    }
  });

  // --- Focus Synchronization --------------------------------------------------

  useEventListener(targetElement, "focusin", () => {
    if (!isEnabled.value) return;
    if (activeIndex.value >= 0 && isScrollIntoView.value) {
      scrollToActiveItem(activeIndex.value);
    }
  });

  useEventListener(targetElement, "focusout", (e: FocusEvent) => {
    if (!isEnabled.value || !toValue(resetOnBlur)) return;

    const related = e.relatedTarget as Node | null;
    const target = targetElement.value;
    const container = containerElement.value;

    // Preserve active descendant if focus moved within target or container
    if (
      related &&
      ((target && target.contains(related)) || (container && container.contains(related)))
    ) {
      return;
    }

    setVirtualFocus(defaultIndex);
  });

  // --- Pointer Hover & Focus Protection ---------------------------------------

  function onItemPointerDown(e: PointerEvent): void {
    if (!isPreventPointerDown.value) return;

    const target = e.target as Element | null;
    if (target) {
      const interactive = target.closest(
        "button, a, input, select, textarea, [contenteditable], [data-interactive]",
      );
      if (interactive && interactive !== e.currentTarget) {
        return;
      }
    }

    // Virtual Focus Strategy: prevent browser from blurring the target input, preserving
    // the text cursor, IME composition, and mobile software keyboards.
    e.preventDefault();
  }

  let lastHoveredEl: HTMLElement | null = null;
  let lastPointerX = -1;
  let lastPointerY = -1;

  useEventListener(
    () => (isFocusOnHover.value ? containerElement.value : null),
    "pointermove",
    (e: PointerEvent) => {
      if (e.defaultPrevented || !isEnabled.value) return;
      if (e.pointerType === "touch") return;

      // Ignore synthetic pointermove events fired when elements scroll under a stationary cursor
      if (e.clientX === lastPointerX && e.clientY === lastPointerY) {
        return;
      }
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      const target = e.target as HTMLElement | null;
      if (!target || target === lastHoveredEl) return;

      // Fast check: if target is within the already active item, skip lookup
      const currentActiveIdx = activeIndex.value;
      if (currentActiveIdx >= 0) {
        const elements = toValue(elementsList);
        if (elements?.[currentActiveIdx]?.contains(target)) {
          lastHoveredEl = target;
          return;
        }
      }

      const container = containerElement.value;

      // 1. Try finding data-index on target or closest ancestor (virtual and static lists)
      const itemEl = target.closest<HTMLElement>("[data-index]");
      if (itemEl && (container ? container.contains(itemEl) : true)) {
        lastHoveredEl = target;
        const rawIndex = itemEl.getAttribute("data-index");
        if (rawIndex !== null) {
          const idx = Number.parseInt(rawIndex, 10);
          if (!Number.isNaN(idx)) {
            if (idx === activeIndex.value) {
              return;
            }
            if (isItemNavigable(idx)) {
              setVirtualFocus(idx, { preventScroll: true });
              return;
            }
          }
        }
      }

      // 2. Fallback to elementsList if available
      const elements = toValue(elementsList);
      if (elements) {
        lastHoveredEl = target;
        for (let idx = 0; idx < elements.length; idx++) {
          if (
            elements[idx]?.contains(target) &&
            idx !== activeIndex.value &&
            isItemNavigable(idx)
          ) {
            setVirtualFocus(idx, { preventScroll: true });
            return;
          }
        }
      }
    },
  );

  useEventListener(
    () => (isFocusOnHover.value ? containerElement.value : null),
    "pointerleave",
    (e: PointerEvent) => {
      lastHoveredEl = null;
      lastPointerX = -1;
      lastPointerY = -1;
      if (!isEnabled.value || e.pointerType === "touch") return;
      if (toValue(clearOnPointerLeave)) {
        setVirtualFocus(-1);
      }
    },
  );

  // --- Props Normalization & Return -------------------------------------------

  const getTargetProps = () => ({
    "aria-activedescendant": activeId.value,
  });

  const getContainerProps = () => ({
    id: containerElement.value?.id || undefined,
  });

  const getItemProps = (itemOrIndex: AriaActivedescendantItemParam) => {
    const { index, key } = resolveItemIndexAndKey(itemOrIndex);
    const id = resolveItemId(index, key);
    const isActive = activeIndex.value === index;
    const disabled = isActualDisabled(index);

    return {
      id,
      "data-active": isActive ? "" : undefined,
      "data-index": index,
      "data-key": key !== undefined ? String(key) : undefined,
      "aria-disabled": disabled ? "true" : undefined,
      onPointerdown: onItemPointerDown,
    };
  };

  const getOptionProps = (index: number) => getItemProps(index);
  const getVirtualItemProps = (virtualItem: { index: number; key?: string | number }) =>
    getItemProps(virtualItem);

  return {
    activeIndex: readonly(activeIndex),
    activeId,
    setActiveIndex: (index: number) => setVirtualFocus(index),
    clearActive: () => setVirtualFocus(-1),
    next: () => navigate("next"),
    prev: () => navigate("previous"),
    first: () => navigate("first"),
    last: () => navigate("last"),
    pageUp: () => navigate("page-up"),
    pageDown: () => navigate("page-down"),
    scrollToActive: () => {
      if (activeIndex.value >= 0) {
        scrollToActiveItem(activeIndex.value, true);
      }
    },
    getTargetProps,
    getContainerProps,
    getItemProps,
    getOptionProps,
    getVirtualItemProps,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Validates that an ID string is non-empty and does not contain whitespace characters.
 *
 * Per W3C WAI-ARIA and DOM specifications, an element ID token must not be empty or contain whitespace.
 */
function isValidAriaId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && !WHITESPACE_REGEX.test(id);
}

/**
 * Checks whether an element is natively disabled or aria-disabled.
 */
function isElementDisabled(el: Element | null): boolean {
  if (!el) return false;
  return (
    el.hasAttribute("disabled") ||
    ("disabled" in el && Boolean((el as HTMLButtonElement).disabled)) ||
    el.getAttribute("aria-disabled") === "true"
  );
}

/**
 * Checks whether an element is natively editable (text input, textarea, or contenteditable).
 *
 * Used to preserve native text editing and caret navigation (Space, Home, End).
 */
function isEditableElement(el: Element | null): boolean {
  if (!el || typeof HTMLElement === "undefined" || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    return !NON_EDITABLE_INPUT_TYPES.has(type);
  }
  return false;
}

/**
 * Resolves item index and optional key from polymorphic item argument.
 */
function resolveItemIndexAndKey(param: AriaActivedescendantItemParam): {
  index: number;
  key?: string | number;
} {
  if (typeof param === "number") {
    return { index: param };
  }
  return param;
}

/**
 * Resolves horizontal and vertical scroll deltas needed to bring an element into view
 * within a bounded container using offset-based geometry when targetEl.offsetParent === container.
 * Eliminates layout reflows by avoiding getBoundingClientRect().
 */
function resolveOffsetScrollDelta(
  targetEl: HTMLElement,
  container: HTMLElement,
  orientation: "vertical" | "horizontal" | "both" = "vertical",
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (orientation === "vertical" || orientation === "both") {
    const elTop = targetEl.offsetTop - container.scrollTop;
    const elBottom = elTop + targetEl.offsetHeight;
    const containerHeight = container.clientHeight;

    if (elTop < 0) {
      dy = elTop;
    } else if (elBottom > containerHeight) {
      if (targetEl.offsetHeight > containerHeight) {
        dy = elTop;
      } else {
        dy = elBottom - containerHeight;
      }
    }
  }

  if (orientation === "horizontal" || orientation === "both") {
    const elLeft = targetEl.offsetLeft - container.scrollLeft;
    const elRight = elLeft + targetEl.offsetWidth;
    const containerWidth = container.clientWidth;

    if (elLeft < 0) {
      dx = elLeft;
    } else if (elRight > containerWidth) {
      if (targetEl.offsetWidth > containerWidth) {
        dx = elLeft;
      } else {
        dx = elRight - containerWidth;
      }
    }
  }

  return { dx, dy };
}

/**
 * Resolves horizontal and vertical scroll deltas needed to bring an element into view
 * within a bounded container without mutating DOM nodes.
 */
function resolveBoundedScrollDelta(
  elRect: DOMRect,
  containerRect: DOMRect,
  orientation: "vertical" | "horizontal" | "both" = "vertical",
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (orientation === "vertical" || orientation === "both") {
    if (elRect.top < containerRect.top) {
      dy = elRect.top - containerRect.top;
    } else if (elRect.bottom > containerRect.bottom) {
      if (elRect.height > containerRect.height) {
        dy = elRect.top - containerRect.top;
      } else {
        dy = elRect.bottom - containerRect.bottom;
      }
    }
  }

  if (orientation === "horizontal" || orientation === "both") {
    if (elRect.left < containerRect.left) {
      dx = elRect.left - containerRect.left;
    } else if (elRect.right > containerRect.right) {
      if (elRect.width > containerRect.width) {
        dx = elRect.left - containerRect.left;
      } else {
        dx = elRect.right - containerRect.right;
      }
    }
  }

  return { dx, dy };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Return contract for `useAriaActivedescendant`.
 */
export interface UseAriaActivedescendantReturn {
  /**
   * Currently active element index (-1 when none is active).
   */
  activeIndex: Readonly<Ref<number>>;

  /**
   * The DOM ID of the currently active descendant, or `undefined` when inactive
   * or when the target item is not mounted in the DOM.
   */
  activeId: ComputedRef<string | undefined>;

  /**
   * Sets the active index and triggers scroll synchronization.
   * Ignored for non-navigable indices.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Clears the active descendant (sets index to -1).
   */
  clearActive: () => void;

  /**
   * Navigates to the next enabled item.
   */
  next: () => void;

  /**
   * Navigates to the previous enabled item.
   */
  prev: () => void;

  /**
   * Navigates to the first enabled item.
   */
  first: () => void;

  /**
   * Navigates to the last enabled item.
   */
  last: () => void;

  /**
   * Navigates backward by a page of items (configured by `pageSize`).
   */
  pageUp: () => void;

  /**
   * Navigates forward by a page of items (configured by `pageSize`).
   */
  pageDown: () => void;

  /**
   * Imperatively scrolls the currently active item into view.
   */
  scrollToActive: () => void;

  /**
   * Generates ARIA props for the target/anchor element holding physical DOM focus.
   *
   * Returns `aria-activedescendant` (the mounted active item's ID or `undefined`).
   */
  getTargetProps: () => Record<string, unknown>;

  /**
   * Generates container identity props.
   */
  getContainerProps: () => Record<string, unknown>;

  /**
   * Generates identity, state, and event props for an item at the given index or item descriptor.
   *
   * Includes `id`, `data-active`, `data-index`, `data-key`, `aria-disabled`, and `onPointerdown`.
   */
  getItemProps: (itemOrIndex: AriaActivedescendantItemParam) => Record<string, unknown>;

  /**
   * Alias for {@link getItemProps}.
   */
  getOptionProps: (index: number) => Record<string, unknown>;

  /**
   * Generates props for a virtualized item. Delegates to `getItemProps` using the virtual item's index and key.
   */
  getVirtualItemProps: (virtualItem: {
    index: number;
    key?: string | number;
  }) => Record<string, unknown>;
}

/**
 * Configuration options for `useAriaActivedescendant`.
 */
export interface UseAriaActivedescendantOptions {
  /**
   * Target element holding physical DOM focus and receiving `aria-activedescendant`.
   */
  targetEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Composite container element holding the items. Used for bounded scroll calculations and query validation.
   */
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Total number of items in the collection. Use this when working with
   * virtualized lists where DOM elements may not all be mounted.
   * Mutually exclusive with `elementsList`.
   */
  itemCount?: MaybeRefOrGetter<number>;

  /**
   * List of HTML element references for static/dynamic DOM lists.
   * When provided, the collection size is derived from the array length
   * and disabled state is checked from DOM attributes.
   */
  elementsList?: MaybeRefOrGetter<Array<HTMLElement | null>>;

  /**
   * Optional controlled active index ref.
   * When provided, the composable synchronizes with and updates this ref.
   */
  activeIndex?: Ref<number>;

  /**
   * Initial active index for uncontrolled mode.
   * @default -1 (no active highlight initially)
   */
  defaultIndex?: number;

  /**
   * Base ID prefix used for generating deterministic descendant element IDs.
   * When omitted, an ID is automatically generated using Vue's `useId()`.
   */
  idPrefix?: string;

  /**
   * Custom ID resolver for mapping an item index and key to its DOM element ID.
   * When provided, takes precedence over the default `${idPrefix}-opt-${key ?? index}` pattern.
   */
  getItemId?: (index: number, key?: string | number) => string;

  /**
   * Optional key extractor for resolving a stable identity for the item at `index`.
   */
  getItemKey?: (index: number) => string | number;

  /**
   * Layout orientation of the navigable items.
   * Controls which arrow keys trigger navigation.
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

  /**
   * Whether keyboard navigation loops around at boundaries.
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Number of items to jump during PageUp and PageDown keyboard navigation.
   * @default 10
   */
  pageSize?: MaybeRefOrGetter<number>;

  /**
   * Whether the layout follows a Right-to-Left (RTL) reading order.
   * When omitted, automatically detected from the target element.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Whether active descendant navigation is enabled.
   * When `false`, keyboard handlers are inactive and `activeId` resolves to `undefined`.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to automatically scroll the active item into view.
   * @default true
   */
  scrollIntoView?: MaybeRefOrGetter<boolean>;

  /**
   * Whether the target element is an editable input.
   * When `true` (or `"auto"` when target is `<input>`/`<textarea>`/`contenteditable`),
   * Space typing and Home/End caret navigation are preserved natively.
   * @default "auto"
   */
  editable?: MaybeRefOrGetter<boolean | "auto">;

  /**
   * Whether pointerdown on item surfaces prevents default to avoid stealing DOM focus from `targetEl`.
   * Clicks on interactive descendant controls (buttons, links, inputs) are preserved.
   * @default true
   */
  preventPointerDown?: MaybeRefOrGetter<boolean>;

  /**
   * Whether moving the pointer over an item updates the active descendant.
   * Only applies to non-touch pointer types.
   * @default false
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to clear the active descendant when the pointer leaves the container.
   * Only active when `focusOnHover` is true.
   * @default false
   */
  clearOnPointerLeave?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to reset the active index back to `defaultIndex` when focus leaves the target element.
   * @default false
   */
  resetOnBlur?: MaybeRefOrGetter<boolean>;

  /**
   * Whether disabled items can receive virtual highlight for discoverability.
   * Even when `true`, disabled items cannot be selected (`onSelect` will not fire).
   * @default false
   */
  focusDisabledElements?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate determining if an item at a specific index is disabled.
   * Takes precedence over DOM attribute inspection when provided.
   */
  isItemDisabled?: (index: number) => boolean;

  /**
   * Virtualizer adapter for coordinating with TanStack Virtualizer or custom
   * virtual scrolling engines. When provided, `scrollToIndex` is called instead
   * of native DOM scrolling.
   */
  virtualizer?: VirtualizerAdapter;

  /**
   * Callback fired when Enter or Space is pressed on an active, non-disabled option.
   */
  onSelect?: (index: number, event: Event) => void;

  /**
   * Callback fired when the active index changes (navigation, programmatic set, or clear).
   */
  onActiveIndexChange?: (index: number) => void;

  /**
   * Optional custom predicate to determine if a keyboard event should be handled by this composable.
   */
  isKeyHandled?: (event: KeyboardEvent) => boolean;
}

/**
 * Polymorphic parameter accepted by `getItemProps`.
 */
export type AriaActivedescendantItemParam =
  | number
  | {
      index: number;
      key?: string | number;
    };
