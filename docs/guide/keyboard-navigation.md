---
description: Add keyboard navigation to floating menus, dropdowns, and nested tree structures.
---

# Keyboard Navigation

Predictable keyboard navigation is a core requirement for accessible floating surfaces like menus, listboxes, comboboxes, and submenus.

In VFloat, keyboard navigation is split into a clean separation of concerns:

1. **[`useRovingFocus`](/api/use-roving-focus)** moves physical DOM focus between items in standalone composite widgets (menus, tabs, toolbars). Focus lands on the item itself with a single tab stop.
2. **[`useAriaActivedescendant`](/api/use-aria-activedescendant)** drives virtual focus for text-input widgets (comboboxes, autocompletes). DOM focus stays pinned on the `<input>` while `aria-activedescendant` highlights the active option.
3. **[`useTypeahead`](/api/use-typeahead)** handles character-based search and jumping, buffering keystrokes and cycling through matching items. Forward matches into either focus model through `onMatch`.
4. **[`useRole`](/api/use-role)** is a semantic synchronizer. It applies standard ARIA roles and popup states such as `aria-expanded` and `aria-controls`; focus-specific states such as `tabindex` and `aria-activedescendant` stay in your render layer.

## Keyboard navigation strategy

We separate keyboard navigation into two distinct patterns based on whether the component requires continuous text input:

- **Virtual Focus (`aria-activedescendant`)**: Used exclusively for text-input-driven components (such as Comboboxes, Autocompletes, Searchable Selects). Physical DOM focus remains locked on the `<input>` to preserve the text cursor, IME composition, and mobile software keyboards, while virtual focus navigates suggestions.
- **Physical Roving Focus (Roving Tabindex)**: Used for all standalone composite widgets (such as Menus, Tabs, Toolbars, Trees, and non-searchable Listboxes). Physical DOM focus moves directly to each item, providing native `:focus-visible` styling, built-in scroll alignment, and robust screen reader support.

---

## DOM focus model for menus and action lists

In this model, focus actually shifts into the floating list, and arrow keys move physical DOM focus between list items using a roving `tabindex`. Only the active item is focusable (`tabindex="0"`), while the rest are ignored (`tabindex="-1"`).

### Composable setup

```vue
<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { useFloatingNode, usePosition, useRovingFocus, useRole } from "v-float";

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
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context);

// 1. Move physical DOM focus across items
const { activeIndex, getTabindex } = useRovingFocus(context, {
  elementsList: itemEls,
  orientation: "vertical",
  loop: true,
});

// 2. Keep ARIA roles synchronized
useRole(context, {
  role: "menu",
  listRef: itemEls,
  disabledIndices: (idx) => !!items.value[idx]?.disabled,
});
</script>
```

### Template

Render item elements with roving `tabindex` from `getTabindex` and bind dynamic active classes:

```vue
<template>
  <button ref="anchorEl" type="button" @click="context.setOpen(!context.open.value)">
    Menu Options
  </button>

  <ul v-if="context.open.value" ref="floatingEl" role="menu" :style="styles">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      :ref="(el) => (itemEls[index] = el as HTMLElement | null)"
      role="menuitem"
      :aria-disabled="item.disabled"
      :tabindex="getTabindex(index)"
      :class="{ active: activeIndex === index }"
    >
      {{ item.label }}
    </li>
  </ul>
</template>
```

---

## Virtual focus model for comboboxes and inputs

In this model, DOM focus stays inside a text input or combobox container, allowing the user to keep typing. Arrow keys move a "virtual focus" selection, communicating the active choice to screen readers using `aria-activedescendant`.

### Composable setup

```vue
<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import {
  useAriaActivedescendant,
  useDismiss,
  useFloatingNode,
  usePosition,
  useRole,
} from "v-float";

interface SearchOption {
  value: string;
  label: string;
}

const options = ref<SearchOption[]>([
  { value: "vue", label: "Vue.js" },
  { value: "react", label: "React" },
  { value: "svelte", label: "Svelte" },
]);

const query = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

// The input element itself acts as the positioning anchor
const context = useFloatingNode({
  anchorEl: inputEl,
  floatingEl,
  open: isOpen,
});

const { styles } = usePosition(context, {
  placement: "bottom-start",
  middlewares: {
    offset: 4,
    matchWidth: true,
  },
});

useDismiss(context);

const filteredOptions = computed(() =>
  options.value.filter((o) => o.label.toLowerCase().includes(query.value.toLowerCase())),
);

const { activeIndex, getTargetProps, getItemProps } = useAriaActivedescendant({
  targetEl: inputEl,
  elementsList: itemEls,
  onSelect: (index) => {
    query.value = filteredOptions.value[index]!.label;
    context.setOpen(false);
  },
});

useRole(context, {
  role: "listbox",
  listRef: itemEls,
});
</script>
```

### Template

Spread `getTargetProps()` on the input trigger and `getItemProps(index)` on each option:

```vue
<template>
  <input
    ref="inputEl"
    v-model="query"
    type="text"
    role="combobox"
    aria-autocomplete="list"
    :aria-expanded="context.open.value"
    v-bind="getTargetProps()"
    @focus="context.setOpen(true)"
  />

  <ul v-if="context.open.value" ref="floatingEl" role="listbox" :style="styles">
    <li
      v-for="(item, index) in filteredOptions"
      :key="item.value"
      :ref="(el) => (itemEls[index] = el as HTMLElement | null)"
      role="option"
      v-bind="getItemProps(index)"
      :aria-selected="activeIndex === index"
      :class="{ active: activeIndex === index }"
    >
      {{ item.label }}
    </li>
  </ul>
</template>
```

---

## Keyboard interactions resolved

Here are the key events handled automatically by the focus models:

| Key          | Orientation         | Action                                                                                                                     |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ArrowDown`  | `"vertical"`        | Moves to the next enabled item.                                                                                            |
| `ArrowUp`    | `"vertical"`        | Moves to the previous enabled item.                                                                                        |
| `ArrowRight` | `"horizontal"`      | Moves to the next enabled item (or previous in RTL).                                                                       |
| `ArrowLeft`  | `"horizontal"`      | Moves to the previous enabled item (or next in RTL).                                                                       |
| `ArrowRight` | `"vertical"` (Menu) | Fires `onEnter`; submenu triggers use this to open the child floating node and focus its first item.                       |
| `ArrowLeft`  | `"vertical"` (Menu) | Fires `onExit`; submenu panels use this to close the child floating node and return focus to the parent trigger.           |
| `Home`       | Any                 | Moves to the first enabled item.                                                                                           |
| `End`        | Any                 | Moves to the last enabled item.                                                                                            |
| `PageUp`     | Any (virtual)       | Moves up by `pageSize` (default `10`) in `useAriaActivedescendant`.                                                        |
| `PageDown`   | Any (virtual)       | Moves down by `pageSize` (default `10`) in `useAriaActivedescendant`.                                                      |
| `Tab`        | Any                 | Passes through to document flow. In non-modal [`useFocusTrap`](/api/use-focus-trap) surfaces, `closeOnTab` closes on exit. |

---

## Where to go next

- Learn how to build multi-level menus in [Build Nested Menus](/guide/build-nested-menus).
- Read the [useRovingFocus API](/api/use-roving-focus) reference.
- Read the [useAriaActivedescendant API](/api/use-aria-activedescendant) reference.
- Read the [useTypeahead API](/api/use-typeahead) reference.
