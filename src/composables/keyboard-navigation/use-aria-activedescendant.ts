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
import { resolveNavigableIndexByIntent } from "./navigation";
import { useRtl } from "./rtl";
import type { VirtualizerAdapter } from "./virtualizer-adapter";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages virtual focus and keyboard navigation across composite widget items using the
 * WAI-ARIA `aria-activedescendant` pattern.
 *
 * Physical DOM focus stays pinned on the target/anchor element while the active descendant
 * is communicated to assistive technologies via the `aria-activedescendant` attribute.
 * Supports static DOM lists, dynamic collections, and virtualized scrolling engines.
 *
 * This is the complement to {@link useRovingFocus}: use `useRovingFocus` when DOM focus
 * should physically move between items (menus, toolbars, radio groups), and use
 * `useAriaActivedescendant` when DOM focus must remain on an input or container
 * (comboboxes, autocompletes, searchable selects, virtualized lists, trees, grids).
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
    anchorEl,
    containerEl,
    listboxEl,
    elementsList,
    itemCount: rawItemCount,
    activeIndex: controlledActiveIndex,
    defaultIndex = -1,
    idPrefix,
    getItemId,
    getItemKey,
    orientation = "vertical",
    loop = false,
    rtl,
    enabled = true,
    editable = "auto",
    preventPointerDown = true,
    focusOnHover = false,
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
  const targetElement = computed(() => toValue(targetEl ?? anchorEl) ?? null);
  const containerElement = computed(() => toValue(containerEl ?? listboxEl) ?? null);
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
    if (elementsList?.value) return elementsList.value.length;
    if (rawItemCount !== undefined) return toValue(rawItemCount);
    if (virtualizer?.count) return toValue(virtualizer.count);
    return 0;
  });

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

    const elements = elementsList?.value;
    if (elements?.[idx]) {
      const el = elements[idx];
      return !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true";
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
    const elements = elementsList?.value;
    if (elements && elements[idx]) {
      const el = elements[idx];
      return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
    }
    return false;
  }

  // --- DOM Element Lookup & Validation ----------------------------------------

  /**
   * Finds a mounted, connected DOM element representing the item at `idx` with expected `id`.
   */
  function findMountedElement(idx: number, id: string): HTMLElement | null {
    if (typeof document === "undefined") return null;

    const elements = elementsList?.value;
    if (elements && elements[idx] && elements[idx].isConnected) {
      return elements[idx];
    }

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

    try {
      const docEl = document.getElementById(id);
      if (docEl && docEl.isConnected) {
        if (!container || container.contains(docEl)) {
          return docEl;
        }
      }
    } catch {
      // document getElementById guard
    }

    return null;
  }

  // --- Active Descendant DOM Validation & Commit ------------------------------

  const committedActiveId = shallowRef<string | undefined>(undefined);

  /**
   * Synchronizes and validates that the currently active item exists in the DOM.
   * Per WAI-ARIA ownership and ID requirements, `aria-activedescendant` is only
   * committed when the referenced element is actually mounted in the DOM.
   */
  function syncActiveElementId(): void {
    const idx = activeIndex.value;
    if (!isEnabled.value || idx < 0 || idx >= totalCount.value) {
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
      return;
    }

    // Element is not in the DOM yet (e.g. virtualized off-screen). Clear attribute.
    committedActiveId.value = undefined;

    if (typeof window !== "undefined") {
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
    void elementsList?.value;
    void containerElement.value;
    syncActiveElementId();
  });

  watch(
    containerElement,
    (container, _, onCleanup) => {
      if (!container || typeof MutationObserver === "undefined") return;

      const observer = new MutationObserver(() => {
        syncActiveElementId();
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["id", "data-index", "disabled", "aria-disabled"],
      });

      onCleanup(() => {
        observer.disconnect();
      });
    },
    { immediate: true, flush: "post" },
  );

  const activeId = computed<string | undefined>(() => committedActiveId.value);

  // --- Scroll & Virtualizer Coordination --------------------------------------

  function scrollToActiveItem(idx: number): void {
    if (idx < 0 || !isEnabled.value) return;

    if (virtualizer) {
      virtualizer.scrollToIndex(idx, { align: "auto" });
      return;
    }

    const elements = elementsList?.value;
    if (elements && elements[idx]) {
      scrollIntoViewBounded(elements[idx], containerElement.value, currentOrientation.value);
      return;
    }

    if (containerElement.value) {
      const id = resolveItemId(idx);
      const targetDomEl = findMountedElement(idx, id);
      if (targetDomEl) {
        scrollIntoViewBounded(targetDomEl, containerElement.value, currentOrientation.value);
      }
    }
  }

  // Watch activeIndex to ensure externally controlled changes trigger scroll reveal
  watch(
    () => activeIndex.value,
    (newIndex) => {
      if (newIndex >= 0 && isEnabled.value) {
        scrollToActiveItem(newIndex);
      }
    },
    { flush: "post" },
  );

  // Watch isEnabled to ensure re-enabling triggers scroll reveal if an item is active
  watch(
    () => isEnabled.value,
    (enabled) => {
      if (enabled && activeIndex.value >= 0) {
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
  function setVirtualFocus(idx: number): void {
    if (idx === -1) {
      activeIndex.value = -1;
      return;
    }

    if (!isItemNavigable(idx)) return;

    activeIndex.value = idx;
    scrollToActiveItem(idx);
  }

  // --- Keyboard Navigation ----------------------------------------------------

  function navigate(intent: "first" | "last" | "next" | "previous"): void {
    const total = totalCount.value;
    if (total === 0) return;

    const current = activeIndex.value >= 0 ? activeIndex.value : -1;
    const targetIdx = resolveNavigableIndexByIntent(
      intent,
      current,
      total,
      (i) => !isItemNavigable(i),
      isLoop.value,
    );

    if (targetIdx !== null) {
      setVirtualFocus(targetIdx);
    }
  }

  useEventListener(targetElement, "keydown", (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;

    if (isKeyHandled && !isKeyHandled(e)) return;

    const target = e.target as Element | null;
    const editableTarget = isEditable.value || isEditableElement(target);

    // If target is editable (e.g. text input), preserve native typing and caret navigation
    if (editableTarget) {
      if (e.key === " " || e.key === "Spacebar" || e.key === "Home" || e.key === "End") {
        return;
      }
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

  // --- Focus-Entry Synchronization --------------------------------------------

  useEventListener(targetElement, "focusin", () => {
    if (!isEnabled.value) return;
    if (activeIndex.value >= 0) {
      scrollToActiveItem(activeIndex.value);
    }
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

    // Prevent browser from blurring the target/anchor input
    e.preventDefault();
  }

  useEventListener(
    () => (isFocusOnHover.value ? containerElement.value : null),
    "pointermove",
    (e: PointerEvent) => {
      if (e.defaultPrevented || !isEnabled.value) return;
      if (e.pointerType === "touch") return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const container = containerElement.value;

      // 1. Try finding data-index on target or closest ancestor (works for virtual and static lists)
      const itemEl = target.closest<HTMLElement>("[data-index]");
      if (itemEl && (container ? container.contains(itemEl) : true)) {
        const rawIndex = itemEl.getAttribute("data-index");
        if (rawIndex !== null) {
          const idx = Number.parseInt(rawIndex, 10);
          if (!Number.isNaN(idx) && idx !== activeIndex.value && isItemNavigable(idx)) {
            setVirtualFocus(idx);
            return;
          }
        }
      }

      // 2. Fallback to elementsList if available
      const elements = elementsList?.value;
      if (elements) {
        for (let idx = 0; idx < elements.length; idx++) {
          if (
            elements[idx]?.contains(target) &&
            idx !== activeIndex.value &&
            isItemNavigable(idx)
          ) {
            setVirtualFocus(idx);
            return;
          }
        }
      }
    },
  );

  // --- Props Normalization & Return -------------------------------------------

  const getTargetProps = () => ({
    "aria-activedescendant": activeId.value,
  });
  const getAnchorProps = getTargetProps;

  const getContainerProps = () => ({
    id: containerElement.value?.id || undefined,
  });
  const getListboxProps = getContainerProps;

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
  const getVirtualOptionProps = getVirtualItemProps;

  return {
    activeIndex: readonly(activeIndex),
    activeId,
    setActiveIndex: setVirtualFocus,
    clearActive: () => setVirtualFocus(-1),
    next: () => navigate("next"),
    prev: () => navigate("previous"),
    first: () => navigate("first"),
    last: () => navigate("last"),
    getTargetProps,
    getAnchorProps,
    getContainerProps,
    getListboxProps,
    getItemProps,
    getOptionProps,
    getVirtualItemProps,
    getVirtualOptionProps,
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
  return typeof id === "string" && id.trim().length > 0 && !/\s/.test(id);
}

/**
 * Checks whether an element is natively editable (text input, textarea, or contenteditable).
 *
 * Used to preserve native text editing and caret navigation (Space, Home, End).
 */
function isEditableElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    const nonEditableTypes = [
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
    ];
    return !nonEditableTypes.includes(type);
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
 * Scrolls an element into view within a bounded container, adjusting only
 * `container.scrollTop` and/or `container.scrollLeft` to avoid full-page scroll jumps.
 *
 * Falls back to native `element.scrollIntoView` when no container is provided.
 */
function scrollIntoViewBounded(
  el: HTMLElement | null,
  container: HTMLElement | null,
  orientation: "vertical" | "horizontal" | "both" = "vertical",
): void {
  if (!el) return;
  if (!container) {
    el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    return;
  }

  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Vertical scroll adjustment
  if (orientation === "vertical" || orientation === "both") {
    if (elRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - elRect.top;
    } else if (elRect.bottom > containerRect.bottom) {
      container.scrollTop += elRect.bottom - containerRect.bottom;
    }
  }

  // Horizontal scroll adjustment
  if (orientation === "horizontal" || orientation === "both") {
    if (elRect.left < containerRect.left) {
      container.scrollLeft -= containerRect.left - elRect.left;
    } else if (elRect.right > containerRect.right) {
      container.scrollLeft += elRect.right - containerRect.right;
    }
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Polymorphic parameter accepted by `getItemProps`.
 */
export type AriaActivedescendantItemParam =
  | number
  | {
      index: number;
      key?: string | number;
    };

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
   * Generates ARIA props for the target/anchor element holding physical DOM focus.
   *
   * Returns `aria-activedescendant` (the mounted active item's ID or `undefined`).
   */
  getTargetProps: () => Record<string, unknown>;

  /**
   * Alias for {@link getTargetProps}.
   */
  getAnchorProps: () => Record<string, unknown>;

  /**
   * Generates container identity props.
   */
  getContainerProps: () => Record<string, unknown>;

  /**
   * Alias for {@link getContainerProps}.
   */
  getListboxProps: () => Record<string, unknown>;

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

  /**
   * Alias for {@link getVirtualItemProps}.
   */
  getVirtualOptionProps: (virtualItem: {
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
   * Alias for `targetEl`. Anchor or input element that retains physical DOM focus and receives keyboard events.
   */
  anchorEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Composite container element holding the items. Used for bounded scroll calculations and query validation.
   */
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Alias for `containerEl`. The list or popup container element holding the option elements.
   */
  listboxEl?: MaybeRefOrGetter<HTMLElement | null>;

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
  elementsList?: Readonly<Ref<Array<HTMLElement | null>>>;

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
