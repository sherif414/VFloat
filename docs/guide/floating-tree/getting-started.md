# Floating Tree: Getting Started

This guide will walk you through setting up your first Floating Tree implementation using the new streamlined API. By the end, you'll have a basic parent-child menu relationship managed by the tree.

## Prerequisites

Ensure you have a Vue 3 project set up with V-Float installed. If not, please refer to the main [V-Float documentation](https://v-float.com) for installation instructions.

## Step 1: Creating the Root Tree

The new API eliminates redundant `useFloating` calls. Initialize the tree directly with your anchor and floating elements:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloatingTree } from "@/composables/use-floating-tree"
import { offset, flip, shift } from "@floating-ui/dom"

const isOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

// Create tree with root context automatically
const tree = useFloatingTree(anchorEl, floatingEl, {
  placement: "bottom-start",
  open: isOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
}, { deleteStrategy: "recursive" })

// Access root floating styles from tree.rootContext
const { floatingStyles } = tree.rootContext
</script>

<template>
  <button ref="anchorEl" @click="isOpen = !isOpen">Toggle Menu</button>
  <div v-if="isOpen" ref="floatingEl" :style="floatingStyles">
    <!-- Menu content will go here -->
  </div>
</template>
```

## Step 2: Adding Child Nodes

Now add child nodes using the new `addNode` API that creates floating contexts internally:

```vue
<script setup lang="ts">
// ... existing code ...

const isSubmenuOpen = ref(false)
const submenuAnchorEl = ref<HTMLElement | null>(null)
const submenuFloatingEl = ref<HTMLElement | null>(null)

// Add submenu node - no separate useFloating call needed!
const submenuNode = tree.addNode(submenuAnchorEl, submenuFloatingEl, {
  placement: "right-start",
  open: isSubmenuOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
  parentId: tree.root.id, // Link to parent using parentId in options
})

// Access submenu floating styles from the node's data
const { floatingStyles: submenuFloatingStyles } = submenuNode.data
</script>

<template>
  <button ref="anchorEl" @click="isOpen = !isOpen">Toggle Menu</button>
  
  <div v-if="isOpen" ref="floatingEl" :style="floatingStyles">
    <div>Main Menu</div>
    <button ref="submenuAnchorEl" @click="isSubmenuOpen = !isSubmenuOpen">
      Toggle Submenu
    </button>
    
    <div v-if="isSubmenuOpen" ref="submenuFloatingEl" :style="submenuFloatingStyles">
      <div>Submenu Content</div>
    </div>
  </div>
</template>
```

## Step 3: Adding Interactions

The tree works seamlessly with interaction composables:

```vue
<script setup lang="ts">
import { useClick, useEscapeKey } from "@/composables/interactions"

// ... existing tree setup ...

// Add click interactions
useClick(tree.root, { outsideClick: true })
useClick(submenuNode, { outsideClick: true })

// Add escape key handling
useEscapeKey({
  onEscape() {
    tree.getTopmostOpenNode()?.data.setOpen(false)
  },
})
</script>
```


## Step 4: Cleanup

Remember to dispose of the tree when the component unmounts:

```vue
<script setup lang="ts">
import { onUnmounted } from "vue"

// ... existing code ...

onUnmounted(() => {
  tree.dispose()
})
</script>
```

## Complete, Copy-Pasteable Example

Here's the full code for a basic parent-child menu setup using the new API:

```vue
<script setup lang="ts">
import { ref, onUnmounted } from "vue"
import { useFloatingTree } from "@/composables/use-floating-tree"
import { useClick, useEscapeKey } from "@/composables/interactions"
import { offset, flip, shift } from "@floating-ui/dom"

// Root menu setup
const isOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const tree = useFloatingTree(anchorEl, floatingEl, {
  placement: "bottom-start",
  open: isOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
}, { deleteStrategy: "recursive" })

const { floatingStyles } = tree.rootContext

// Submenu setup
const isSubmenuOpen = ref(false)
const submenuAnchorEl = ref<HTMLElement | null>(null)
const submenuFloatingEl = ref<HTMLElement | null>(null)

const submenuNode = tree.addNode(submenuAnchorEl, submenuFloatingEl, {
  placement: "right-start",
  open: isSubmenuOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
  parentId: tree.root.id,
})

const { floatingStyles: submenuFloatingStyles } = submenuNode.data

// Interactions
useClick(tree.root, { outsideClick: true })
useClick(submenuNode, { outsideClick: true })

useEscapeKey({
  onEscape() {
    tree.getTopmostOpenNode()?.data.setOpen(false)
  },
})

// Cleanup
onUnmounted(() => {
  tree.dispose()
})
</script>

<template>
  <button ref="anchorEl" @click="isOpen = !isOpen">Toggle Menu</button>

  <div v-if="isOpen" ref="floatingEl" :style="floatingStyles">
    <h2>Main Menu</h2>
    <button ref="submenuAnchorEl" @click="isSubmenuOpen = !isSubmenuOpen">
      Toggle Submenu
    </button>
    
    <div v-if="isSubmenuOpen" ref="submenuFloatingEl" :style="submenuFloatingStyles">
      <h3>Submenu</h3>
      <p>This is a child menu.</p>
    </div>
  </div>
</template>

<style>
/* Basic styling for demonstration */
[data-floating] {
  border: 1px solid #ccc;
  padding: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 1000;
  min-width: 160px;
}
</style>
```

## API Benefits

**Before (Old API):**
```ts
// Required separate useFloating calls
const rootContext = useFloating(anchorEl, floatingEl, options)
const tree = useFloatingTree(rootContext)
const childContext = useFloating(childAnchorEl, childFloatingEl, childOptions)
const childNode = tree.addNode(childContext, rootContext.nodeId)
```

**After (New API):**
```ts
// Single call creates tree with root context
const tree = useFloatingTree(anchorEl, floatingEl, options)
// addNode creates child context internally
const childNode = tree.addNode(childAnchorEl, childFloatingEl, { 
  ...childOptions,
  parentId: tree.root.id 
})
```

## What's Next?

Now that you have a basic tree with the streamlined API, learn how to handle complex interactions and solve real-world UI problems in our [Cookbook](./cookbook.md).
