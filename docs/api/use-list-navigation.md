---
description: Coordinates keyboard-driven list navigation in VFloat.
---

# useListNavigation

`useListNavigation` handles arrow-key, Home, End, and Tab key navigation for lists and floating menus (menus, submenus, listboxes, comboboxes). It coordinates with any reactive collection that satisfies the `NavigableCollection` contract, such as [`useCollection`](/api/use-collection).

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
   * - "vertical": ArrowUp/Down to navigate; ArrowLeft/Right to collapse/expand submenus
   * - "horizontal": ArrowLeft/Right to navigate
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal">;

  /**
   * If true, pressing an arrow key when closed opens the floating surface and activates the first/last item.
   * @default context.isRoot (true for root contexts, false for nested submenus)
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;

  /**
   * Right-to-left layout flag affecting horizontal arrow semantics.
   * When omitted, direction is automatically inferred from the DOM context.
   * @default inferred from DOM context (false if LTR)
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * If true, pressing Tab closes the floating list without preventing normal browser page focus movement.
   * @default true
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Callback triggered when an item is activated with Enter or Space.
   */
  onActivate?: (activeValue: string, e: KeyboardEvent) => void;

  /**
   * Callback triggered when a branch "enter" intent is detected from an enabled item (e.g. ArrowRight in LTR).
   */
  onEnter?: (activeValue: string, e: KeyboardEvent) => void;

  /**
   * Callback triggered when a branch "exit" intent is detected from an enabled item (e.g. ArrowLeft in LTR).
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

- **Hierarchy-Aware Smart Defaults:** When attached to a top-level context (`context.isRoot === true`), `openOnArrowKeyDown` defaults to `true` (opening the menu on `ArrowDown`/`ArrowUp`). When attached to a nested child context (`context.isRoot === false`), it automatically defaults to `false` so navigating the parent menu does not inadvertently trigger the submenu.
- **Collection Delegation:** Rather than managing DOM references, it registers listeners on the anchor and floating elements and maps key combinations to `collection.setNext()`, `collection.setFirst()`, `collection.setPrevious()`, etc.
- **Roving & Virtual Focus:** It is compatible with both roving tabindex DOM focus and virtual focus configurations. Simply sync `collection.activeValue` with your elements' focus or `aria-activedescendant` attribute.
- **Nested Submenu Expansion & Collapse (2D):** In vertical orientation, horizontal arrow keys signal enter/exit intent on items with submenus. It fires `onEnter` (e.g., `ArrowRight`) to open a child submenu. On `exit` (e.g., `ArrowLeft`), it runs custom `onExit` if provided, or automatically closes the child context and restores DOM focus to `anchorEl` when `!context.isRoot`.
- **Automatic RTL Semantics:** Horizontal arrow keys for list navigation and submenu expansion automatically reverse their meaning in RTL layouts. Direction is inferred automatically from the nearest `[dir]` DOM ancestor (or `document.documentElement`), or can be overridden explicitly with the `rtl` option.
- **Natural Tab Exit:** Pressing `Tab` closes the list to clean up references, but does not prevent natural browser focus movement.

## Example

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useCollection, useFloatingContext, usePosition, useListNavigation } from "v-float";

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

const context = useFloatingContext({ anchorEl, floatingEl });
const { styles } = usePosition(context);

const values = computed(() => options.value.map((item) => item.value));
const collection = useCollection({ values });

useListNavigation(context, {
  collection,
  orientation: "vertical",
  loop: true,
});
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value)">
    Select Country
  </button>

  <div v-if="context.state.open.value" ref="floatingEl" role="listbox" :style="styles">
    <div
      v-for="item in options"
      :key="item.value"
      role="option"
      :aria-selected="collection.activeValue.value === item.value"
      :class="{ active: collection.activeValue.value === item.value }"
      @click="collection.setActiveValue(item.value)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## See Also

- [`useCollection`](/api/use-collection)
- [`useFloatingContext`](/api/use-floating-context)
- [`useRole`](/api/use-role)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
- [Build Nested Menus Guide](/guide/build-nested-menus)
