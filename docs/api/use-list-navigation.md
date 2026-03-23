# useListNavigation

`useListNavigation` adds arrow-key navigation for list and grid items inside a floating element.

## Type

```ts
function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions
): UseListNavigationReturn

interface UseListNavigationOptions {
  listRef: Ref<Array<HTMLElement | null>>
  activeIndex?: MaybeRefOrGetter<number | null>
  onNavigate?: (index: number | null) => void
  enabled?: MaybeRefOrGetter<boolean>
  loop?: MaybeRefOrGetter<boolean>
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">
  disabledIndices?: Array<number> | ((index: number) => boolean)
  focusItemOnHover?: MaybeRefOrGetter<boolean>
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>
  scrollItemIntoView?: boolean | ScrollIntoViewOptions
  selectedIndex?: MaybeRefOrGetter<number | null>
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">
  nested?: MaybeRefOrGetter<boolean>
  parentOrientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">
  rtl?: MaybeRefOrGetter<boolean>
  virtual?: MaybeRefOrGetter<boolean>
  virtualItemRef?: Ref<HTMLElement | null>
  cols?: MaybeRefOrGetter<number>
  allowEscape?: MaybeRefOrGetter<boolean>
  gridLoopDirection?: MaybeRefOrGetter<"row" | "next">
}

interface UseListNavigationReturn {
  cleanup: () => void
}
```

## Details

`useListNavigation` keeps the list order stable, moves focus or active descendant state, and can open a closed surface when the user presses an arrow key.

- `orientation` controls whether navigation is vertical, horizontal, or grid-based.
- `virtual: true` keeps DOM focus on the anchor and uses `aria-activedescendant`.
- `openOnArrowKeyDown` lets a closed list open from the keyboard.
- `cleanup()` removes the registered listeners and watchers.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useListNavigation } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const itemsRef = ref<Array<HTMLElement | null>>([])
const activeIndex = ref<number | null>(null)

const context = useFloating(anchorEl, floatingEl)

useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index
  },
  orientation: "vertical",
  loop: true,
})
</script>

<template>
  <button ref="anchorEl" @click="context.setOpen(!context.open.value)">
    Open menu
  </button>

  <ul v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
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
- [Interactions](/guide/interactions)
