# Keyboard List Navigation

`useListNavigation()` is for the parts of a floating UI where arrow keys should move through items instead of just opening and closing the surface. Menus, listboxes, combobox panels, and grid-like pickers all fit here.

The main decision is not about the composable itself. It is about the focus model you want to present to the user.

## DOM Focus For Menus

Use real DOM focus when each item should receive focus directly. That is the standard roving-tabindex pattern for menus and dropdowns.

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

<template>
  <button ref="anchorEl">Open menu</button>

  <ul v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    <li
      v-for="(item, i) in 5"
      :key="item"
      :ref="(el) => (itemsRef[i] = el as HTMLElement | null)"
      tabindex="-1"
    >
      Item {{ item }}
    </li>
  </ul>
</template>
```

The important part is the function ref inside the `v-for`. `useListNavigation()` needs a stable array of item refs so it can move focus in DOM order.

::: tip
If the list should open from the keyboard, keep `openOnArrowKeyDown: true`. That gives the user a smooth path from the trigger into the menu without an extra click.
:::

## Virtual Focus For Comboboxes

When the user needs to keep typing in an input while the panel highlights items, use virtual focus instead of moving DOM focus away from the input. This is the combobox pattern.

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

<template>
  <input
    ref="anchorEl"
    role="combobox"
    :aria-expanded="context.open.value"
    :aria-activedescendant="virtualItemRef?.id"
  />

  <ul v-if="context.open.value" ref="floatingEl" role="listbox">
    <li
      v-for="(item, i) in 5"
      :key="item"
      :ref="(el) => (itemsRef[i] = el as HTMLElement | null)"
      :id="`option-${i}`"
      role="option"
    >
      Option {{ item }}
    </li>
  </ul>
</template>
```

Virtual focus keeps the input active while the active option changes underneath it. That is why stable `id`s matter here: `aria-activedescendant` points at a specific item, not just a visual highlight.

::: warning
With virtual focus, the anchor element remains responsible for announcing the active option. Make sure each option has a stable `id`, or screen readers will not have a reliable target.
:::

## Grids And Nested Menus

`useListNavigation()` can also handle grid-style layouts and nested menus.

- Use `orientation: "both"` and `cols` when the items are arranged in a grid.
- Use `rtl: true` if horizontal navigation needs to respect right-to-left layouts.
- Use `nested: true` and `parentOrientation` when a submenu needs to close or move back to its parent.
- Use `allowEscape: true` when a virtual focus model should be able to return to the input or trigger instead of trapping the active item forever.

If the surface is visually complex, keep the mental model simple: decide whether arrows move linearly, move in a grid, or move back to a parent list. Once that is clear, the rest of the options are mostly fine-tuning.

## A Few Sharp Edges

- Put `tabindex="-1"` on DOM-focused items so they can receive programmatic focus without joining the tab order.
- Use `selectedIndex` when a chosen item should win over the default open target.
- Use `focusItemOnOpen: "auto"` when you want keyboard-opened lists to land on an item without forcing that behavior for every open path.
- Call `cleanup()` if you are managing the lifecycle outside of a normal component unmount.

## Further Reading

- [`useListNavigation` API](/api/use-list-navigation)
- [Interactions](/guide/interactions)
