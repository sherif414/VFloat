# Keyboard List Navigation

Set up arrow key navigation for menus, listboxes, and grids using `useListNavigation`. Supports nested menus, RTL, virtual focus (`aria-activedescendant`), looping, and uniform grids.

- **Audience:** Intermediate
- **Prerequisites:** Vue 3.2+, Composition API, basic V-Float usage (`useFloating`)
- **Estimated time:** 10–15 minutes
- **Works with:** V-Float v0.x

## Learning Outcomes

- Implement roving active index for menus/listboxes with keyboard
- Open menus from the anchor using arrow keys
- Add nested submenu behavior and RTL support
- Use virtual focus for `aria-activedescendant` patterns
- Navigate uniform grids with ArrowUp/Down/Left/Right

## TL;DR (Quick Start)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useListNavigation } from 'v-float'

const anchorEl = ref<HTMLElement|null>(null)
const floatingEl = ref<HTMLElement|null>(null)
const itemsRef = ref<Array<HTMLElement|null>>([])
const activeIndex = ref<number|null>(null)

const ctx = useFloating(anchorEl, floatingEl)

useListNavigation(ctx, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (i) => (activeIndex.value = i),
  orientation: 'vertical',
  loop: true,
  openOnArrowKeyDown: true,
})
</script>

<template>
  <button ref="anchorEl">Menu</button>
  <ul v-if="ctx.open.value" ref="floatingEl" role="menu">
    <li v-for="(opt, i) in 5" :key="i" :ref="el => itemsRef.value[i] = el" role="menuitem" tabindex="-1">
      Item {{ i + 1 }}
    </li>
  </ul>
</template>
```

## Choosing a Focus Strategy

`useListNavigation` supports two accessibility patterns that serve different widget needs:

| Strategy | When to use | Key traits |
| --- | --- | --- |
| **DOM focus (roving tabindex)** | Default for menus, listboxes, navigation grids, or anytime each item should be a real focus target. | Moves actual DOM focus to each item via `element.focus()`, keeps browser focus rings and works reliably across assistive tech. Requires updating tabindex (`0` for active, `-1` for others). |
| **Virtual focus (`aria-activedescendant`)** | Use when the anchor (often an `<input>` or combobox trigger) must keep DOM focus so typing, caret position, or IME usage is uninterrupted. | Only the anchor is tabbable; keyboard events update `aria-activedescendant` to point at the active option. Each option needs a stable `id`, and focus rings stay on the anchor. |

Practical guidance:

1. Start with DOM focus for most floating menus and selects—users can Tab into the list and arrows move real focus between options.
2. Switch to virtual focus only when the anchor must stay focused (combobox/autocomplete, `contenteditable`, inputs with validation). Enable it with `virtual: true` (plus `virtualItemRef` if you need the active DOM node).
3. Document which pattern your component relies on so nested composables remain consistent (e.g., a combobox might mix virtual focus on the input with DOM focus inside submenus).

## Step-by-Step

### 1) Positioning and Refs

- Create `anchorEl` and `floatingEl` refs and initialize `useFloating`.
- Keep an array ref `itemsRef` for your item elements in DOM order.

### 2) Active Index State

- Manage `activeIndex: Ref<number|null>` in your component state.
- Pass `onNavigate` to update `activeIndex` on keyboard or hover changes.

```ts
const itemsRef = ref<Array<HTMLElement|null>>([])
const activeIndex = ref<number|null>(null)

useListNavigation(ctx, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (i) => (activeIndex.value = i),
})
```

### 3) Open on Arrow Keys

- Use `openOnArrowKeyDown: true` to open from the anchor when pressing an arrow key.
- Use `focusItemOnOpen: 'auto' | true` to automatically activate an item on open.

```ts
useListNavigation(ctx, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (i) => (activeIndex.value = i),
  openOnArrowKeyDown: true,
  focusItemOnOpen: 'auto',
})
```

### 4) Disabled, Looping, and Home/End

- Skip items via `disabledIndices: number[] | (i:number)=>boolean`.
- `loop: true` wraps at ends. With `virtual + allowEscape`, moving past ends yields `null`.
- `Home`/`End` jump to first/last enabled item.

### 5) Nested Submenus

- When using `useFloatingTree()`, pass a `TreeNode<FloatingContext>` to `useListNavigation`.
- Set `nested: true` to enable cross-axis close (e.g., ArrowLeft to close a right-opening submenu).

```ts
import { useFloatingTree } from 'v-float'

const tree = useFloatingTree()
const parentNode = tree.addNode(anchorEl, floatingEl)
const childNode = tree.addNode(childAnchor, childFloating, { parentId: parentNode?.id })

useListNavigation(parentNode, { listRef: parentItems, activeIndex, onNavigate: i => activeIndex.value = i, orientation: 'vertical' })
useListNavigation(childNode, { listRef: childItems, activeIndex: childActive, onNavigate: i => childActive.value = i, nested: true, orientation: 'horizontal' })
```

### 6) RTL and Grids

- `rtl: true` flips Left/Right semantics for horizontal navigation.
- For uniform grids, set `cols > 1` and `orientation: 'both' | 'horizontal'`.

```ts
useListNavigation(ctx, { listRef: itemsRef, activeIndex, onNavigate: i => activeIndex.value = i, cols: 4, orientation: 'both', rtl: true })
```

### 7) Virtual Focus (aria-activedescendant)

- Keep DOM focus on the anchor (e.g., `<input role="combobox">`) and control the active option via `aria-activedescendant`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useListNavigation } from 'v-float'

const anchorEl = ref<HTMLElement|null>(null) // e.g., input
const floatingEl = ref<HTMLElement|null>(null)
const itemsRef = ref<Array<HTMLElement|null>>([])
const activeIndex = ref<number|null>(null)
const virtItem = ref<HTMLElement|null>(null)

const ctx = useFloating(anchorEl, floatingEl)

useListNavigation(ctx, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (i) => (activeIndex.value = i),
  virtual: true,
  virtualItemRef: virtItem,
  focusItemOnOpen: 'auto',
})
</script>

<template>
  <input ref="anchorEl" role="combobox" :aria-expanded="ctx.open.value" />
  <ul v-if="ctx.open.value" ref="floatingEl" role="listbox">
    <li v-for="(opt, i) in 5" :key="i" :ref="el => itemsRef.value[i] = el" role="option">{{ i }}</li>
  </ul>
</template>
```

## Accessibility

- Use appropriate roles: `role="menu"`/`menuitem`, `role="listbox"`/`option`.
- With virtual focus, ensure each item has a stable `id` (generated if missing); anchor will set `aria-activedescendant`.
- Consider `aria-selected`/`aria-current` for selected vs. active state.

## Performance

- Scrolling is suppressed when pointer modality is active to avoid jank; use `focusItemOnOpen` to force initial scroll.
- Keep `listRef` in DOM order and avoid reindexing across renders.

## Troubleshooting

- Active item not scrolling: pass `scrollItemIntoView: true | options` and ensure not in pointer modality.
- Virtual focus not working: ensure anchor is focusable and items have `id`s.
- Nested close not triggering: set `nested: true` and ensure tree parent/child are wired via `useFloatingTree`.

## See Also

- [useListNavigation API](/api/use-list-navigation)
- [useFloating](/api/use-floating)
- [useFloatingTree](/api/use-floating-tree)
- [Interactions](/guide/interactions)
