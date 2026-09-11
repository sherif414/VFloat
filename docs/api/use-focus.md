---
description: Opens and closes floating content on keyboard focus.
---

# useFocus

`useFocus` opens and closes a floating node when the anchor gains or loses focus. By default, it activates only for keyboard focus (`:focus-visible`), preventing unwanted tooltips when clicking with a mouse.

## Type

```ts
function useFocus(node: UseFocusContext, options?: UseFocusOptions): UseFocusReturn;

interface UseFocusContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseFocusOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: FloatingTree | null | undefined;
  requireFocusVisible?: MaybeRefOrGetter<boolean>;
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
}

interface UseFocusReturn {
  cleanup: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Disabling removes all focus listeners. |
| `tree` | `FloatingTree \| null` | `undefined` | Tree context for family-aware focus checks in nested structures. |
| `requireFocusVisible` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, opens only for keyboard navigation, ignoring pointer clicks. |
| `ignoreFocusOut` | `(target: EventTarget \| null) => boolean` | `undefined` | Predicate to prevent closing when focus transitions to selected elements. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `cleanup` | `() => void` | Manually unregisters all focus listeners. Also executes on component unmount. |

## Details

### Focus Visible Heuristic

Most browsers set focus on a button when clicked with a mouse or tapped on mobile. If focus listeners opened a tooltip unconditionally, clicking a button would leave a sticky tooltip floating on screen.

With `requireFocusVisible: true` (the default), `useFocus` inspects the browser's `:focus-visible` pseudo-class. Tabbing into a button opens the tooltip; clicking the button does not.

### Deferred Blur and Focus Movement

When focus leaves the anchor, dismissal is deferred to the next tick to verify where focus landed:

- If focus moved into the floating panel, the surface remains open.
- If focus moved into a registered child submenu (when passing `tree`), the parent remains open.
- Switching tabs in the browser and returning will not reopen a closed surface.

### Accessibility Pairing

Combine `useFocus` with [`useHover`](/api/use-hover) and [`useRole(node, { role: "tooltip" })`](/api/use-role) to fulfill WCAG Success Criterion 1.4.13 (Content on Hover or Focus).

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useFocus, useHover, usePosition, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 6,
    flip: true,
    shift: { padding: 8 },
  },
});

useHover(node);
useFocus(node);
useRole(node, { role: "tooltip" });
</script>

<template>
  <button ref="anchorEl">Tab to focus me</button>

  <div v-if="node.open" ref="floatingEl" role="tooltip" :style="styles">
    Helpful keyboard-accessible hint
  </div>
</template>
```

## See Also

- [`useHover`](/api/use-hover) - Pointer hover trigger
- [`useRole`](/api/use-role) - ARIA role and `aria-describedby` synchronization
- [`useDismiss`](/api/use-dismiss) - Dismissal on Escape key
- [Build Accessible Tooltips](/guide/build-accessible-tooltips) - Complete tooltip pattern guide
