---
description: Moves between items with the keyboard.
---

# useListNavigation

`useListNavigation` adds arrow-key navigation for list, grid, and nested tree items inside a floating element.

## Type

```ts
function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn;

interface UseListNavigationOptions {
  listRef: Ref<Array<HTMLElement | null>>;
  activeIndex?: MaybeRefOrGetter<number | null>;
  onNavigate?: (index: number | null) => void;
  enabled?: MaybeRefOrGetter<boolean>;
  loop?: MaybeRefOrGetter<boolean>;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  disabledIndices?: Array<number> | ((index: number) => boolean);
  focusItemOnHover?: MaybeRefOrGetter<boolean>;
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;
  scrollItemIntoView?: boolean | ScrollIntoViewOptions;
  selectedIndex?: MaybeRefOrGetter<number | null>;
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">;
  nested?: MaybeRefOrGetter<boolean>;
  getChildNode?: (index: number) => FloatingTreeNode | null;
  openChildOnFocus?: MaybeRefOrGetter<boolean>;
  rtl?: MaybeRefOrGetter<boolean>;
  virtual?: MaybeRefOrGetter<boolean>;
  virtualItemRef?: Ref<HTMLElement | null>;
  cols?: MaybeRefOrGetter<number>;
  allowEscape?: MaybeRefOrGetter<boolean>;
  gridLoopDirection?: MaybeRefOrGetter<"row" | "next">;
}

interface UseListNavigationReturn {
  cleanup: () => void;
}
```

## Details

`useListNavigation` keeps the list order stable, moves focus or active descendant state, and can open a closed surface when the user presses an arrow key.

- `orientation` controls whether navigation is vertical, horizontal, or grid-based.
- `virtual: true` keeps DOM focus on the anchor and uses `aria-activedescendant`.
- `openOnArrowKeyDown` lets a closed list open from the keyboard.
- Keyboard and hover navigation both skip disabled items.
- `selectedIndex` only wins on open when that item exists and is not disabled.
- `focusItemOnOpen: "auto"` only moves focus for the current arrow-key open path.
- Grid navigation respects `rtl: true` for left/right movement too, including wrapped row movement.
- `getChildNode` and `openChildOnFocus` let arrow-key navigation open child branches when a list item owns a submenu node.
- `nested` can be set explicitly when you want nested key behavior without tree inference.
- `cleanup()` removes the registered listeners and watchers, clears `aria-activedescendant`, resets `virtualItemRef`, and clears tree-navigation bookkeeping.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useListNavigation } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const activeIndex = ref<number | null>(null);

const context = useFloating(anchorEl, floatingEl);

useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  orientation: "vertical",
  loop: true,
  focusItemOnOpen: "auto",
});
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value)">
    Open menu
  </button>

  <ul v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    <li
      v-for="item in 3"
      :key="item"
      :ref="(el) => (itemsRef[item - 1] = el as HTMLElement | null)"
      tabindex="-1"
    >
      Item {{ item }}
    </li>
  </ul>
</template>
```

## See Also

- [`useFloating`](/api/use-floating)
- [`useClick`](/api/use-click)
- [`useFocus`](/api/use-focus)
- [`useEscapeKey`](/api/use-escape-key)
- [`useFloatingTree`](/api/use-floating-tree)
- [`useFloatingTreeNode`](/api/use-floating-tree-node)
- [Keyboard Navigation](/guide/keyboard-navigation)
- [Build Nested Menus](/guide/build-nested-menus)
