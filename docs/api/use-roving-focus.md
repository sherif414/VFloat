---
description: Manages physical DOM focus across an ordered list using roving tabindex.
---

# useRovingFocus

`useRovingFocus` implements the WAI-ARIA roving `tabindex` pattern. It manages physical DOM focus across an item list, assigning `tabindex="0"` to the active item and `tabindex="-1"` to all others. Arrow keys shift DOM focus directly to adjacent items.

Use `useRovingFocus` for menus, toolbars, radio groups, and tab panels where moving focus directly onto items is desired.

## Type

```ts
function useRovingFocus(
  context: UseRovingFocusContext,
  options?: UseRovingFocusOptions,
): UseRovingFocusReturn;

interface UseRovingFocusContext {
  elementsList: Ref<Array<HTMLElement | null>>;
  anchorEl?: Ref<HTMLElement | null>;
}

type RovingOrientation = "horizontal" | "vertical" | "both";
type RovingDirection = "ltr" | "rtl";
type RovingEntryFocusMode = "first" | "active" | "none";

interface UseRovingFocusOptions {
  orientation?: MaybeRefOrGetter<RovingOrientation>;
  loop?: MaybeRefOrGetter<boolean>;
  direction?: MaybeRefOrGetter<RovingDirection>;
  gridColumns?: MaybeRefOrGetter<number>;
  defaultIndex?: MaybeRefOrGetter<number>;
  preventScroll?: MaybeRefOrGetter<boolean>;
  focusFirstOnMount?: MaybeRefOrGetter<boolean>;
  activeElementOnExit?: MaybeRefOrGetter<RovingEntryFocusMode>;
}

interface UseRovingFocusReturn {
  activeIndex: Readonly<Ref<number>>;
  getTabindex: (index: number) => 0 | -1;
  handleKeydown: (event: KeyboardEvent) => void;
  focusItem: (index: number) => void;
  first: () => void;
  last: () => void;
  next: () => void;
  prev: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `orientation` | `MaybeRefOrGetter<RovingOrientation>` | `"vertical"` | Direction of navigation (`"vertical"`, `"horizontal"`, or `"both"`). |
| `loop` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, arrow keys wrap around at start and end boundaries. |
| `direction` | `MaybeRefOrGetter<RovingDirection>` | `"ltr"` | Text direction for horizontal navigation (`"ltr"` or `"rtl"`). |
| `gridColumns` | `MaybeRefOrGetter<number>` | `1` | Column count when `orientation: "both"` is used for 2D grids. |
| `defaultIndex` | `MaybeRefOrGetter<number>` | `0` | Initial active index when no item has focus yet. |
| `preventScroll` | `MaybeRefOrGetter<boolean>` | `false` | Passes `{ preventScroll: true }` when calling `.focus()`. |
| `focusFirstOnMount` | `MaybeRefOrGetter<boolean>` | `false` | Automatically moves DOM focus to the active item on mount. |
| `activeElementOnExit` | `MaybeRefOrGetter<RovingEntryFocusMode>` | `"active"` | Focus target when re-entering the container (`"first"`, `"active"`, `"none"`). |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activeIndex` | `Readonly<Ref<number>>` | Index of the currently active item holding `tabindex="0"`. |
| `getTabindex` | `(index: number) => 0 \| -1` | Helper returning `0` if `index === activeIndex`, otherwise `-1`. Bind to `:tabindex`. |
| `handleKeydown` | `(event: KeyboardEvent) => void` | Event listener handling Arrow keys, Home, End, and PageUp/PageDown. |
| `focusItem` | `(index: number) => void` | Sets `activeIndex` and calls `.focus()` on the corresponding DOM element. |
| `first` / `last` | `() => void` | Focuses the first or last enabled item. |
| `next` / `prev` | `() => void` | Focuses the next or previous enabled item. |

## Details

### The Roving Tabindex Pattern

The roving `tabindex` contract requires:

1. Only one item in the group has `tabindex="0"`. All other items have `tabindex="-1"`.
2. When the user tabs into the container, the active item receives focus.
3. Arrow keys move focus across items, updating `tabindex` dynamically.
4. Pressing Tab again moves focus out of the entire widget to the next page element.

Disabled DOM elements (having `disabled` or `aria-disabled="true"`) are skipped automatically.

### 2D Grid Navigation

When navigating a grid or swatch picker:

- Set `orientation: "both"` and `gridColumns: 4`.
- Arrow Left / Right navigate along columns.
- Arrow Up / Down jump by `gridColumns` to navigate rows.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useRovingFocus } from "v-float";

const items = ["Profile", "Account Settings", "Billing", "Logout"];
const elementsList = ref<Array<HTMLElement | null>>([]);

const { activeIndex, getTabindex, handleKeydown, focusItem } = useRovingFocus(
  { elementsList },
  { orientation: "vertical", loop: true },
);
</script>

<template>
  <div role="menu" class="menu" @keydown="handleKeydown">
    <button
      v-for="(item, idx) in items"
      :key="item"
      :ref="(el) => (elementsList[idx] = el as HTMLElement | null)"
      role="menuitem"
      :tabindex="getTabindex(idx)"
      :class="{ focused: activeIndex === idx }"
      @click="focusItem(idx)"
    >
      {{ item }}
    </button>
  </div>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 200px;
}
button {
  padding: 8px 12px;
  text-align: left;
}
button.focused {
  background: #eef2ff;
}
</style>
```

## See Also

- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual focus alternative for comboboxes
- [`useTypeahead`](/api/use-typeahead) - Add character jumping to roving focus
- [`useRole`](/api/use-role) - Apply menu/menubar semantics
- [Keyboard Navigation](/guide/keyboard-navigation) - In-depth guide to focus models
- [Focus Models](/guide/focus-models) - Comparing roving tabindex vs active descendant
