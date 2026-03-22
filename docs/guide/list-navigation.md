# Keyboard List Navigation

Set up robust keyboard navigation for menus, listboxes, and grids using `useListNavigation`.

## The Basics

The `useListNavigation` composable adds arrow key support to navigate through a list of items. It manages an `activeIndex` and automatically focuses the corresponding item.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useListNavigation } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

// 1. Maintain an array of item refs and the active index
const itemsRef = ref<Array<HTMLElement | null>>([])
const activeIndex = ref<number | null>(null)

const context = useFloating(anchorEl, floatingEl)

// 2. Setup navigation
useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index
  },
  loop: true,
  openOnArrowKeyDown: true,
})
</script>

<template>
  <button ref="anchorEl">Open Menu</button>
  
  <ul v-if="context.open.value" ref="floatingEl" role="menu">
    <li
      v-for="(item, i) in 5"
      :key="i"
      :ref="el => itemsRef[i] = el as HTMLElement"
      role="menuitem"
      tabindex="-1"
    >
      Item {{ i + 1 }}
    </li>
  </ul>
</template>
```

::: tip
You must manually assign `itemsRef` using a function ref in the `v-for` loop so VFloat knows which elements to focus.
:::

## Deep Dive

`useListNavigation` supports two main focus strategies depending on your use case: DOM focus and Virtual focus.

### DOM Focus (Roving Tabindex)

By default, `useListNavigation` moves real DOM focus to the active item via `element.focus()`. This is ideal for standard menus and dropdowns. Users tab to the menu, and then arrow keys move the browser's focus ring.

Make sure your items have `tabindex="-1"` so they are programmatically focusable but not part of the natural tab sequence.

### Virtual Focus (`aria-activedescendant`)

When building a combobox or autocomplete, you need the focus to stay on the text `<input>` so the user can keep typing, but you still want arrow keys to highlight items in the dropdown. 

Enable virtual focus by setting `virtual: true` and providing a `virtualItemRef`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useListNavigation } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null) // An input element
const floatingEl = ref<HTMLElement | null>(null)
const itemsRef = ref<Array<HTMLElement | null>>([])
const activeIndex = ref<number | null>(null)
const virtualItemRef = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)

useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index
  },
  virtual: true,
  virtualItemRef,
})
</script>

<template>
  <input ref="anchorEl" role="combobox" :aria-expanded="context.open.value" />
  
  <ul v-if="context.open.value" ref="floatingEl" role="listbox">
    <li
      v-for="(item, i) in 5"
      :key="i"
      :ref="el => itemsRef[i] = el as HTMLElement"
      :id="`option-${i}`"
      role="option"
    >
      Option {{ i }}
    </li>
  </ul>
</template>
```

::: warning
With virtual focus, the anchor element is responsible for setting the `aria-activedescendant` attribute to the `id` of the active item. `useListNavigation` will handle the internal tracking, but you must ensure each item has a stable `id`.
:::

## Further Reading

- [`useListNavigation` API](/api/use-list-navigation)
- [Interactions](/guide/interactions)
