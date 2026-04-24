---
description: Add keyboard navigation to floating menus and list-like surfaces.
---

# Keyboard Navigation

When a floating surface contains selectable items, keyboard support becomes part of the feature, not a nice extra. Menus, listboxes, combobox panels, and nested menus all depend on predictable item navigation.

VFloat handles that with [`useListNavigation`](/api/use-list-navigation).

This guide shows the two focus models you will run into most often.

## First Decide How Focus Should Move

Before you think about the options, decide what kind of focus model you want.

### DOM focus

Use real DOM focus when each item should actually receive focus. This is common for menus, action lists, and simple dropdowns.

### Virtual focus

Use virtual focus when the anchor should keep DOM focus while the active item changes underneath it. This is common for combobox-like panels and inputs that should keep accepting text.

## DOM Focus Example: Menu Navigation

This is the usual menu-style setup.

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
  onNavigate(index) {
    activeIndex.value = index;
  },
  loop: true,
  openOnArrowKeyDown: true,
  focusItemOnHover: true,
});
</script>
```

## Render The Items In DOM Order

The item refs must be stable and match DOM order.

```vue
<template>
  <button ref="anchorEl" type="button">Open menu</button>

  <ul v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    <li
      v-for="(item, index) in ['Edit', 'Duplicate', 'Archive']"
      :key="item"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      tabindex="-1"
    >
      {{ item }}
    </li>
  </ul>
</template>
```

The function ref inside `v-for` matters because `useListNavigation()` needs a live array of item elements so it can move predictably through the list.

## Virtual Focus Example: Combobox-Like Behavior

If the anchor is an input that should keep typing focus, use virtual focus instead.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useListNavigation } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const activeIndex = ref<number | null>(null);
const virtualItemRef = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate(index) {
    activeIndex.value = index;
  },
  virtual: true,
  virtualItemRef,
  focusItemOnOpen: "auto",
});
</script>
```

In virtual mode, the anchor keeps DOM focus. The active item is announced through `aria-activedescendant` instead of by moving real focus into the list.

## Render Virtual-Focus Items With Stable IDs

Virtual focus depends on stable item IDs.

```vue
<template>
  <input
    ref="anchorEl"
    role="combobox"
    :aria-expanded="context.state.open.value"
    :aria-activedescendant="virtualItemRef?.id"
  />

  <ul
    v-if="context.state.open.value"
    ref="floatingEl"
    role="listbox"
    :style="context.position.styles.value"
  >
    <li
      v-for="(item, index) in ['One', 'Two', 'Three']"
      :key="item"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      :id="`option-${index}`"
      role="option"
    >
      {{ item }}
    </li>
  </ul>
</template>
```

## A Few Options That Matter A Lot

These options shape behavior the most:

- `openOnArrowKeyDown`
- `focusItemOnOpen`
- `loop`
- `selectedIndex`
- `focusItemOnHover`
- `virtual`

## Where To Go Next

- Read [Build Nested Menus](/guide/build-nested-menus) if items can open child branches.
- Read [Focus Models](/guide/focus-models) if you want the deeper conceptual tradeoffs.
- Read [List Navigation Gotchas](/guide/list-navigation-gotchas) for the common failure modes.
