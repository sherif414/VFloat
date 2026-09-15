---
description: Build nested multi-level submenus with composite floating nodes, implicit DI, and safe cursor corridors.
---

# Build Nested Menus

Nested menus (submenus) introduce coordination challenges beyond single-level list navigation:

- Which submenus are currently open?
- When the user presses the expand key (`ArrowRight`), how does focus enter the child submenu?
- When the user presses the collapse key (`ArrowLeft`), how does focus return to the parent trigger item?
- How do diagonal mouse movements toward the submenu avoid closing it prematurely?
- When pressing `Escape`, how does the system close only the deepest open submenu first?

In VFloat, these questions are resolved by the **Unified Composite Node Architecture**. Submenus link directly into their parent floating node (either implicitly via Vue's Dependency Injection or explicitly via `parent: rootNode`), and pair each menu level with [`useRovingFocus`](/api/use-roving-focus) for physical item focus.

---

## The Composite Menu Architecture

Rather than creating a separate coordinator component, every menu level is a `FloatingNode`:

```
┌─────────────────────────────────────────────────────────────┐
│                    Root Menu Node                           │
│  • anchorEl: Button                                         │
│  • floatingEl: RootMenuPanel                                │
│  • provides itself to descendants via Vue DI                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Implicit DI (or parent: rootNode)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Submenu Node                             │
│  • anchorEl: 'Share' Item Trigger                           │
│  • floatingEl: SubmenuPanel                                 │
│  • child of Root Menu Node                                  │
└─────────────────────────────────────────────────────────────┘
```

1. **Composite linking:** Submenus automatically discover their parent node through Dependency Injection (`provide` / `inject`).
2. **Family-aware interactions:** [`useDismiss`](/api/use-dismiss) and [`useHover`](/api/use-hover) use `node.contains()` to treat child submenus as internal to the parent, preventing accidental dismissals.
3. **Safe cursor corridors:** [`useHover`](/api/use-hover) with `safePolygon: true` keeps the submenu open while the cursor travels diagonally toward the submenu panel.
4. **Intent-driven navigation:** [`useRovingFocus`](/api/use-roving-focus) fires `onEnter` (`ArrowRight`) to open the child submenu and `onExit` (`ArrowLeft`) to collapse back to the parent trigger.
5. **Leaf-first Escape:** Pressing `Escape` closes the innermost open submenu first with zero global event maps.

---

## Complete Multi-Component Example

Here is how compound menu primitives assemble in an application template:

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

### 1. Root Menu (`MenuRoot.vue`)

`useFloatingNode` automatically provides itself to all child components via Vue DI:

```vue
<script setup lang="ts">
import { provide, ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// Automatically provides rootNode to descendant components via DI
const rootNode = useFloatingNode({ anchorEl, floatingEl });

usePosition(rootNode, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

provide("MenuRootContext", { rootNode });
</script>

<template>
  <slot />
</template>
```

### 2. Root Trigger (`MenuTrigger.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect } from "vue";
import { useClick } from "v-float";

const { rootNode } = inject<any>("MenuRootContext");
const triggerRef = ref<HTMLButtonElement | null>(null);

watchEffect(() => {
  rootNode.refs.anchorEl.value = triggerRef.value;
});

useClick(rootNode);
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    aria-haspopup="menu"
    :aria-expanded="rootNode.open.value"
    @click="rootNode.setOpen(!rootNode.open.value)"
  >
    <slot />
  </button>
</template>
```

### 3. Root Content (`MenuContent.vue`)

```vue
<script setup lang="ts">
import { inject, ref, shallowRef, watchEffect, provide } from "vue";
import { useDismiss, useRovingFocus } from "v-float";

const { rootNode } = inject<any>("MenuRootContext");
const contentRef = ref<HTMLDivElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

watchEffect(() => {
  rootNode.refs.floatingEl.value = contentRef.value;
});

const { getTabindex } = useRovingFocus(rootNode, {
  elementsList: itemEls,
  loop: true,
});

useDismiss(rootNode);

provide("MenuLevelContext", { node: rootNode, getTabindex, itemEls });
</script>

<template>
  <Teleport to="body">
    <div v-if="rootNode.open.value" ref="contentRef" role="menu">
      <slot />
    </div>
  </Teleport>
</template>
```

### 4. Submenu Container (`MenuSub.vue`)

Calling `useFloatingNode()` with an omitted `parent` automatically injects `rootNode` as its parent:

```vue
<script setup lang="ts">
import { inject, provide, ref } from "vue";
import { useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

// Omitted parent automatically links to rootNode via Vue Dependency Injection
const subNode = useFloatingNode({ anchorEl, floatingEl, open });

provide("MenuSubContext", { subNode });
</script>

<template>
  <slot />
</template>
```

### 5. Submenu Trigger (`MenuSubTrigger.vue`)

```vue
<script setup lang="ts">
import { inject, ref, watchEffect } from "vue";
import { useHover } from "v-float";

const { subNode } = inject<any>("MenuSubContext");
const triggerRef = ref<HTMLButtonElement | null>(null);

watchEffect(() => {
  subNode.refs.anchorEl.value = triggerRef.value;
});

useHover(subNode, {
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
    :aria-expanded="subNode.open.value"
    @click="subNode.setOpen(!subNode.open.value)"
  >
    <slot />
    <span>›</span>
  </button>
</template>
```

### 6. Submenu Content (`MenuSubContent.vue`)

```vue
<script setup lang="ts">
import { inject, provide, ref, shallowRef, watchEffect } from "vue";
import { useDismiss, usePosition, useRovingFocus } from "v-float";

const { subNode } = inject<any>("MenuSubContext");
const contentRef = ref<HTMLDivElement | null>(null);
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

watchEffect(() => {
  subNode.refs.floatingEl.value = contentRef.value;
});

usePosition(subNode, {
  placement: "right-start",
  middlewares: { offset: 4, flip: true, shift: { padding: 12 } },
});

const { getTabindex } = useRovingFocus(subNode, {
  elementsList: itemEls,
  loop: true,
  onExit: () => {
    // ArrowLeft closes this submenu and returns focus to its parent trigger
    subNode.setOpen(false, "keyboard-exit");
  },
});

useDismiss(subNode);

provide("MenuLevelContext", { node: subNode, getTabindex, itemEls });
</script>

<template>
  <Teleport to="body">
    <div v-if="subNode.open.value" ref="contentRef" role="menu">
      <slot />
    </div>
  </Teleport>
</template>
```

---

## Single-Component Flat Script Pattern

If you prefer defining nested menus within a single flat `<script setup>`, link the parent node explicitly:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, useHover, usePosition, useRovingFocus } from "v-float";

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const subAnchorEl = ref<HTMLElement | null>(null);
const subFloatingEl = ref<HTMLElement | null>(null);

const rootItems = ref<(HTMLElement | null)[]>([]);
const subItems = ref<(HTMLElement | null)[]>([]);

// 1. Create nodes with explicit parent reference
const root = useFloatingNode({ anchorEl: rootAnchorEl, floatingEl: rootFloatingEl });
const sub = useFloatingNode({ anchorEl: subAnchorEl, floatingEl: subFloatingEl, parent: root });

// 2. Add positioning
const rootPos = usePosition(root, { placement: "bottom-start" });
const subPos = usePosition(sub, { placement: "right-start" });

// 3. Add interactions
useClick(root);
useDismiss(root);
useRovingFocus(root, { elementsList: rootItems });

useHover(sub, { delay: { open: 100, close: 200 }, safePolygon: true });
useDismiss(sub);
useRovingFocus(sub, {
  elementsList: subItems,
  onExit: () => sub.setOpen(false, "keyboard-exit"),
});
</script>
```

---

## Edge Cases Solved

- **Outside Click Safety:** Clicking inside a teleported child submenu does not dismiss the parent menu because [`useDismiss`](/api/use-dismiss) invokes `node.contains(target)`, which recursively checks open descendants.
- **Deepest Escape First:** Pressing `Escape` dismisses only the innermost active submenu first through the deterministic leaf-first Escape protocol.
- **Cascading Teardown:** When the root menu closes, you can tear down all open descendants using `rootNode.traverse((node) => node.setOpen(false, "programmatic"), { order: "bottom-up" })`.
- **Safe Traversal Corridor:** Moving the cursor diagonally across sibling items to enter the submenu is protected by `useHover({ safePolygon: true })`.

---

## Where to Go Next

- Read [Tree Coordination Explained](/guide/tree-coordination-explained) for the architectural deep dive.
- Read the [useFloatingNode API Reference](/api/use-floating-node).
- Read the [useRovingFocus API Reference](/api/use-roving-focus).
- Read the [useHover API Reference](/api/use-hover).
- Read the [Keyboard Navigation Guide](/guide/keyboard-navigation).
