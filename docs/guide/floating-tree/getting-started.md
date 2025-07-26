# Floating Tree: Getting Started

This guide will walk you through setting up your first Floating Tree implementation. By the end, you'll have a basic parent-child popover relationship managed by the tree.

## Prerequisites

Ensure you have a Vue 3 project set up with V-Float installed. If not, please refer to the main [V-Float documentation](https://v-float.com) for installation instructions.

## Step 1: Initializing the Tree

To begin, initialize the Floating Tree within your component's `<script setup>` using `useFloatingTree()`:

```vue
<script setup lang="ts">
import { useFloatingTree } from "@/composables/use-floating-tree"

const tree = useFloatingTree()
</script>
```

## Step 2: Creating Your First Floating Element

Next, let's create a basic popover using `useFloating()` for your root floating element. This will be the parent in our tree structure.

```vue
<script setup lang="ts">
// ... existing code ...
import { useFloating } from "@/composables/use-floating"

const { floatingStyles, context } = useFloating()
</script>

<template>
  <button ref="reference" @click="showPopover = !showPopover">Toggle Popover</button>
  <div v-if="showPopover" ref="floating" :style="floatingStyles">
    <!-- Popover content will go here -->
  </div>
</template>
```

## Step 3: Adding a Node to the Tree

Now, add your first floating element as a node to the tree. You'll use `tree.addNode()` and pass the `context` obtained from `useFloating()`.

```vue
<script setup lang="ts">
// ... existing code ...
import { ref, watchEffect } from "vue"

const showPopover = ref(false)

watchEffect(() => {
  if (showPopover.value) {
    tree.addNode(context)
  } else {
    tree.removeNode(context.nodeId)
  }
})
</script>
```

## Step 4: Creating a Nested Node

Let's create a nested popover (child) inside your first one. This new popover will also be a node in the tree, but it will declare its parent using `parentId`.

```vue
<script setup lang="ts">
// ... existing code ...

const { floatingStyles: nestedFloatingStyles, context: nestedContext } = useFloating()
const showNestedPopover = ref(false)

watchEffect(() => {
  if (showNestedPopover.value) {
    tree.addNode(nestedContext, context.nodeId) // Link to parent using context.nodeId
  } else {
    tree.removeNode(nestedContext.nodeId)
  }
})
</script>

<template>
  <!-- ... existing parent popover content ... -->
  <div v-if="showPopover" ref="floating" :style="floatingStyles">
    Parent Popover
    <button ref="nestedReference" @click="showNestedPopover = !showNestedPopover">
      Toggle Nested Popover
    </button>
    <div v-if="showNestedPopover" ref="nestedFloating" :style="nestedFloatingStyles">
      Nested Popover
    </div>
  </div>
</template>
```

## Complete, Copy-Pasteable Example

Here's the full code for a basic parent-child popover setup:

```vue
<script setup lang="ts">
import { ref, watchEffect } from "vue"
import { useFloating } from "@/composables/use-floating"
import { useFloatingTree } from "@/composables/use-floating-tree"

const tree = useFloatingTree()

// Parent Popover
const showPopover = ref(false)
const { floatingStyles, context, reference, floating } = useFloating()

watchEffect(() => {
  if (showPopover.value) {
    tree.addNode(context)
  } else {
    tree.removeNode(context.nodeId)
  }
})

// Nested Popover
const showNestedPopover = ref(false)
const {
  floatingStyles: nestedFloatingStyles,
  context: nestedContext,
  reference: nestedReference,
  floating: nestedFloating,
} = useFloating()

watchEffect(() => {
  if (showNestedPopover.value) {
    tree.addNode(nestedContext, context.nodeId) // Link to parent
  } else {
    tree.removeNode(nestedContext.nodeId)
  }
})
</script>

<template>
  <button ref="reference" @click="showPopover = !showPopover">Toggle Parent Popover</button>

  <div v-if="showPopover" ref="floating" :style="floatingStyles">
    <h2>Parent Popover</h2>
    <button ref="nestedReference" @click="showNestedPopover = !showNestedPopover">
      Toggle Nested Popover
    </button>
    <div v-if="showNestedPopover" ref="nestedFloating" :style="nestedFloatingStyles">
      <h3>Nested Popover</h3>
      <p>This popover is a child of the parent popover.</p>
    </div>
  </div>
</template>

<style>
/* Basic styling for demonstration */
div[data-floating] {
  border: 1px solid #ccc;
  padding: 10px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}
</style>
```

## What's Next?

Now that you have a basic tree, learn how to orchestrate complex interactions and solve real-world UI problems in our [Cookbook](./cookbook.md).
