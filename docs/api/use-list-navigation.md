---
description: Coordinates keyboard-driven list navigation in VFloat.
---

# useListNavigation

`useListNavigation` handles arrow-key, Home, End, and Tab key navigation for lists, grids, and hierarchical trees (menus, submenus, listboxes, comboboxes). It coordinates closely with a reactive tree branch conforming to the `NavigableCollection` contract (such as the branches returned by [`useTree`](/api/use-tree)) to manage item activity without raw DOM query selectors or index tracking.

## Type

```ts
function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn;

interface NavigableCollection {
  /**
   * The currently active value in the collection.
   */
  activeValue: Ref<string | null>;
  /**
   * Set the active value directly.
   */
  setActiveValue: (value: string | null) => void;
  /**
   * Advance to the next focusable item.
   */
  setNext: (options?: { loop?: boolean }) => void;
  /**
   * Go back to the previous focusable item.
   */
  setPrevious: (options?: { loop?: boolean }) => void;
  /**
   * Go to the first focusable item.
   */
  setFirst: () => void;
  /**
   * Go to the last focusable item.
   */
  setLast: () => void;
  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled?: (value: string) => boolean;
}

interface UseListNavigationOptions {
  /**
   * The collection manager to navigate.
   */
  collection: NavigableCollection;

  /**
   * Whether navigation behavior is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * If true, arrow-key navigation wraps from end-to-start and vice-versa.
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Primary navigation orientation.
   * - "vertical": ArrowUp/Down to navigate; ArrowLeft/Right to collapse/expand branches (trees)
   * - "horizontal": ArrowLeft/Right to navigate
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal">;

  /**
   * If true, pressing an arrow key when closed opens the floating surface and activates the first/last item.
   * @default true
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;

  /**
   * Right-to-left layout flag affecting horizontal arrow semantics.
   * @default false
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * If true, pressing Tab closes the floating list/tree without preventing normal browser page focus movement.
   * @default true
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Callback triggered when a branch "enter" intent is detected from an enabled item.
   */
  onEnter?: (activeValue: string, e: KeyboardEvent) => void;

  /**
   * Callback triggered when a branch "exit" intent is detected from an enabled item.
   */
  onExit?: (activeValue: string, e: KeyboardEvent) => void;
}

interface UseListNavigationReturn {
  /**
   * Stops all event listeners and state watchers created by the composable.
   */
  cleanup: () => void;
}
```

## Details

`useListNavigation` separates keyboard coordination from active item management:

- **Collection Delegation:** Rather than managing DOM references, it registers listeners on the anchor and floating elements and maps key combinations to `collection.setNext()`, `collection.setFirst()`, `collection.setPrevious()`, etc.
- **Roving & Virtual Focus:** It is compatible with both roving tabindex DOM focus and virtual focus configurations. Simply sync `collection.activeValue` with your elements' focus or `aria-activedescendant` attribute.
- **Nested Branch Expansion (2D):** In vertical orientation, horizontal arrow keys signal enter/exit intent on branches. It relies on horizontal arrow detection to fire `onEnter` and `onExit` events. In a tree setup, these events are used to expand or collapse submenus, safely shifting the active value to children or returning it to the parent trigger.
- **RTL Semantics:** Horizontal arrow keys for list navigation and tree branch expansion automatically reverse their meaning when `rtl` is enabled.
- **Natural Tab Exit:** Pressing `Tab` closes the list tree to clean up references, but does not prevent natural browser focus movement.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useTree, useFloatingContext, usePosition, useListNavigation } from "v-float";

interface Option {
  value: string;
  label: string;
}

const options = ref<Option[]>([
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "mx", label: "Mexico" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext(anchorEl, floatingEl);

const tree = useTree({
  items: options,
  getItemId: (item) => item.value,
});

useListNavigation(context, {
  collection: tree.rootBranch,
  orientation: "vertical",
  loop: true,
});
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value)">
    Select Country
  </button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="listbox"
    :style="position.styles.value"
  >
    <div
      v-for="item in tree.flattenedItems.value"
      :key="item.value"
      role="option"
      :aria-selected="tree.activeValue.value === item.value"
      :class="{ active: tree.activeValue.value === item.value }"
      @click="tree.setActiveValue(item.value)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## See Also

- [`useTree`](/api/use-tree)
- [`useFloatingContext`](/api/use-floating-context)
- [`useRole`](/api/use-role)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
- [Build Nested Menus Guide](/guide/build-nested-menus)
