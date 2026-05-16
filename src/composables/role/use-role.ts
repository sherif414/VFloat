import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  type Ref,
  toValue,
  watchPostEffect,
} from "vue";
import type { FloatingContext } from "@/composables";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Synchronizes ARIA roles and state for floating surfaces and their composite items.
 *
 * Behavior composables still own interaction. `useRole()` only keeps the semantic
 * contract aligned with the current DOM and open state.
 */
export function useRole(context: FloatingContext, options: UseRoleOptions = {}): UseRoleReturn {
  const { open } = context.state;
  const {
    enabled: enabledOption = true,
    role: roleOption = null,
    controls: controlsOption = true,
    label: labelOption,
    labelledBy: labelledByOption,
    describedBy: describedByOption,
    modal: modalOption,
    listRef,
    itemRole: itemRoleOption,
    disabledIndices: disabledIndicesOption,
    checkedIndices: checkedIndicesOption,
    selectedIndices: selectedIndicesOption,
  } = options;

  const isEnabled = computed(() => toValue(enabledOption));
  const shouldControlPopup = computed(() => toValue(controlsOption));
  const cleanupRegistry = createCleanupRegistry();

  const stop = watchPostEffect(() => {
    const managedAttributes: ManagedAttribute[] = [];

    onWatcherCleanup(() => {
      restoreManagedAttributes(managedAttributes);
    });

    if (!isEnabled.value) {
      return;
    }

    const role = toValue(roleOption);
    const anchorEl = getAnchorEl(context.refs.anchorEl.value);
    const floatingEl = context.refs.floatingEl.value;

    if (floatingEl && role) {
      setManagedAttribute(managedAttributes, floatingEl, "role", role);
      setManagedAttribute(managedAttributes, floatingEl, "aria-label", toValue(labelOption));
      setManagedAttribute(
        managedAttributes,
        floatingEl,
        "aria-labelledby",
        toValue(labelledByOption),
      );
      setManagedAttribute(
        managedAttributes,
        floatingEl,
        "aria-describedby",
        toValue(describedByOption),
      );

      if (role === "dialog") {
        setManagedAttribute(
          managedAttributes,
          floatingEl,
          "aria-modal",
          toValue(modalOption) ? "true" : null,
        );
      }
    }

    if (anchorEl && floatingEl && role === "tooltip" && open.value) {
      setManagedAttribute(
        managedAttributes,
        anchorEl,
        "aria-describedby",
        ensureElementId(floatingEl, "tooltip"),
      );
    }

    if (anchorEl && floatingEl && role && isPopupRole(role)) {
      setManagedAttribute(managedAttributes, anchorEl, "aria-haspopup", getPopupValue(role));
      setManagedAttribute(managedAttributes, anchorEl, "aria-expanded", String(open.value));

      if (shouldControlPopup.value) {
        setManagedAttribute(
          managedAttributes,
          anchorEl,
          "aria-controls",
          ensureElementId(floatingEl, role),
        );
      }
    }

    const items = listRef?.value ?? [];

    for (let index = 0; index < items.length; index++) {
      const itemEl = items[index];

      if (!itemEl) {
        continue;
      }

      const itemRole = getItemRole(itemRoleOption, role, index, itemEl);
      setManagedAttribute(managedAttributes, itemEl, "role", itemRole);

      setManagedAttribute(
        managedAttributes,
        itemEl,
        "aria-disabled",
        matchesIndex(index, disabledIndicesOption) ? "true" : null,
      );

      if (isCheckedItemRole(itemRole)) {
        setManagedAttribute(
          managedAttributes,
          itemEl,
          "aria-checked",
          matchesIndex(index, checkedIndicesOption) ? "true" : "false",
        );
      }

      if (isSelectedItemRole(itemRole)) {
        setManagedAttribute(
          managedAttributes,
          itemEl,
          "aria-selected",
          matchesIndex(index, selectedIndicesOption) ? "true" : null,
        );
      }
    }
  });

  cleanupRegistry.add(stop);
  tryOnScopeDispose(cleanupRegistry.cleanup);

  return {
    cleanup: cleanupRegistry.cleanup,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

let roleIdCounter = 0;

function createRoleId(prefix: string) {
  roleIdCounter += 1;
  return `vfloat-${prefix}-${roleIdCounter}`;
}

function getAnchorEl(anchorEl: FloatingContext["refs"]["anchorEl"]["value"]) {
  if (anchorEl instanceof HTMLElement) {
    return anchorEl;
  }

  if (anchorEl?.contextElement instanceof HTMLElement) {
    return anchorEl.contextElement;
  }

  return null;
}

function isPopupRole(role: FloatingRole | null | undefined) {
  return (
    role === "dialog" || role === "grid" || role === "listbox" || role === "menu" || role === "tree"
  );
}

function getPopupValue(role: FloatingRole) {
  return role === "menubar" ? "menu" : role;
}

function getDefaultItemRole(role: FloatingRole | null | undefined): FloatingRoleItemRole | null {
  if (role === "menu" || role === "menubar") {
    return "menuitem";
  }

  if (role === "listbox") {
    return "option";
  }

  if (role === "tree") {
    return "treeitem";
  }

  if (role === "grid") {
    return "gridcell";
  }

  return null;
}

function isCheckedItemRole(role: FloatingRoleItemRole | null | undefined) {
  return role === "menuitemcheckbox" || role === "menuitemradio";
}

function isSelectedItemRole(role: FloatingRoleItemRole | null | undefined) {
  return role === "gridcell" || role === "option" || role === "treeitem";
}

function matchesIndex(index: number, matcher?: Array<number> | ((index: number) => boolean)) {
  if (!matcher) {
    return false;
  }

  return Array.isArray(matcher) ? matcher.includes(index) : matcher(index);
}

function ensureElementId(el: HTMLElement, prefix: string) {
  if (!el.id) {
    el.id = createRoleId(prefix);
  }

  return el.id;
}

function setManagedAttribute(
  managedAttributes: ManagedAttribute[],
  el: HTMLElement | null,
  attribute: string,
  value: string | boolean | null | undefined,
) {
  if (!el) {
    return;
  }

  managedAttributes.push({
    attribute,
    el,
    previousValue: el.getAttribute(attribute),
  });

  if (value == null || value === false) {
    el.removeAttribute(attribute);
    return;
  }

  el.setAttribute(attribute, value === true ? "true" : value);
}

function restoreManagedAttributes(managedAttributes: ManagedAttribute[]) {
  for (const { attribute, el, previousValue } of [...managedAttributes].reverse()) {
    if (previousValue == null) {
      el.removeAttribute(attribute);
    } else {
      el.setAttribute(attribute, previousValue);
    }
  }

  managedAttributes.length = 0;
}

function getItemRole(
  itemRole: UseRoleOptions["itemRole"],
  role: FloatingRole | null | undefined,
  index: number,
  itemEl: HTMLElement,
) {
  if (typeof itemRole === "function") {
    return itemRole(index, itemEl) ?? null;
  }

  return (itemRole !== undefined ? toValue(itemRole) : getDefaultItemRole(role)) ?? null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Popup and composite roles managed by `useRole()`.
 */
export type FloatingRole = "dialog" | "grid" | "listbox" | "menu" | "menubar" | "tooltip" | "tree";

/**
 * Item roles that can appear inside managed composite roles.
 */
export type FloatingRoleItemRole =
  | "gridcell"
  | "group"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "none"
  | "option"
  | "presentation"
  | "separator"
  | "treeitem";

/**
 * Options for syncing ARIA roles, states, and relationships.
 */
export interface UseRoleOptions {
  /**
   * Whether role synchronization is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * The role applied to the floating element.
   */
  role?: MaybeRefOrGetter<FloatingRole | null | undefined>;

  /**
   * Accessible label applied to the floating element.
   */
  label?: MaybeRefOrGetter<string | null | undefined>;

  /**
   * ID of the element that labels the floating element.
   */
  labelledBy?: MaybeRefOrGetter<string | null | undefined>;

  /**
   * ID of the element that describes the floating element.
   */
  describedBy?: MaybeRefOrGetter<string | null | undefined>;

  /**
   * Whether the anchor should point at the floating element with `aria-controls`.
   * @default true
   */
  controls?: MaybeRefOrGetter<boolean>;

  /**
   * Whether a dialog should be announced as modal.
   */
  modal?: MaybeRefOrGetter<boolean>;

  /**
   * Reactive collection of item elements inside the floating element.
   */
  listRef?: Ref<Array<HTMLElement | null>>;

  /**
   * Role applied to each item, or a resolver for per-item roles.
   */
  itemRole?:
    | MaybeRefOrGetter<FloatingRoleItemRole | null | undefined>
    | ((index: number, itemEl: HTMLElement) => FloatingRoleItemRole | null | undefined);

  /**
   * Indices that should be announced as disabled.
   */
  disabledIndices?: Array<number> | ((index: number) => boolean);

  /**
   * Indices that should be announced as checked for checkbox/radio menu items.
   */
  checkedIndices?: Array<number> | ((index: number) => boolean);

  /**
   * Indices that should be announced as selected for option/tree/grid items.
   */
  selectedIndices?: Array<number> | ((index: number) => boolean);
}

export interface UseRoleReturn {
  /**
   * Stops watchers and restores attributes managed by the composable.
   */
  cleanup: () => void;
}

type ManagedAttribute = {
  attribute: string;
  el: HTMLElement;
  previousValue: string | null;
};
