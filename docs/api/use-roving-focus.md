---
description: Moves physical DOM focus between items with roving tabindex.
---

# useRovingFocus

`useRovingFocus` moves physical DOM focus between items in a composite widget such as a menu, tab list, or toolbar. Focus lands on the item element itself, with a single tab stop owned by the widget.

## Type

```ts
function useRovingFocus(
  node: UseRovingFocusContext,
  options: UseRovingFocusOptions,
): UseRovingFocusReturn;

interface UseRovingFocusContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

type RovingEntryFocusMode = "last-focused" | "entry-index";

interface UseRovingFocusOptions {
  elementsList: Readonly<Ref<(HTMLElement | null)[]>>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  activeIndex?: Ref<number>;
  entryIndex?: MaybeRefOrGetter<number | null | undefined>;
  entryFocusMode?: RovingEntryFocusMode;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  loop?: MaybeRefOrGetter<boolean>;
  rtl?: MaybeRefOrGetter<boolean>;
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;
  focusOnHover?: MaybeRefOrGetter<boolean>;
  focusDisabledElements?: MaybeRefOrGetter<boolean>;
  onSelect?: (index: number, event: KeyboardEvent) => void;
  onEnter?: (index: number, event: KeyboardEvent) => boolean | void;
  onExit?: (index: number, event: KeyboardEvent) => boolean | void;
  onActiveIndexChange?: (index: number) => void;
}

interface UseRovingFocusReturn {
  activeIndex: Readonly<Ref<number>>;
  tabStopIndex: Readonly<Ref<number>>;
  setActiveIndex: (index: number) => void;
  reset: () => void;
  focusIndex: (index: number, options?: { preventScroll?: boolean }) => void;
  getTabindex: (index: number) => 0 | -1;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
}
```

## Details

- `elementsList` is required: bind a template ref array in `v-for` and pass it in. `containerEl` defaults to the node's floating element and owns the keyboard, focus, and pointer listeners.
- `orientation` defaults to `"vertical"`. `"both"` makes all four arrows navigate sequentially; otherwise the off-axis arrows enter submenus or exit back. Horizontal navigation inverts automatically in RTL layouts unless `rtl` overrides it.
- `loop` defaults to `false`; edges stop instead of wrapping.
- Disabled items (`disabled` attribute or `aria-disabled="true"`) are skipped unless `focusDisabledElements` is `true`. Selection callbacks never fire on truly disabled items either way.
- The composable never writes `tabindex` itself. Bind `:tabindex="getTabindex(index)"` in your template; `tabStopIndex` tells you which item owns the single tab stop.
- `entryIndex` chooses the entry tab stop (`-1` means none, `null`/`undefined` falls back to the first enabled item). `entryFocusMode` defaults to `"last-focused"` (reopen where focus left off); `"entry-index"` always resets to `entryIndex`.
- `tree` makes navigation family-aware across nested surfaces: moving to another index closes open descendants, and submenu entry/exit coordinate through the tree. Without it, only the node's own anchor and floating elements count as inside.
- `focusOnHover` (default `false`) moves focus to the hovered item.
- `onSelect` fires on Enter, Space, or click for a non-disabled item. `onEnter`/`onExit` intercept submenu entry and exit; returning `false` lets the event bubble. Without `onExit`, exiting collapses the node with the `"keyboard-exit"` reason and refocuses the anchor.
- `activeIndex` starts at `-1` and clears to `-1` on close, focus-out, and `reset()`. Pass an `activeIndex` ref to control it, and observe changes through `onActiveIndexChange`.
- Typeahead search is not built in. Pair with [`useTypeahead`](/api/use-typeahead) and forward `onMatch: (index) => setActiveIndex(index)`.

## Example

This menu moves DOM focus across its items with a single tab stop.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { useFloatingNode, useRovingFocus } from "v-float";

const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

const items = ["Edit", "Duplicate", "Archive"];

const node = useFloatingNode({ anchorEl, floatingEl });
const { activeIndex, getTabindex } = useRovingFocus(node, {
  elementsList: itemEls,
  loop: true,
});
</script>

<template>
  <button ref="anchorEl" type="button">Actions</button>

  <div v-if="node.open" ref="floatingEl" role="menu">
    <button
      v-for="(item, index) in items"
      :key="item"
      :ref="(el) => (itemEls[index] = el as HTMLElement | null)"
      type="button"
      role="menuitem"
      :tabindex="getTabindex(index)"
      :class="{ active: activeIndex === index }"
    >
      {{ item }}
    </button>
  </div>
</template>
```

## See Also

- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual focus for text-input-driven widgets
- [`useCollection`](/api/use-collection) - Headless string-value model
- [`useTypeahead`](/api/use-typeahead) - Type-to-focus search that drives `setActiveIndex`
- [useFloatingTree](/api/use-floating-tree) - Submenu coordination
- [Keyboard Navigation](/guide/keyboard-navigation)
