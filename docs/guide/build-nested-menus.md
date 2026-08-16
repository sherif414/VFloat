---
description: Build nested multi-level menus with linked floating contexts and safe cursor polygons.
---

# Build Nested Menus

Nested menus (submenus) introduce state challenges beyond standard one-dimensional list navigation:

- Which submenus are currently open?
- When the user presses the expand key (e.g., `ArrowRight`), how does focus enter the child submenu?
- When the user presses the collapse key (e.g., `ArrowLeft`), how does focus return to the parent trigger item?
- How do diagonal mouse movements towards the submenu avoid closing it prematurely?
- When pressing `Escape`, how does the system close only the deepest open submenu?

In VFloat, these questions are resolved by linking **Floating Contexts** ([`useFloatingContext`](/api/use-floating-context) with `parentContext`) and pairing each menu level with a simple [`useCollection`](/api/use-collection).

---

## The Floating-First Menu Model

Rather than creating an artificial data tree, VFloat uses the **Floating Context Hierarchy** as the single source of truth for all overlay relationships:

```
┌─────────────────────────────────────────────────────────────┐
│                    Root Menu Context                        │
│  • anchorEl: Button                                         │
│  • floatingEl: RootMenuPanel                                │
│  • collection: ['new', 'open', 'export']                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               parentContext: rootContext (Native link)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Submenu Context                          │
│  • anchorEl: 'export' Item                                  │
│  • floatingEl: SubmenuPanel                                 │
│  • collection: ['pdf', 'png', 'svg']                        │
└─────────────────────────────────────────────────────────────┘
```

1. **Overlay Linking:** Each submenu creates a `useFloatingContext` with `parentContext: parentContext`.
2. **Safe Cursor Movement:** [`useHover`](/api/use-hover) with `safePolygon: true` prevents diagonal cursor movements from closing the submenu.
3. **Intent-Driven Keyboard Navigation:** [`useListNavigation`](/api/use-list-navigation) emits `onEnter` (e.g. `ArrowRight`) to open a child submenu and `onExit` (e.g. `ArrowLeft`) to collapse back to the parent.
4. **Stacked Escape & Outside Clicks:** [`useEscapeKey`](/api/use-escape-key) automatically closes the deepest open submenu first, while [`useOutsideClick`](/api/use-outside-click) protects the parent menu from closing when clicking inside a child submenu portal.

---

## Complete Nested Menu Example (Compound Primitives)

Here is how to build a clean multi-level nested menu using compound components.

### 1. Root Menu (`MenuRoot.vue`)

```vue
<script setup lang="ts">
import { ref, provide } from "vue";
import { useFloatingContext, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const rootContext = useFloatingContext({ anchorEl, floatingEl });
const rootPosition = usePosition(rootContext, {
  placement: "bottom-start",
  middleware: { offset: 8, flip: true, shift: { padding: 12 } },
});

provide("MenuRootContext", { rootContext, rootPosition });
</script>

<template>
  <slot />
</template>
```

### 2. Root Content (`MenuContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect, provide } from "vue";
import { useCollection, useListNavigation, useEscapeKey, useOutsideClick } from "v-float";

const { rootContext, rootPosition } = inject<any>("MenuRootContext");
const contentRef = ref<HTMLDivElement | null>(null);

watchEffect(() => {
  rootContext.refs.floatingEl.value = contentRef.value;
});

const items = ref<string[]>(["new", "export", "delete"]);
const collection = useCollection({ values: items });

useListNavigation(rootContext, {
  collection,
  loop: true,
});

useEscapeKey(rootContext);
useOutsideClick(rootContext);

provide("MenuLevelContext", { context: rootContext, collection });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="rootContext.state.open.value"
      ref="contentRef"
      role="menu"
      :style="rootPosition.styles"
    >
      <slot />
    </div>
  </Teleport>
</template>
```

### 3. Submenu (`MenuSub.vue`)

```vue
<script setup lang="ts">
import { inject, ref, provide } from "vue";
import { useFloatingContext } from "v-float";

const parentLevel = inject<any>("MenuLevelContext");

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const subContext = useFloatingContext({
  anchorEl,
  floatingEl,
  open,
  parentContext: parentLevel.context,
});

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
    :aria-expanded="subContext.state.open.value"
    @click="subContext.state.setOpen(!subContext.state.open.value)"
  >
    <slot />
    <span>›</span>
  </button>
</template>
```

### 5. Submenu Content (`MenuSubContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect, provide } from "vue";
import { useCollection, useListNavigation, usePosition } from "v-float";

const { subContext, parentLevel } = inject<any>("MenuSubContext");
const contentRef = ref<HTMLDivElement | null>(null);

watchEffect(() => {
  subContext.refs.floatingEl.value = contentRef.value;
});

const position = usePosition(subContext, {
  placement: "right-start",
  middleware: { offset: 4, flip: true, shift: { padding: 12 } },
});

const subItems = ref<string[]>(["pdf", "png", "svg"]);
const collection = useCollection({ values: subItems });

useListNavigation(subContext, {
  collection,
  loop: true,
  onExit: () => {
    // ArrowLeft collapses child submenu and restores active item in parent
    subContext.state.setOpen(false);
  },
});

provide("MenuLevelContext", { context: subContext, collection, parentLevel });
</script>

<template>
  <Teleport to="body">
    <div v-if="subContext.state.open.value" ref="contentRef" role="menu" :style="position.styles">
      <slot />
    </div>
  </Teleport>
</template>
```

---

## Edge Cases Solved Automatically

- **Outside Click Safety:** Clicking inside a teleported child submenu does not dismiss the parent menu because [`useOutsideClick`](/api/use-outside-click) inspects all registered descendant floating contexts.
- **Deepest Escape First:** Pressing `Escape` automatically dismisses only the innermost open submenu first.
- **Cascading Teardown:** Closing the root menu automatically tears down all child submenus in reverse depth order.
- **Safe Triangle:** Moving the cursor diagonally across sibling items to enter the submenu is protected by `useHover({ safePolygon: true })`.

---

## See Also

- [`useFloatingContext`](/api/use-floating-context)
- [`useCollection`](/api/use-collection)
- [`useListNavigation`](/api/use-list-navigation)
- [`useHover`](/api/use-hover)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
