# Floating Tree: Cookbook & Advanced Recipes

This page provides a collection of advanced recipes and solutions for common, complex UI problems when working with the Floating Tree using the new streamlined API. Each recipe tackles a specific challenge, demonstrating the power and versatility of the V-Float API.

## Recipe: Creating Mutually Exclusive Submenus

### Problem

In a nested menu system, when you open one submenu, any currently open sibling submenus should automatically close to maintain a clean UI.

### Solution

Leverage the `tree.applyToNodes` method with the `{ relationship: 'siblings-only' }` option. This allows you to iterate over only the direct siblings of a given node, enabling you to close them when a new one opens.

### Code Snippet

```vue
<script setup lang="ts">
import { useFloatingTree, offset, flip, shift } from "v-float"
import { ref } from "vue"

interface MenuItem {
  id: string
  label: string
  children?: MenuItem[]
}

const props = defineProps<{ items: MenuItem[] }>()

// Create root menu tree
const isRootOpen = ref(false)
const rootAnchorEl = ref<HTMLElement | null>(null)
const rootFloatingEl = ref<HTMLElement | null>(null)

const tree = useFloatingTree()
const rootNode = tree.addNode(rootAnchorEl, rootFloatingEl, {
  placement: "bottom-start",
  open: isRootOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
})

const openSubmenuNodes = ref<Map<string, boolean>>(new Map())

const createSubmenu = (item: MenuItem, parentNodeId: string) => {
  const isOpen = ref(false)
  const anchorEl = ref<HTMLElement | null>(null)
  const floatingEl = ref<HTMLElement | null>(null)
  
  const node = tree.addNode(anchorEl, floatingEl, {
    placement: "right-start",
    open: isOpen,
    middlewares: [offset(5), flip(), shift({ padding: 5 })],
    parentId: parentNodeId,
  })
  
  const openSubmenu = () => {
    // Close any other open sibling submenus
    tree.applyToNodes(
      parentNodeId,
      (siblingNode) => {
        if (siblingNode.id !== node.id) {
          siblingNode.data.setOpen(false)
        }
      },
      { relationship: "children-only" }
    )
    
    isOpen.value = true
  }
  
  return { node, isOpen, anchorEl, floatingEl, openSubmenu }
}
</script>
```

## Recipe: Intelligent Escape Key Dismissal

### Problem

When a user presses the Escape key, only the topmost (most recently opened and active) floating element should close, not all open elements in the tree.

### Solution

Use `tree.getTopmostOpenNode()` to identify the highest-level open node and close it. The new API provides a built-in method for this common pattern.

### Code Snippet

```vue
<script setup lang="ts">
import { useFloatingTree, useEscapeKey } from "v-float"
import { ref, onUnmounted } from "vue"

// Setup tree with root menu
const isMenuOpen = ref(false)
const menuAnchorEl = ref<HTMLElement | null>(null)
const menuFloatingEl = ref<HTMLElement | null>(null)

const tree = useFloatingTree()
const menuNode = tree.addNode(menuAnchorEl, menuFloatingEl, {
  placement: "bottom-start",
  open: isMenuOpen,
  middlewares: [offset(5), flip()],
})

// Add submenus
const submenuNode = tree.addNode(submenuAnchorEl, submenuFloatingEl, {
  placement: "right-start",
  open: isSubmenuOpen,
  parentId: menuNode?.id,
})

// Intelligent escape key handling
useEscapeKey({
  onEscape() {
    const topmostNode = tree.getDeepestOpenNode()
    if (topmostNode) {
      topmostNode.data.setOpen(false)
    }
  },
})

// Alternative manual approach for custom logic
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    const openNodes = tree.getAllOpenNodes()
    const topmostNode = tree.getDeepestOpenNode()
    
    if (topmostNode) {
      topmostNode.data.setOpen(false)
      event.preventDefault()
    }
  }
}

// Cleanup
onUnmounted(() => {
  tree.dispose()
})
</script>
```

## Recipe: Closing an Entire UI Branch

### Problem

When a user closes a parent floating element (e.g., a profile popover), any child floating elements that were opened from it (e.g., a settings dialog or a logout confirmation) should also close automatically.

### Solution

Use `tree.applyToNodes` with the `{ relationship: 'self-and-descendants' }` option. This allows you to traverse and close the target node and all its children.

### Code Snippet

```vue
<script setup lang="ts">
import { useFloatingTree } from "v-float"
import { ref } from "vue"

// Setup profile popover tree
const isProfileOpen = ref(false)
const profileAnchorEl = ref<HTMLElement | null>(null)
const profileFloatingEl = ref<HTMLElement | null>(null)

const tree = useFloatingTree()
const rootNode = tree.addNode(profileAnchorEl, profileFloatingEl, {
  placement: "bottom-end",
  open: isProfileOpen,
  middlewares: [offset(8), flip()],
})

// Add settings dialog as child
const isSettingsOpen = ref(false)
const settingsAnchorEl = ref<HTMLElement | null>(null)
const settingsFloatingEl = ref<HTMLElement | null>(null)

const settingsNode = tree.addNode(settingsAnchorEl, settingsFloatingEl, {
  placement: "right-start",
  open: isSettingsOpen,
  parentId: tree.root.id,
})

// Add logout confirmation as child of settings
const isLogoutOpen = ref(false)
const logoutAnchorEl = ref<HTMLElement | null>(null)
const logoutFloatingEl = ref<HTMLElement | null>(null)

const logoutNode = tree.addNode(logoutAnchorEl, logoutFloatingEl, {
  placement: "bottom-start",
  open: isLogoutOpen,
  parentId: settingsNode.id,
})

const closeProfileBranch = () => {
  // Close the profile popover and all its descendants
  tree.applyToNodes(
    rootNode!.id,
    (node) => {
      node.data.setOpen(false)
    },
    { relationship: "self-and-descendants" }
  )
}

// Alternative: Close specific branch
const closeSettingsBranch = () => {
  tree.applyToNodes(
    settingsNode.id,
    (node) => {
      node.data.setOpen(false)
    },
    { relationship: "self-and-descendants" }
  )
}
</script>

<template>
  <!-- Profile popover trigger -->
  <button ref="profileAnchorEl" @click="isProfileOpen = !isProfileOpen">
    Profile
  </button>
  
  <!-- Profile popover -->
  <div v-if="isProfileOpen" ref="profileFloatingEl" :style="rootNode!.data.floatingStyles">
    <h3>Profile Menu</h3>
    <button ref="settingsAnchorEl" @click="isSettingsOpen = !isSettingsOpen">
      Settings
    </button>
    <button @click="closeProfileBranch">Close All</button>
    
    <!-- Settings dialog -->
    <div v-if="isSettingsOpen" ref="settingsFloatingEl" :style="settingsNode.data.floatingStyles">
      <h4>Settings</h4>
      <button ref="logoutAnchorEl" @click="isLogoutOpen = !isLogoutOpen">
        Logout
      </button>
      <button @click="closeSettingsBranch">Close Settings Branch</button>
      
      <!-- Logout confirmation -->
      <div v-if="isLogoutOpen" ref="logoutFloatingEl" :style="logoutNode.data.floatingStyles">
        <p>Are you sure you want to logout?</p>
        <button @click="logout">Yes, Logout</button>
        <button @click="isLogoutOpen = false">Cancel</button>
      </div>
    </div>
  </div>
</template>
```

## Recipe: Building Modal-like Behavior (Focus Trapping & Inert)

### Problem

When a critical dialog (like a modal) is open, all interactive elements _behind_ it in the UI should be disabled and unreachable by keyboard navigation or screen readers. This creates a true modal experience.

### Solution

Use `tree.applyToNodes` with `{ relationship: 'all-except-branch' }` to apply the `inert` attribute to all elements that are not part of the currently active floating branch. Remember to remove `inert` when the modal closes.

### Code Snippet

```vue
<script setup lang="ts">
import { useFloatingTree, useEscapeKey } from "v-float"
import { ref, watchEffect, onUnmounted } from "vue"

// Setup application with multiple floating elements
const isMenuOpen = ref(false)
const menuAnchorEl = ref<HTMLElement | null>(null)
const menuFloatingEl = ref<HTMLElement | null>(null)

const menuTree = useFloatingTree()
const menuRoot = menuTree.addNode(menuAnchorEl, menuFloatingEl, {
  placement: "bottom-start",
  open: isMenuOpen,
})

// Setup modal dialog
const isModalOpen = ref(false)
const modalAnchorEl = ref<HTMLElement | null>(null)
const modalFloatingEl = ref<HTMLElement | null>(null)

const modalTree = useFloatingTree()
const modalRoot = modalTree.addNode(modalAnchorEl, modalFloatingEl, {
  placement: "center",
  open: isModalOpen,
  strategy: "fixed",
})

// Track affected elements for cleanup
const inertElements = ref<Set<HTMLElement>>(new Set())

watchEffect(() => {
  if (isModalOpen.value) {
    // Apply inert to all elements except the modal
    const allElements = document.querySelectorAll('*')
    
    allElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      
      // Skip if element is part of modal tree
      const isModalElement = modalFloatingEl.value?.contains(htmlElement) ||
                           modalAnchorEl.value?.contains(htmlElement)
      
      if (!isModalElement && htmlElement !== document.body && htmlElement !== document.documentElement) {
        htmlElement.setAttribute('inert', '')
        inertElements.value.add(htmlElement)
      }
    })
  } else {
    // Remove inert from all affected elements
    inertElements.value.forEach((element) => {
      element.removeAttribute('inert')
    })
    inertElements.value.clear()
  }
})

// Enhanced escape key handling for modal priority
useEscapeKey({
  onEscape() {
    if (isModalOpen.value) {
      isModalOpen.value = false
    } else {
      // Handle other floating elements
      const topmostNode = menuTree.getDeepestOpenNode()
      if (topmostNode) {
        topmostNode.data.setOpen(false)
      }
    }
  },
})

// Cleanup
onUnmounted(() => {
  menuTree.dispose()
  modalTree.dispose()
  inertElements.value.forEach((element) => {
    element.removeAttribute('inert')
  })
})
</script>

<template>
  <!-- Regular menu -->
  <button ref="menuAnchorEl" @click="isMenuOpen = !isMenuOpen">
    Open Menu
  </button>
  
  <div v-if="isMenuOpen" ref="menuFloatingEl" :style="menuRoot!.data.floatingStyles">
    <div>Regular Menu Content</div>
    <button ref="modalAnchorEl" @click="isModalOpen = true">
      Open Modal
    </button>
  </div>
  
  <!-- Modal dialog -->
  <div v-if="isModalOpen" ref="modalFloatingEl" :style="modalRoot!.data.floatingStyles">
    <div class="modal-backdrop">
      <div class="modal-content">
        <h2>Critical Dialog</h2>
        <p>This modal blocks interaction with everything else.</p>
        <button @click="isModalOpen = false">Close Modal</button>
      </div>
    </div>
  </div>
</template>

<style>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90vw;
}
</style>
```

This recipe demonstrates a powerful pattern for creating true modal experiences. The `inert` attribute ensures that elements behind the modal are completely inaccessible to keyboard navigation and screen readers, providing a proper modal experience that meets accessibility standards.
