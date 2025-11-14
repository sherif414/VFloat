# useListNavigation

Adds arrow key-based navigation for a list/grid of items inside a floating element, with optional virtual focus (aria-activedescendant), RTL, nested close behavior, and looping.

## Signature

```ts
function useListNavigation(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseListNavigationOptions
): UseListNavigationReturn
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Context from `useFloating` or a tree node for nested menus |
| options | `UseListNavigationOptions` | Yes | Configuration options (see below) |

## Options

```ts
interface UseListNavigationOptions {
  listRef: Ref<Array<HTMLElement | null>>
  activeIndex?: MaybeRefOrGetter<number | null>
  onNavigate?: (index: number | null) => void
  enabled?: MaybeRefOrGetter<boolean>
  loop?: MaybeRefOrGetter<boolean>
  orientation?: MaybeRefOrGetter<'vertical' | 'horizontal' | 'both'>
  disabledIndices?: Array<number> | ((index: number) => boolean)
  focusItemOnHover?: MaybeRefOrGetter<boolean>
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>
  scrollItemIntoView?: boolean | ScrollIntoViewOptions
  selectedIndex?: MaybeRefOrGetter<number | null>
  focusItemOnOpen?: MaybeRefOrGetter<boolean | 'auto'>
  nested?: MaybeRefOrGetter<boolean>
  parentOrientation?: MaybeRefOrGetter<'vertical' | 'horizontal' | 'both'>
  rtl?: MaybeRefOrGetter<boolean>
  virtual?: MaybeRefOrGetter<boolean>
  virtualItemRef?: Ref<HTMLElement | null>
  cols?: MaybeRefOrGetter<number>
  itemSizes?: { width: number; height: number }[]
  dense?: MaybeRefOrGetter<boolean>
  allowEscape?: MaybeRefOrGetter<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| listRef | `Ref<HTMLElement[] | (HTMLElement\|null)[]>` | — | Items in DOM order. Keep indexes stable with your render. |
| activeIndex | `MaybeRefOrGetter<number\|null>` | `null` | Current active/highlighted item index. |
| onNavigate | `(index: number\|null) => void` | — | Called on navigation changes. You should update `activeIndex`. |
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable all listeners. |
| loop | `MaybeRefOrGetter<boolean>` | `false` | Wrap at boundaries. With `virtual` + `allowEscape` it can deselect. |
| orientation | `MaybeRefOrGetter<'vertical'|'horizontal'|'both'>` | `'vertical'` | Main navigation axis. |
| disabledIndices | `number[] \| (index:number)=>boolean` | `undefined` | Skip these indices when navigating. |
| focusItemOnHover | `MaybeRefOrGetter<boolean>` | `true` | Hovering an item sets it active. |
| openOnArrowKeyDown | `MaybeRefOrGetter<boolean>` | `true` | Arrow on anchor opens floating and activates an item. |
| scrollItemIntoView | `boolean \| ScrollIntoViewOptions` | `true` | Scroll active item into view (nearest by default); suppressed during pointer modality. |
| selectedIndex | `MaybeRefOrGetter<number\|null>` | `null` | Preferred item to activate on open if provided. |
| focusItemOnOpen | `MaybeRefOrGetter<boolean|'auto'>` | `'auto'` | Auto-focus item on open (first/last based on arrow direction) or selected. |
| nested | `MaybeRefOrGetter<boolean>` | `false` | Enables cross-axis close to return focus to parent anchor. |
| parentOrientation | `MaybeRefOrGetter<'vertical'|'horizontal'|'both'>` | `undefined` | Reserved for advanced nested semantics. Not currently used. |
| rtl | `MaybeRefOrGetter<boolean>` | `false` | Flips Left/Right behavior for horizontal/both orientations. |
| virtual | `MaybeRefOrGetter<boolean>` | `false` | Keep DOM focus on anchor and manage active with `aria-activedescendant`. |
| virtualItemRef | `Ref<HTMLElement|null>` | — | Populated with the virtually focused item element when `virtual` is enabled. |
| cols | `MaybeRefOrGetter<number>` | `1` | Grid columns when `> 1`; ArrowUp/Down move by ±`cols` (uniform grid). |
| itemSizes | `{width:number;height:number}[]` | `undefined` | Reserved for non-uniform grids. Not currently used. |
| dense | `MaybeRefOrGetter<boolean>` | `false` | Reserved for non-uniform grids. Not currently used. |
| allowEscape | `MaybeRefOrGetter<boolean>` | `false` | With `virtual` and `loop`, navigating past ends yields `onNavigate(null)`. |

## Return Value

```ts
interface UseListNavigationReturn {
  cleanup: () => void
}
```

| Property | Type | Description |
|----------|------|-------------|
| cleanup | `() => void` | Removes internal event listeners.

## Examples

### Basic Menu Navigation

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
})
</script>

<template>
  <button ref="anchorEl">Open</button>
  <ul v-if="ctx.open.value" ref="floatingEl">
    <li v-for="(opt, i) in 5" :key="i" :ref="el => itemsRef.value[i] = el" tabindex="-1">
      Item {{ i + 1 }}
    </li>
  </ul>
</template>
```

### Virtual Listbox (aria-activedescendant)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useListNavigation } from 'v-float'

const anchorEl = ref<HTMLElement|null>(null)
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
  openOnArrowKeyDown: true,
})
</script>

<template>
  <input ref="anchorEl" role="combobox" :aria-expanded="ctx.open.value" />
  <ul v-if="ctx.open.value" ref="floatingEl" role="listbox">
    <li v-for="(opt, i) in 5" :key="i" :ref="el => itemsRef.value[i] = el" role="option">
      {{ i }}
    </li>
  </ul>
</template>
```

### Nested Submenu (cross-axis close)

```ts
import { useFloatingTree, useListNavigation } from 'v-float'
// ... create tree, add nodes
useListNavigation(childNode, { nested: true, orientation: 'horizontal' })
```

### Uniform Grid Navigation

```ts
useListNavigation(ctx, { listRef: itemsRef, activeIndex, onNavigate: i => activeIndex.value = i, cols: 4, orientation: 'both' })
```

## See Also

- [useFloating](/api/use-floating)
- [useFloatingTree](/api/use-floating-tree)
- [useClick](/api/use-click)
- [useFocus](/api/use-focus)
- [useEscapeKey](/api/use-escape-key)
