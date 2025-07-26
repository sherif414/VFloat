# Floating Tree: Cookbook & Advanced Recipes

This page provides a collection of advanced recipes and solutions for common, complex UI problems when working with the Floating Tree. Each recipe tackles a specific challenge, demonstrating the power and versatility of the V-Float API.

## Recipe: Creating Mutually Exclusive Submenus

### Problem

In a nested menu system, when you open one submenu, any currently open sibling submenus should automatically close to maintain a clean UI.

### Solution

Leverage the `tree.forEach` method with the `{ relationship: 'siblings-only' }` option. This allows you to iterate over only the direct siblings of a given node, enabling you to close them when a new one opens.

### Code Snippet

```typescript
import {
  useFloatingTree,
  useFloating,
  type UseFloatingReturn,
} from "@/composables/use-floating-tree"
import { ref, watchEffect } from "vue"

interface MenuItemProps {
  nodeId: string
  parentId?: string
  label: string
}

const Menu = ({ items }: { items: MenuItemProps[] }) => {
  const tree = useFloatingTree()
  const openSubMenuId = ref<string | null>(null)

  const openSubMenu = (nodeToOpenId: string, parentId?: string) => {
    openSubMenuId.value = nodeToOpenId
    // Close any other open sibling submenus
    if (parentId) {
      tree.forEach(
        parentId,
        (node) => {
          if (node.nodeId !== nodeToOpenId) {
            // Assuming you have a way to control the visibility of each node
            // For example, if your node data includes a 'show' ref:
            const floatingContext = node.context as UseFloatingReturn
            if (floatingContext) {
              // You would manage the visibility state here, e.g., setting a ref to false
              // For this example, we'll just log it.
              console.log(`Closing sibling submenu: ${node.nodeId}`)
            }
          }
        },
        { relationship: "siblings-only" }
      )
    }
  }

  // ... rest of your menu rendering logic
}
```

## Recipe: Intelligent Escape Key Dismissal

### Problem

When a user presses the Escape key, only the topmost (most recently opened and active) floating element should close, not all open elements in the tree.

### Solution

Combine `tree.getAllOpenNodes()` with `tree.isTopmost()` to identify the correct node to dismiss. Attach a global keydown event listener.

### Code Snippet

```typescript
import { useFloatingTree, type FloatingTreeContext } from "@/composables/use-floating-tree"
import { onMounted, onUnmounted } from "vue"

const tree = useFloatingTree()

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    const openNodes = tree.getAllOpenNodes()
    // Find the topmost open node
    const topmostNode = openNodes.find((node) => tree.isTopmost(node.nodeId))

    if (topmostNode) {
      // Assuming your node's context or data contains a way to close it.
      // For example, if it uses a `show` ref:
      const context = topmostNode.context as FloatingTreeContext & { show: Ref<boolean> }
      if (context && context.show) {
        context.show.value = false
      }
      // Prevent default browser behavior (e.g., closing full-screen mode)
      event.preventDefault()
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleEscapeKey)
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleEscapeKey)
})
```

## Recipe: Closing an Entire UI Branch

### Problem

When a user closes a parent floating element (e.g., a profile popover), any child floating elements that were opened from it (e.g., a settings dialog or a logout confirmation) should also close automatically.

### Solution

Use `tree.forEach` with the `{ relationship: 'self-and-descendants' }` option. This allows you to traverse and close the target node and all its children.

### Code Snippet

```typescript
import { useFloatingTree, type FloatingTreeContext } from "@/composables/use-floating-tree"
import { ref } from "vue"

const tree = useFloatingTree()
const showProfilePopover = ref(false)

const closeProfilePopover = (nodeId: string) => {
  // Close the profile popover and all its descendants
  tree.forEach(
    nodeId,
    (node) => {
      // Assuming your node's context or data contains a way to close it.
      // For example, if it uses a `show` ref:
      const context = node.context as FloatingTreeContext & { show: Ref<boolean> }
      if (context && context.show) {
        context.show.value = false
      }
    },
    { relationship: "self-and-descendants" }
  )

  showProfilePopover.value = false // Also close the state controlling the main popover
}

// Usage example:
// <button @click="closeProfilePopover(profilePopoverNodeId)">Close Profile</button>
```

## Recipe: Building Modal-like Behavior (Focus Trapping & Inert)

### Problem

When a critical dialog (like a modal) is open, all interactive elements _behind_ it in the UI should be disabled and unreachable by keyboard navigation or screen readers. This creates a true modal experience.

### Solution

Use `tree.forEach` with `{ relationship: 'all-except-branch' }` to apply the `inert` attribute to all elements that are not part of the currently active floating branch. Remember to remove `inert` when the modal closes.

### Code Snippet

```typescript
import { useFloatingTree } from "@/composables/use-floating-tree"
import { onMounted, onUnmounted, watchEffect, ref } from "vue"

const tree = useFloatingTree()
const showModal = ref(false)
const modalNodeId = ref<string | null>(null) // Store the nodeId of the modal

watchEffect(() => {
  if (showModal.value && modalNodeId.value) {
    // Apply inert to everything except the modal's branch
    tree.forEach(
      modalNodeId.value,
      (node) => {
        // This callback is for the nodes *not* in the target relationship.
        // We apply inert to their reference and floating elements.
        if (node.context.reference && node.context.reference.value) {
          node.context.reference.value.setAttribute("inert", "")
        }
        if (node.context.floating && node.context.floating.value) {
          node.context.floating.value.setAttribute("inert", "")
        }
      },
      { relationship: "all-except-branch" }
    )
  } else if (!showModal.value && modalNodeId.value) {
    // Remove inert from everything when modal closes
    // You might need to iterate over all nodes or keep track of affected elements
    // For simplicity, this example assumes you can re-enable everything.
    // A more robust solution might store the elements that were made inert.
    tree.getAllNodes().forEach((node) => {
      if (node.context.reference && node.context.reference.value) {
        node.context.reference.value.removeAttribute("inert")
      }
      if (node.context.floating && node.context.floating.value) {
        node.context.floating.value.removeAttribute("inert")
      }
    })
  }
})

// Remember to set modalNodeId when you add the modal to the tree:
// tree.addNode(modalContext); modalNodeId.value = modalContext.nodeId;
```

This recipe demonstrates a powerful pattern, but implementing full focus trapping also involves careful management of `tabindex` and programmatic focus shifts, which are beyond the scope of this particular snippet.
