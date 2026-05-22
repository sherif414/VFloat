---
description: Coordinates keyboard-driven list navigation in VFloat.
---

# useListNavigation

`useListNavigation` handles arrow-key, Home, End, and Tab key navigation for lists, grids, and hierarchical trees (menus, submenus, listboxes, comboboxes). It coordinates closely with a data-first [`useCollection`](/api/use-collection) state coordinator to manage item activity without raw DOM query selectors or index tracking.

## Type

```ts
function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn;

interface UseListNavigationOptions {
  /**
   * The reactive collection manager for list structure, active state, and traversal.
   */
  collection: UseCollectionReturn<any>;

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
   * - "both": Up/Down/Left/Right to navigate flat grids
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

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

- **Collection Delegation:** Rather than managing DOM references, it registers listeners on the anchor and floating elements and maps key combinations to `collection.setNext()`, `collection.setFirst()`, `collection.expandBranch()`, etc.
- **Roving & Virtual Focus:** It is compatible with both roving tabindex DOM focus and virtual focus configurations. Simply sync `collection.activeValue` with your elements' focus or `aria-activedescendant` attribute.
- **Nested Branch Expansion (2D):** In vertical orientation, horizontal arrow keys expand or collapse branches. It uses depth-first pre-order searches on the collection (`collection.getFirstEnabledDescendantValue`) to safely target the first enabled child. If all descendants are disabled, focus remains securely on the opener.
- **RTL Semantics:** Horizontal arrow keys for list navigation and tree branch expansion automatically reverse their meaning when `rtl` is enabled.
- **Natural Tab Exit:** Pressing `Tab` closes the list tree to clean up references, but does not prevent natural browser focus movement.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useCollection, useFloating, useListNavigation } from "v-float";

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

const context = useFloating(anchorEl, floatingEl);

const collection = useCollection({
  items: options,
  itemValue: (item) => item.value,
});

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

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="listbox"
    :style="context.position.styles.value"
  >
    <div
      v-for="item in collection.flattenedItems.value"
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
- [`useFloating`](/api/use-floating)
- [`useRole`](/api/use-role)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
- [Build Nested Menus Guide](/guide/build-nested-menus)
