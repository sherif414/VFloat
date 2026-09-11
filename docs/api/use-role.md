---
description: Synchronizes ARIA roles and accessibility relationships for floating surfaces.
---

# useRole

`useRole` manages the semantic accessibility layer for floating surfaces. It synchronizes ARIA roles, `aria-expanded`, `aria-haspopup`, and `aria-controls` on the anchor and floating element.

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
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. While `false`, attributes are not written. |
| `role` | `MaybeRefOrGetter<FloatingRole \| null>` | `null` | Surface role. Semantic attributes are applied only when a role is set. |
| `label` | `MaybeRefOrGetter<string \| null>` | `undefined` | Sets `aria-label` on the floating surface. |
| `labelledBy` | `MaybeRefOrGetter<string \| null>` | `undefined` | Sets `aria-labelledby` referencing an element id. |
| `describedBy` | `MaybeRefOrGetter<string \| null>` | `undefined` | Sets `aria-describedby` referencing an element id. |
| `controls` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, links anchor to panel with `aria-controls`. |
| `modal` | `MaybeRefOrGetter<boolean>` | `undefined` | With `role: "dialog"`, writes `aria-modal="true"`. |
| `listRef` | `Ref<Array<HTMLElement \| null>>` | `undefined` | Item refs array for automatic item role application. |
| `itemRole` | Role string or function | Auto | Fixed or per-index role for items in `listRef`. |
| `disabledIndices` | `Array<number> \| ((idx) => boolean)` | `undefined` | Marks items with `aria-disabled="true"`. |
| `checkedIndices` | `Array<number> \| ((idx) => boolean)` | `undefined` | Marks items with `aria-checked="true"`. |
| `selectedIndices` | `Array<number> \| ((idx) => boolean)` | `undefined` | Marks items with `aria-selected="true"`. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `cleanup` | `() => void` | Restores original attributes on all elements and stops attribute watchers. |

## Details

### Role Mapping Behavior

- **`role: "tooltip"`:** Sets `role="tooltip"` on the floating element and adds `aria-describedby` pointing to the tooltip ID on the anchor while open. Tooltips are not treated as popups.
- **Popup Roles (`"menu"`, `"listbox"`, `"tree"`, `"grid"`, `"dialog"`):** Sets `aria-haspopup="{role}"`, `aria-expanded="true|false"`, and `aria-controls="{id}"` on the anchor element.
- **ID Generation:** Automatically generates unique IDs (`vfloat-{role}-{id}`) if elements do not already possess IDs.
- **Submenus:** Calling `useRole(childNode, { role: "menu" })` on a child node writes submenu attributes (`aria-haspopup="menu"`, `aria-expanded`) onto the child anchor element inside the parent menu.

### Responsibility Boundaries

`useRole` manages accessibility attributes. It intentionally does **not** attach keyboard listeners, manage `tabindex`, or trap focus:

- For arrow key focus, pair with [`useRovingFocus`](/api/use-roving-focus).
- For virtual focus on comboboxes, pair with [`useAriaActivedescendant`](/api/use-aria-activedescendant).
- For dialog focus trapping, pair with [`useFocusTrap`](/api/use-focus-trap).

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const items = ["Profile", "Settings", "Billing"];

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useClick(node);
useDismiss(node);
useRole(node, {
  role: "menu",
  label: "User Menu",
  listRef: itemsRef,
});
</script>

<template>
  <button ref="anchorEl" type="button">User Menu</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">
    <div
      v-for="(item, idx) in items"
      :key="item"
      :ref="(el) => (itemsRef[idx] = el as HTMLElement | null)"
    >
      {{ item }}
    </div>
  </div>
</template>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Shared node instance
- [`useRovingFocus`](/api/use-roving-focus) - Keyboard navigation for menus
- [`useFocusTrap`](/api/use-focus-trap) - Traps focus for `role: "dialog"`
- [Choosing the Right Pattern](/guide/choosing-the-right-pattern) - How to pick roles according to WAI-ARIA
