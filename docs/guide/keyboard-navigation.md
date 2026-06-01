---
description: Add keyboard navigation to floating menus, dropdowns, and nested tree structures.
---

# Keyboard Navigation

Predictable keyboard navigation is a core requirement for accessible floating surfaces like menus, listboxes, comboboxes, and submenus.

In VFloat, keyboard navigation is split into a clean separation of concerns:

1. **[`useCollection`](/api/use-collection) or [`useTree`](/api/use-tree)** is the data-first reactive manager. `useCollection` covers flat string-valued lists; `useTree` covers item objects and nested branches.
2. **[`useListNavigation`](/api/use-list-navigation)** is an event interceptor. It listens for keyboard events on the anchor and floating elements and translates key triggers (arrows, Home, End, Tab) into movement operations on the collection.
3. **[`useRole`](/api/use-role)** is a semantic synchronizer. It applies standard ARIA roles and popup states such as `aria-expanded` and `aria-controls`; focus-specific states such as `tabindex` and `aria-activedescendant` stay in your render layer.

---

## 1. DOM Focus Model: Menus and Action Lists

In this model, focus actually shifts into the floating list, and arrow keys move physical DOM focus between list items using a roving `tabindex`. Only the active item is focusable (`tabindex="0"`), while the rest are ignored (`tabindex="-1"`).

### Composable Setup

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFloatingContext, usePosition, useTree, useListNavigation, useRole } from "v-float";

interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

const items = ref<MenuItem[]>([
  { id: "edit", label: "Edit Item" },
  { id: "duplicate", label: "Duplicate" },
  { id: "archive", label: "Archive Item", disabled: true },
  { id: "delete", label: "Delete" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

// 1. Manage navigation state
const tree = useTree({
  items,
  getItemId: (item) => item.id,
  isItemDisabled: (item) => !!item.disabled,
});

// 2. Intercept keyboard navigation on elements
useListNavigation(context, {
  collection: tree.rootBranch,
  orientation: "vertical",
  loop: true,
  onEnter(activeValue) {
    if (!tree.hasChildren(activeValue)) return;

    tree.expandBranch(activeValue);
    const firstEnabled = tree.getFirstEnabledDescendantValue(activeValue);
    if (firstEnabled) tree.setActiveValue(firstEnabled);
  },
  onExit(activeValue) {
    const parentValue = tree.getParentValue(activeValue);
    if (!parentValue) return;

    tree.setActiveValue(parentValue);
    tree.collapseBranch(parentValue);
  },
});

// 3. Keep ARIA roles synchronized
useRole(context, {
  role: "menu",
  listRef: itemsRef,
  disabledIndices: (idx) => !!items.value[idx]?.disabled,
});

// 4. Focus the active item in the DOM when the selection moves
watch(tree.activeValue, async (val) => {
  if (val == null) return;
  await nextTick();
  const index = items.value.findIndex((item) => item.id === val);
  const element = itemsRef.value[index];
  if (element && document.activeElement !== element) {
    element.focus();
  }
});
</script>
```

### Template

Render item elements with roving `tabindex` and bind dynamic active classes:

```vue
<template>
  <button ref="anchorEl" type="button" @click="context.state.setOpen(!context.state.open.value)">
    Menu Options
  </button>

  <ul v-if="context.state.open.value" ref="floatingEl" role="menu" :style="styles">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      role="menuitem"
      :aria-disabled="item.disabled"
      :tabindex="tree.activeValue.value === item.id ? 0 : -1"
      :class="{ active: tree.activeValue.value === item.id }"
      @click="tree.setActiveValue(item.id)"
    >
      {{ item.label }}
    </li>
  </ul>
</template>
```

---

## 2. Virtual Focus Model: Combobox and Inputs

In this model, DOM focus stays inside a text input or combobox container, allowing the user to keep typing. Arrow keys move a "virtual focus" selection, communicating the active choice to screen readers using `aria-activedescendant`.

### Composable Setup

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useTree, useListNavigation, useRole } from "v-float";

interface SearchOption {
  value: string;
  label: string;
}

const options = ref<SearchOption[]>([
  { value: "vue", label: "Vue.js" },
  { value: "react", label: "React" },
  { value: "svelte", label: "Svelte" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

const tree = useTree({
  items: options,
  getItemId: (item) => item.value,
});

useListNavigation(context, {
  collection: tree.rootBranch,
  orientation: "vertical",
  openOnArrowKeyDown: true,
});

useRole(context, {
  role: "listbox",
  listRef: itemsRef,
});
</script>
```

### Template

Directly bind `aria-activedescendant` on the input trigger referencing the active option ID:

```vue
<template>
  <input
    ref="anchorEl"
    type="text"
    role="combobox"
    aria-autocomplete="list"
    :aria-expanded="context.state.open.value"
    :aria-activedescendant="tree.activeValue.value ? `opt-${tree.activeValue.value}` : undefined"
    @focus="context.state.setOpen(true)"
  />

  <ul v-if="context.state.open.value" ref="floatingEl" role="listbox" :style="styles">
    <li
      v-for="(item, index) in options"
      :key="item.value"
      :id="`opt-${item.value}`"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      role="option"
      :aria-selected="tree.activeValue.value === item.value"
      :class="{ active: tree.activeValue.value === item.value }"
      @click="tree.setActiveValue(item.value)"
    >
      {{ item.label }}
    </li>
  </ul>
</template>
```

---

## 3. Keyboard Interactions Resolved

Here are the key events handled automatically by `useListNavigation`:

| Key          | Orientation         | Action                                                                                                                                  |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ArrowDown`  | `"vertical"`        | Selects next enabled item. If closed and `openOnArrowKeyDown` is true, opens list and selects first item.                               |
| `ArrowUp`    | `"vertical"`        | Selects previous enabled item. If closed and `openOnArrowKeyDown` is true, opens list and selects last item.                            |
| `ArrowRight` | `"horizontal"`      | Selects next enabled item (or previous in RTL).                                                                                         |
| `ArrowLeft`  | `"horizontal"`      | Selects previous enabled item (or next in RTL).                                                                                         |
| `ArrowRight` | `"vertical"` (Tree) | Fires `onEnter`; tree setups usually expand the active branch and target the first enabled descendant.                                  |
| `ArrowLeft`  | `"vertical"` (Tree) | Fires `onExit`; tree setups usually move active value back to the parent item and collapse that branch.                                 |
| `Home`       | Any                 | Selects the first enabled item in the visible flat list.                                                                                |
| `End`        | Any                 | Selects the last enabled item in the visible flat list.                                                                                 |
| `Tab`        | Any                 | Closes the open floating surface (if `closeOnTab` is true) without blocking the default focus movement to the next element on the page. |

---

## 4. Where To Go Next

- Learn how to build highly responsive, multi-level dropdown hierarchies in [Build Nested Menus](/guide/build-nested-menus).
- Read the [useCollection API](/api/use-collection) reference for flat string-valued lists.
- Read the [useTree API](/api/use-tree) reference.
- Read the [useListNavigation API](/api/use-list-navigation) reference.
