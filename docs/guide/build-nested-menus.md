---
description: Build nested multi-level menus with an explicit floating tree and safe cursor polygons.
---

# Build Nested Menus

Nested menus (submenus) introduce state challenges beyond standard one-dimensional list navigation:

- Which submenus are currently open?
- When the user presses the expand key (e.g., `ArrowRight`), how does focus enter the child submenu?
- When the user presses the collapse key (e.g., `ArrowLeft`), how does focus return to the parent trigger item?
- How do diagonal mouse movements towards the submenu avoid closing it prematurely?
- When pressing `Escape`, how does the system close only the deepest open submenu?

In VFloat, these questions are resolved by linking nodes in an explicit [`useFloatingTree`](/api/use-floating-tree) and pairing each menu level with [`useRovingFocus`](/api/use-roving-focus) for physical item focus.

---

## The Floating-First Menu Model

Rather than creating an artificial data tree, VFloat uses the **floating tree** as the single source of truth for all overlay relationships:

```
┌─────────────────────────────────────────────────────────────┐
│                    Root Menu Node                           │
│  • anchorEl: Button                                         │
│  • floatingEl: RootMenuPanel                                │
│  • tree.addNode(rootNode)                                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                tree.addNode(subNode, rootNode.id)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Submenu Node                             │
│  • anchorEl: 'export' Item                                  │
│  • floatingEl: SubmenuPanel                                 │
└─────────────────────────────────────────────────────────────┘
```

1. **Overlay Linking:** Nodes stay standalone until they join a tree. Each submenu registers with `tree.addNode(subNode, parentNode.id)`.
2. **Safe Cursor Movement:** [`useHover`](/api/use-hover) with `safePolygon: true` prevents diagonal cursor movements from closing the submenu.
3. **Intent-Driven Keyboard Navigation:** [`useRovingFocus`](/api/use-roving-focus) calls `onEnter` (e.g. `ArrowRight`) to open a child submenu and `onExit` (e.g. `ArrowLeft`) to collapse back to the parent.
4. **Stacked Escape & Outside Clicks:** [`useDismiss`](/api/use-dismiss) with `tree` closes the deepest open submenu first on Escape, while protecting the parent menu from closing when clicking inside a child submenu portal — the tree is passed once and shared by both channels.

---

## Complete Nested Menu Example (Compound Primitives)

Here is how to build a clean multi-level nested menu using compound components.

### 1. Root Menu (`MenuRoot.vue`)

```vue
<script setup lang="ts">
import { ref, provide } from "vue";
import { useFloatingNode, useFloatingTree, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const tree = useFloatingTree();
const rootContext = useFloatingNode({ anchorEl, floatingEl });
tree.addNode(rootContext);

const rootPosition = usePosition(rootContext, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

provide("MenuRootContext", { tree, rootContext, rootPosition });
</script>

<template>
  <slot />
</template>
```

### 2. Root Content (`MenuContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, shallowRef, watchEffect, provide } from "vue";
import { useRovingFocus, useDismiss } from "v-float";

const { tree, rootContext, rootPosition } = inject<any>("MenuRootContext");
const contentRef = ref<HTMLDivElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

watchEffect(() => {
  rootContext.refs.floatingEl.value = contentRef.value;
});

const { getTabindex } = useRovingFocus(rootContext, {
  elementsList: itemEls,
  tree,
  loop: true,
});

useDismiss(rootContext, { tree });

provide("MenuLevelContext", { context: rootContext, getTabindex, itemEls });
</script>

<template>
  <Teleport to="body">
    <div v-if="rootContext.open.value" ref="contentRef" role="menu" :style="rootPosition.styles">
      <slot />
    </div>
  </Teleport>
</template>
```

### 3. Submenu (`MenuSub.vue`)

```vue
<script setup lang="ts">
import { inject, ref, provide } from "vue";
import { useFloatingNode } from "v-float";

const { tree } = inject<any>("MenuRootContext");
const parentLevel = inject<any>("MenuLevelContext");

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const subContext = useFloatingNode({ anchorEl, floatingEl, open });
tree.addNode(subContext, parentLevel.context.id);

provide("MenuSubContext", { subContext, parentLevel });
</script>

<template>
  <slot />
</template>
```

### 4. Submenu Trigger (`MenuSubTrigger.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect } from "vue";
import { useHover } from "v-float";

const { subContext, parentLevel } = inject<any>("MenuSubContext");
const triggerRef = ref<HTMLButtonElement | null>(null);

watchEffect(() => {
  subContext.refs.anchorEl.value = triggerRef.value;
});

useHover(subContext, {
  delay: { open: 100, close: 200 },
  safePolygon: true,
});
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="subContext.open.value"
    @click="subContext.setOpen(!subContext.open.value)"
  >
    <slot />
    <span>›</span>
  </button>
</template>
```

### 5. Submenu Content (`MenuSubContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, shallowRef, watchEffect, provide } from "vue";
import { useRovingFocus, usePosition } from "v-float";

const { tree } = inject<any>("MenuRootContext");
const { subContext, parentLevel } = inject<any>("MenuSubContext");
const contentRef = ref<HTMLDivElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

watchEffect(() => {
  subContext.refs.floatingEl.value = contentRef.value;
});

const position = usePosition(subContext, {
  placement: "right-start",
  middlewares: { offset: 4, flip: true, shift: { padding: 12 } },
});

const { getTabindex } = useRovingFocus(subContext, {
  elementsList: itemEls,
  tree,
  loop: true,
  onExit: () => {
    // ArrowLeft collapses the child submenu and restores focus to the parent trigger
    subContext.setOpen(false);
  },
});

provide("MenuLevelContext", { context: subContext, getTabindex, itemEls, parentLevel });
</script>

<template>
  <Teleport to="body">
    <div v-if="subContext.open.value" ref="contentRef" role="menu" :style="position.styles">
      <slot />
    </div>
  </Teleport>
</template>
```

---

## Edge Cases Solved

- **Outside Click Safety:** Clicking inside a teleported child submenu does not dismiss the parent menu because [`useOutsideClick`](/api/use-outside-click) with `tree` inspects all registered descendant floating elements.
- **Deepest Escape First:** Pressing `Escape` dismisses only the innermost open submenu first when [`useEscapeKey`](/api/use-escape-key) receives the same `tree` platform.
- **Explicit Cascading Teardown:** Closing the root menu does not cascade on its own. Call `tree.closeDescendants(rootContext, reason, event)` when parent teardown must close the family in reverse depth order.
- **Safe Triangle:** Moving the cursor diagonally across sibling items to enter the submenu is protected by `useHover({ safePolygon: true })`.

---

## See Also

- [`useFloatingNode`](/api/use-floating-node)
- [useFloatingTree](/api/use-floating-tree)
- [`useCollection`](/api/use-collection)
- [`useRovingFocus`](/api/use-roving-focus)
- [`useHover`](/api/use-hover)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
