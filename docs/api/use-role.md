---
description: Synchronizes ARIA roles and states for floating surfaces.
---

# useRole

`useRole` applies the semantic layer for floating surfaces. Use it when a tooltip, dialog, menu, listbox, or related composite should keep its `role` and ARIA state synchronized with the floating node.

## Type

```ts
function useRole(node: FloatingNode, options?: UseRoleOptions): UseRoleReturn;

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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | While disabled, nothing is written. |
| `role` | `MaybeRefOrGetter<FloatingRole \| null \| undefined>` | `null` | Attributes are only written while a role is set. |
| `label` / `labelledBy` / `describedBy` | `MaybeRefOrGetter<string \| null \| undefined>` | — | Accessible naming for the floating surface. |
| `controls` | `MaybeRefOrGetter<boolean>` | `true` | Adds `aria-controls` for popup roles. |
| `modal` | `MaybeRefOrGetter<boolean>` | — | With `role: "dialog"`, sets `aria-modal="true"`. |
| `listRef` | `Ref<Array<HTMLElement \| null>>` | — | Applies item roles in DOM order. |
| `itemRole` | role or `(index, itemEl) => role` | — | Fixed or per-index item role. |
| `disabledIndices` / `checkedIndices` / `selectedIndices` | `Array<number> \| ((index: number) => boolean)` | — | Item state exposed through ARIA. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `cleanup` | `() => void` | Stops watchers and restores managed attributes. |

## Details

`useRole` owns ARIA semantics, not interaction behavior. Pair it with [`useClick`](/api/use-click), [`useHover`](/api/use-hover), [`useEscapeKey`](/api/use-escape-key), [`useFocusManager`](/api/use-focus-manager), or keyboard navigation when the role promises keyboard, focus, or dismissal behavior.

- `role: "tooltip"` applies `role="tooltip"` and links the anchor with `aria-describedby` while open.
- Popup roles `"menu"`, `"listbox"`, `"tree"`, `"grid"`, and `"dialog"` set `aria-haspopup`, `aria-expanded` (`"true"`/`"false"`), and `aria-controls` on the anchor. `"menubar"` and `"tooltip"` are not treated as popups.
- Missing element ids are generated (`vfloat-{role}-{id}`); existing ids are reused.
- Menu items default to `role="menuitem"`, listbox items to `role="option"`, tree items to `role="treeitem"`, and grid cells to `role="gridcell"`.
- `aria-checked` only applies to checkbox and radio items; `aria-selected` only to grid, option, and tree items.
- Child menu nodes can call `useRole(childNode, { role: "menu" })`; the child node's anchor receives the submenu `aria-haspopup`, `aria-expanded`, and `aria-controls` state.

ARIA roles are a contract. For example, `role="menu"` should be reserved for desktop-style command menus that also implement managed focus and arrow-key behavior.

`useRole` does not manage `tabindex` or `aria-activedescendant`. Keep those in your render layer and drive them from keyboard navigation state.

## Example

Add menu semantics to a click-opened list:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const items = ["Edit", "Duplicate", "Archive"];

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useClick(node);
useRole(node, {
  role: "menu",
  label: "Actions",
  listRef: itemsRef,
  disabledIndices: [2],
});
</script>

<template>
  <button ref="anchorEl" type="button">Actions</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">
    <button
      v-for="(item, index) in items"
      :key="item"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      type="button"
      :disabled="index === 2"
    >
      {{ item }}
    </button>
  </div>
</template>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [`useClick`](/api/use-click) - Opens on click
- [`useCollection`](/api/use-collection) - Headless value model for keyboard navigation
- [Keyboard Navigation](/guide/keyboard-navigation) - Arrow-key workflows
- [Build Nested Menus](/guide/build-nested-menus) - Menu pattern
- [Choosing the Right Pattern](/guide/choosing-the-right-pattern) - Role selection
