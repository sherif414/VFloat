---
description: Synchronizes ARIA roles and states for floating surfaces.
---

# useRole

`useRole` applies the semantic layer for floating surfaces. Use it when a tooltip, dialog, menu, listbox, or related composite should keep its `role` and ARIA state synchronized with the floating context.

## Type

```ts
function useRole(context: FloatingContext, options?: UseRoleOptions): UseRoleReturn;

type FloatingRole = "dialog" | "grid" | "listbox" | "menu" | "menubar" | "tooltip" | "tree";

type FloatingRoleItemRole =
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

interface UseRoleOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  role?: MaybeRefOrGetter<FloatingRole | null | undefined>;
  label?: MaybeRefOrGetter<string | null | undefined>;
  labelledBy?: MaybeRefOrGetter<string | null | undefined>;
  describedBy?: MaybeRefOrGetter<string | null | undefined>;
  controls?: MaybeRefOrGetter<boolean>;
  modal?: MaybeRefOrGetter<boolean>;
  listRef?: Ref<Array<HTMLElement | null>>;
  itemRole?:
    | MaybeRefOrGetter<FloatingRoleItemRole | null | undefined>
    | ((index: number, itemEl: HTMLElement) => FloatingRoleItemRole | null | undefined);
  disabledIndices?: Array<number> | ((index: number) => boolean);
  checkedIndices?: Array<number> | ((index: number) => boolean);
  selectedIndices?: Array<number> | ((index: number) => boolean);
}

interface UseRoleReturn {
  cleanup: () => void;
}
```

## Details

`useRole` owns ARIA semantics, not interaction behavior. Pair it with [`useClick`](/api/use-click), [`useHover`](/api/use-hover), [`useEscapeKey`](/api/use-escape-key), [`useFocusTrap`](/api/use-focus-trap), or [`useListNavigation`](/api/use-list-navigation) when the role promises keyboard, focus, or dismissal behavior.

- `role: "tooltip"` applies `role="tooltip"` and links the anchor with `aria-describedby` while open.
- Popup roles such as `"menu"`, `"listbox"`, `"tree"`, `"grid"`, and `"dialog"` set `aria-haspopup`, `aria-expanded`, and `aria-controls` on the anchor.
- `listRef` lets the composable apply item roles in DOM order.
- Menu and menubar items default to `role="menuitem"`.
- Listbox items default to `role="option"`.
- `itemRole` can return `menuitemcheckbox`, `menuitemradio`, `separator`, or another supported item role per index.
- `disabledIndices`, `checkedIndices`, and `selectedIndices` keep item state exposed through ARIA.
- Child menu contexts can call `useRole(childContext, { role: "menu" })`; the child context's anchor receives the submenu `aria-haspopup`, `aria-expanded`, and `aria-controls` state.
- `cleanup()` stops the watchers and restores attributes that `useRole` managed.

ARIA roles are a contract. For example, `role="menu"` should be reserved for desktop-style command menus that also implement managed focus and arrow-key behavior.

`useRole` does not manage `tabindex` or `aria-activedescendant`. Keep those in your render layer and drive them from the active value managed by [`useListNavigation`](/api/use-list-navigation).

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useClick,
  useFloatingContext,
  useListNavigation,
  usePosition,
  useRole,
  useTree,
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const items = ["Edit", "Duplicate", "Archive"];

const context = useFloatingContext(anchorEl, floatingEl);
const { styles } = usePosition(context);
const tree = useTree({
  items,
  getItemId: (item) => item,
  isItemDisabled: (item) => item === "Archive",
});

useClick(context);
useRole(context, {
  role: "menu",
  label: "Actions",
  listRef: itemsRef,
  disabledIndices: [2],
});
useListNavigation(context, {
  collection: tree.rootBranch,
  loop: true,
  orientation: "vertical",
});
</script>

<template>
  <button ref="anchorEl" type="button">Actions</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">
    <button
      v-for="(item, index) in items"
      :key="item"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      type="button"
      :disabled="tree.isItemDisabled(item)"
      :class="{ active: tree.activeValue.value === item }"
    >
      {{ item }}
    </button>
  </div>
</template>
```

## See Also

- [`useFloatingContext`](/api/use-floating-context)
- [`useClick`](/api/use-click)
- [`useListNavigation`](/api/use-list-navigation)
- [`useTree`](/api/use-tree)
- [Keyboard Navigation](/guide/keyboard-navigation)
- [Build Nested Menus](/guide/build-nested-menus)
- [Choosing the Right Pattern](/guide/choosing-the-right-pattern)
