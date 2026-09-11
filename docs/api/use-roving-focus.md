---
description: Manages physical DOM focus across an ordered list using roving tabindex.
---

# useRovingFocus

`useRovingFocus` implements the WAI-ARIA roving `tabindex` pattern. It manages physical DOM focus across an item list, assigning `tabindex="0"` to the active item and `tabindex="-1"` to all others. Arrow keys, Home, End, and PageUp/PageDown shift DOM focus directly to target items.

Implements the [`NavigationTarget`](/api/types#navigationtarget) protocol for seamless integration with auxiliary composables like [`useTypeahead`](/api/use-typeahead).

## Type

```ts
function useRovingFocus(
  context: UseRovingFocusContext,
  options: UseRovingFocusOptions,
): UseRovingFocusReturn;

interface UseRovingFocusContext extends Pick<FloatingNode, "id" | "refs" | "open"> {}

type RovingEntryFocusMode = "entry-index" | "last-focused";

interface UseRovingFocusOptions {
  elementsList: MaybeRefOrGetter<Array<HTMLElement | null>>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  activeIndex?: Ref<number>;
  entryIndex?: MaybeRefOrGetter<number | null | undefined>;
  entryFocusMode?: MaybeRefOrGetter<RovingEntryFocusMode>;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  loop?: MaybeRefOrGetter<boolean>;
  pageSize?: MaybeRefOrGetter<number>;
  rtl?: MaybeRefOrGetter<boolean>;
  enabled?: MaybeRefOrGetter<boolean>;
  scrollIntoView?: MaybeRefOrGetter<boolean>;
  focusOnHover?: MaybeRefOrGetter<boolean>;
  focusDisabledElements?: MaybeRefOrGetter<boolean>;
  isItemDisabled?: (index: number) => boolean;
  onSelect?: (index: number, event: Event) => void;
  onActiveIndexChange?: (index: number) => void;
  onEnter?: (index: number, event: KeyboardEvent) => void;
  onExit?: (index: number, event: KeyboardEvent) => void;
  isKeyHandled?: (event: KeyboardEvent) => boolean;
}

interface UseRovingFocusReturn extends NavigationTarget {
  readonly activeIndex: Readonly<Ref<number>>;
  tabStopIndex: ComputedRef<number>;
  setActiveIndex: (index: number) => void;
  clearActive: () => void;
  reset: () => void;
  focusIndex: (target: NavigationTargetValue, options?: NavigationTargetOptions) => void;
  getTabindex: (index: number) => 0 | -1;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `elementsList` | `MaybeRefOrGetter<Array<HTMLElement \| null>>` | **Required** | The list of HTML element references representing navigable elements. |
| `containerEl` | `MaybeRefOrGetter<HTMLElement \| null>` | `context.refs.floatingEl` | Container receiving keyboard and pointer events and used for RTL detection. |
| `activeIndex` | `Ref<number>` | `undefined` | Controlled active index ref. |
| `entryIndex` | `MaybeRefOrGetter<number \| null \| undefined>` | `0` | Default entry item holding `tabindex="0"` when idle. Set `-1` for menus. |
| `entryFocusMode` | `MaybeRefOrGetter<RovingEntryFocusMode>` | `"entry-index"` | Whether re-entry restores `"entry-index"` or `"last-focused"`. |
| `orientation` | `MaybeRefOrGetter<"vertical" \| "horizontal" \| "both">` | `"vertical"` | Direction of navigation. |
| `loop` | `MaybeRefOrGetter<boolean>` | `false` | When `true`, navigation wraps around at boundaries. |
| `pageSize` | `MaybeRefOrGetter<number>` | `10` | Number of items jumped on `PageUp` and `PageDown`. |
| `rtl` | `MaybeRefOrGetter<boolean>` | Auto-detected | Whether layout follows Right-to-Left reading order. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When `false`, keyboard listeners are inactive. |
| `scrollIntoView` | `MaybeRefOrGetter<boolean>` | `true` | Whether focused elements are automatically scrolled into view. |
| `focusOnHover` | `MaybeRefOrGetter<boolean>` | `false` | When `true`, moving the pointer over an item focuses it. |
| `focusDisabledElements` | `MaybeRefOrGetter<boolean>` | `false` | Allows disabled items to receive focus for APG discoverability. |
| `isItemDisabled` | `(index: number) => boolean` | Auto-detected | Custom predicate for disabled state. |
| `onSelect` | `(index: number, event: Event) => void` | `undefined` | Callback fired on Enter or Space. |
| `onActiveIndexChange` | `(index: number) => void` | `undefined` | Callback fired when active item index changes. |
| `onEnter` | `(index: number, event: KeyboardEvent) => void` | `undefined` | Callback fired on ArrowRight (LTR) / ArrowLeft (RTL) for submenu opening. |
| `onExit` | `(index: number, event: KeyboardEvent) => void` | `undefined` | Callback fired on ArrowLeft (LTR) / ArrowRight (RTL) for submenu closing. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activeIndex` | `Readonly<Ref<number>>` | Index of the currently focused item (-1 when unfocused / idle). |
| `tabStopIndex` | `ComputedRef<number>` | Index of the element that currently holds `tabindex="0"`. |
| `focusIndex` | `(target: NavigationTargetValue, options?: NavigationTargetOptions) => void` | Polymorphic navigation method. Accepts an index, `"reset"`, or directional keywords (`"next"`, `"prev"`, `"first"`, `"last"`, `"page-up"`, `"page-down"`). |
| `setActiveIndex` | `(index: number) => void` | Sets active index without focusing the DOM element. |
| `clearActive` | `() => void` | Clears active focus state. |
| `reset` | `() => void` | Resets activeIndex and focus history back to initial conditions. |
| `getTabindex` | `(index: number) => 0 \| -1` | Returns `0` if `index === tabStopIndex`, otherwise `-1`. Bind to `:tabindex`. |

## Example

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { useFloatingNode, useRovingFocus } from "v-float";

const items = ["Profile", "Account Settings", "Billing", "Logout"];
const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const elementsList = shallowRef<Array<HTMLElement | null>>([]);

const context = useFloatingNode({ anchorEl, floatingEl });

const { activeIndex, getTabindex, focusIndex } = useRovingFocus(context, {
  elementsList,
  orientation: "vertical",
  loop: true,
});
</script>

<template>
  <button ref="anchorEl" type="button" @click="context.setOpen(!context.open.value)">
    Options
  </button>

  <div
    v-if="context.open.value"
    ref="floatingEl"
    role="menu"
    class="menu"
  >
    <button
      v-for="(item, idx) in items"
      :key="item"
      :ref="(el) => (elementsList[idx] = el as HTMLElement | null)"
      role="menuitem"
      :tabindex="getTabindex(idx)"
      :class="{ focused: activeIndex === idx }"
      @click="focusIndex(idx)"
    >
      {{ item }}
    </button>
  </div>
</template>
```

## See Also

- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual focus alternative for comboboxes and autocompletes
- [`useTypeahead`](/api/use-typeahead) - Typeahead search that coordinates with roving focus
- [`useRole`](/api/use-role) - Apply menu/listbox/tab semantics
- [Keyboard Navigation](/guide/keyboard-navigation) - Comprehensive guide to focus models
