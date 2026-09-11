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

---\n\n## The floating-first menu model

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

1. **Overlay linking:** Nodes stay standalone until they join a tree. Each submenu registers with `tree.addNode(subNode, parentNode.id)`.
2. **Safe cursor movement:** [`useHover`](/api/use-hover) with `safePolygon: true` and `tree` prevents diagonal cursor movements from closing the submenu prematurely.
3. **Intent-driven keyboard navigation:** [`useRovingFocus`](/api/use-roving-focus) calls `onEnter` (such as `ArrowRight`) to open a child submenu and `onExit` (such as `ArrowLeft`) to collapse back to the parent.
4. **Stacked Escape and outside clicks:** [`useDismiss`](/api/use-dismiss) with `tree` closes the deepest open submenu first on Escape, while protecting the parent menu from closing when clicking inside a child submenu portal.

---\n\n## Complete nested menu example

Here is how the compound menu primitives assemble in an application template:

```vue
<template>
  <MenuRoot>
    <MenuTrigger>Options</MenuTrigger>
    <MenuContent>
      <button role="menuitem" type="button">New document</button>
      <button role="menuitem" type="button">Duplicate</button>
      <MenuSub>
        <MenuSubTrigger>Share</MenuSubTrigger>
        <MenuSubContent>
          <button role="menuitem" type="button">Copy link</button>
          <button role="menuitem" type="button">Email invite</button>
        </MenuSubContent>
      </MenuSub>
      <button role="menuitem" type="button">Delete</button>
    </MenuContent>
  </MenuRoot>
</template>
```

Here are the compound primitives that make this structure work.

### Root menu (`MenuRoot.vue`)

```vue
<script setup lang="ts">
import { ref, provide } from "vue";
import { useFloatingNode, useFloatingTree, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const tree = useFloatingTree();
const rootContext = useFloatingNode({ anchorEl, floatingEl });
tree.addNode(rootContext);

const { styles } = usePosition(rootContext, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

provide("MenuRootContext", { tree, rootContext, styles });
</script>

<template>
  <slot />
</template>
```

### Root trigger (`MenuTrigger.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect } from "vue";
import { useClick } from "v-float";

const { rootContext } = inject<any>("MenuRootContext");
const triggerRef = ref<HTMLButtonElement | null>(null);

watchEffect(() => {
  rootContext.refs.anchorEl.value = triggerRef.value;
});

useClick(rootContext);
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    aria-haspopup="menu"
    :aria-expanded="rootContext.open.value"
    @click="rootContext.setOpen(!rootContext.open.value)"
  >
    <slot />
  </button>
</template>
```

### Root content (`MenuContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, shallowRef, watchEffect, provide } from "vue";
import { useRovingFocus, useDismiss } from "v-float";

const { tree, rootContext, styles } = inject<any>("MenuRootContext");
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
    <div v-if="rootContext.open.value" ref="contentRef" role="menu" :style="styles">
      <slot />
    </div>
  </Teleport>
</template>
```

### Submenu (`MenuSub.vue`)

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

### Submenu trigger (`MenuSubTrigger.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect } from "vue";
import { useHover } from "v-float";

const { tree } = inject<any>("MenuRootContext");
const { subContext, parentLevel } = inject<any>("MenuSubContext");
const triggerRef = ref<HTMLButtonElement | null>(null);

watchEffect(() => {
  subContext.refs.anchorEl.value = triggerRef.value;
});

useHover(subContext, {
  delay: { open: 100, close: 200 },
  safePolygon: true,
  tree,
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

### Submenu content (`MenuSubContent.vue`)

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

const { styles } = usePosition(subContext, {
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
    <div v-if="subContext.open.value" ref="contentRef" role="menu" :style="styles">
      <slot />
    </div>
  </Teleport>
</template>
```

---

## Edge cases solved

- **Outside click safety.** Clicking inside a teleported child submenu does not dismiss the parent menu because [`useDismiss`](/api/use-dismiss) with `tree` inspects all registered descendant floating elements.
- **Deepest Escape first.** Pressing `Escape` dismisses only the innermost open submenu first when [`useDismiss`](/api/use-dismiss) receives the same `tree`.
- **Explicit cascading teardown.** Closing the root menu does not cascade on its own. Call `tree.forEach(rootContext.id, "descendants", (descendant) => descendant.setOpen(false, "programmatic"), { order: "bottom-up" })` when parent teardown must close the family in reverse depth order.
- **Safe triangle.** Moving the cursor diagonally across sibling items to enter the submenu is protected by `useHover({ safePolygon: true, tree })`.

---

## Where to go next

- [`useFloatingNode`](/api/use-floating-node)
- [`useFloatingTree`](/api/use-floating-tree)
- [`useRovingFocus`](/api/use-roving-focus)
- [`useHover`](/api/use-hover)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
