# useEscapeKey

The `useEscapeKey` composable provides a simple and robust way to handle Escape key press events with tree-aware behavior and composition support. This is essential for implementing keyboard dismissal behavior in floating UI components like modals, dropdowns, and popovers.

It follows the same API pattern as other interaction composables, accepting either a [`FloatingContext`](/api/use-floating) or `TreeNode<FloatingContext>` as the first parameter and automatically handling the appropriate close behavior.

## Basic Usage

### Standalone Floating Element

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useEscapeKey } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Automatically closes the floating element when Escape key is pressed
useEscapeKey(context)
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
    Open Modal
  </button>

  <div v-if="context.open.value" ref="floatingRef" :style="{ ...context.floatingStyles }">
    Press Escape to close this modal
  </div>
</template>
```

### Tree-Aware Usage

When used with nested floating elements in a tree structure, `useEscapeKey` automatically closes the topmost (deepest) open node:

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloatingTree, useEscapeKey } from "v-float"

const rootAnchorRef = ref<HTMLElement | null>(null)
const rootFloatingRef = ref<HTMLElement | null>(null)
const submenuAnchorRef = ref<HTMLElement | null>(null)
const submenuFloatingRef = ref<HTMLElement | null>(null)

// Create tree with root menu
const tree = useFloatingTree(rootAnchorRef, rootFloatingRef)

// Add submenu to the tree
const submenuNode = tree.addNode(submenuAnchorRef, submenuFloatingRef, {
  parentId: tree.root.id
})

// Tree-aware behavior: closes the deepest open menu first
useEscapeKey(tree.root)     // Works for root
useEscapeKey(submenuNode)   // Works for submenu - closes topmost open
</script>

<template>
  <!-- Root menu -->
  <button ref="rootAnchorRef" @click="tree.root.data.setOpen(true)">
    Open Menu
  </button>
  
  <div v-if="tree.root.data.open.value" ref="rootFloatingRef">
    <button ref="submenuAnchorRef" @click="submenuNode.data.setOpen(true)">
      Open Submenu
    </button>
  </div>

  <!-- Submenu -->
  <div v-if="submenuNode.data.open.value" ref="submenuFloatingRef">
    <p>Press Escape to close this submenu first, then the root menu</p>
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useEscapeKey(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseEscapeKeyOptions
): void
```

| Parameter | Type                                          | Description                                                                    |
| --------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| context   | `FloatingContext \| TreeNode<FloatingContext>` | The floating context or tree node to control.                                |
| options   | `UseEscapeKeyOptions`                         | Configuration options for the escape key behavior.                            |

### Options (`UseEscapeKeyOptions`)

| Option    | Type                                | Default | Description                                                                              |
| --------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| enabled   | `MaybeRefOrGetter<boolean>`         | `true`  | Condition to enable the escape key listener.                                             |
| capture   | `boolean`                          | `false` | Whether to use capture phase for document event listeners.                               |
| onEscape  | `(event: KeyboardEvent) => void`   | *optional* | Custom callback function to override default behavior.                     |

### Return Value

`useEscapeKey` returns `void`. It performs its actions by attaching a keydown event listener to the document.

## Features

### Default Behavior

The composable provides intelligent default behavior based on the context type:

- **Standalone Context**: Automatically calls `setOpen(false)` on the floating context
- **Tree Context**: Finds and closes the topmost (deepest) open node in the tree hierarchy

```vue
<script setup>
import { useFloating, useEscapeKey } from "v-float"

const context = useFloating(anchorRef, floatingRef)

// Simple usage - no configuration needed
useEscapeKey(context) // Automatically closes on escape
</script>
```

### Tree-Aware Behavior

When working with nested floating elements, the composable intelligently closes the deepest open element first:

```vue
<script setup>
import { useFloatingTree, useEscapeKey } from "v-float"

const tree = useFloatingTree(rootAnchor, rootFloating)
const level1 = tree.addNode(anchor1, floating1, { parentId: tree.root.id })
const level2 = tree.addNode(anchor2, floating2, { parentId: level1.id })

// Any of these will close the deepest open element first
useEscapeKey(tree.root)
useEscapeKey(level1)
useEscapeKey(level2)
</script>
```

### Composition Event Handling

The composable automatically handles composition events (like IME input) to prevent unwanted Escape key triggers during text composition:

```vue
<script setup>
import { ref } from "vue"
import { useEscapeKey } from "v-float"

const isModalOpen = ref(false)

// Escape key won't trigger during text composition (e.g., when typing in Chinese, Japanese, Korean)
useEscapeKey({
  enabled: isModalOpen,
  onEscape: () => {
    console.log('Escape pressed - composition safe!')
    isModalOpen.value = false
  }
})
</script>

<template>
  <button @click="isModalOpen = true">Open Modal</button>
  
  <div v-if="isModalOpen" class="modal">
    <input placeholder="Try typing with IME - Escape won't close during composition" />
    <button @click="isModalOpen = false">Close</button>
  </div>
</template>
```

### Conditional Enabling

You can dynamically enable or disable the escape key listener:

```vue
<script setup>
import { ref, computed } from "vue"
import { useEscapeKey } from "v-float"

const isModalOpen = ref(false)
const allowEscapeClose = ref(true)

// Only enable escape key when both modal is open and escape is allowed
useEscapeKey({
  enabled: computed(() => isModalOpen.value && allowEscapeClose.value),
  onEscape: () => isModalOpen.value = false
})
</script>

<template>
  <div>
    <button @click="isModalOpen = true">Open Modal</button>
    
    <label>
      <input v-model="allowEscapeClose" type="checkbox" />
      Allow Escape key to close
    </label>
  </div>

  <div v-if="isModalOpen" class="modal">
    <p>Modal content</p>
    <p v-if="!allowEscapeClose">Escape key is disabled</p>
    <button @click="isModalOpen = false">Close</button>
  </div>
</template>
```

### Custom Event Handling

You can implement custom logic when the Escape key is pressed:

```vue
<script setup>
import { ref } from "vue"
import { useEscapeKey } from "v-float"

const isModalOpen = ref(false)
const hasUnsavedChanges = ref(false)
const showConfirmDialog = ref(false)

useEscapeKey({
  enabled: isModalOpen,
  onEscape: (event) => {
    if (hasUnsavedChanges.value) {
      // Show confirmation dialog instead of closing immediately
      showConfirmDialog.value = true
      event.preventDefault() // Prevent default browser behavior
    } else {
      isModalOpen.value = false
    }
  }
})

const confirmClose = () => {
  hasUnsavedChanges.value = false
  showConfirmDialog.value = false
  isModalOpen.value = false
}

const cancelClose = () => {
  showConfirmDialog.value = false
}
</script>

<template>
  <button @click="isModalOpen = true">Open Editor</button>

  <div v-if="isModalOpen" class="modal">
    <textarea 
      v-model="content" 
      @input="hasUnsavedChanges = true"
      placeholder="Start typing to create unsaved changes..."
    ></textarea>
    
    <div v-if="hasUnsavedChanges" class="warning">
      You have unsaved changes
    </div>
    
    <button @click="isModalOpen = false">Close</button>
  </div>

  <!-- Confirmation dialog -->
  <div v-if="showConfirmDialog" class="confirm-dialog">
    <p>You have unsaved changes. Are you sure you want to close?</p>
    <button @click="confirmClose">Yes, close</button>
    <button @click="cancelClose">Cancel</button>
  </div>
</template>
```

### Event Capture

You can enable event capture to handle the Escape key before other event listeners:

```vue
<script setup>
import { ref } from "vue"
import { useEscapeKey } from "v-float"

const isModalOpen = ref(false)

// Use capture phase to handle escape before other listeners
useEscapeKey({
  enabled: isModalOpen,
  capture: true,
  onEscape: (event) => {
    console.log('Handling escape in capture phase')
    isModalOpen.value = false
    event.stopPropagation() // Prevent other escape handlers
  }
})
</script>

<template>
  <button @click="isModalOpen = true">Open Modal</button>
  
  <div v-if="isModalOpen" class="modal">
    <p>This modal captures escape events before other handlers</p>
    <button @click="isModalOpen = false">Close</button>
  </div>
</template>
```

## Integration with Other Interactions

`useEscapeKey` works seamlessly with other interaction composables to provide comprehensive dismissal options:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useHover, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Multiple ways to interact with the floating element
useClick(context)        // Click to toggle
useHover(context)        // Hover to show/hide
useEscapeKey(context)    // Press Escape to close
</script>

<template>
  <button ref="referenceRef">
    Hover or click to toggle
  </button>
  
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    <p>You can close this by:</p>
    <ul>
      <li>Clicking the button again</li>
      <li>Moving mouse away (hover out)</li>
      <li>Pressing the Escape key</li>
    </ul>
  </div>
</template>
```

## Common Patterns

### Modal Dialog

```vue
<script setup>
import { ref, nextTick } from "vue"
import { useEscapeKey } from "v-float"

const isModalOpen = ref(false)
const modalRef = ref(null)

useEscapeKey({
  enabled: isModalOpen,
  onEscape: () => closeModal()
})

const openModal = async () => {
  isModalOpen.value = true
  await nextTick()
  // Focus the modal for better accessibility
  modalRef.value?.focus()
}

const closeModal = () => {
  isModalOpen.value = false
}
</script>

<template>
  <button @click="openModal">Open Modal</button>
  
  <Teleport to="body">
    <div v-if="isModalOpen" class="modal-backdrop">
      <div 
        ref="modalRef"
        class="modal"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @keydown.esc="closeModal"
      >
        <h2>Modal Title</h2>
        <p>Press Escape or click the close button to dismiss.</p>
        <button @click="closeModal">Close</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  outline: none;
}
</style>
```

### Nested Modals

```vue
<script setup>
import { ref } from "vue"
import { useEscapeKey } from "v-float"

const modals = ref<string[]>([])

// Close the topmost modal when escape is pressed
useEscapeKey({
  enabled: computed(() => modals.value.length > 0),
  onEscape: () => {
    if (modals.value.length > 0) {
      modals.value.pop()
    }
  }
})

const openModal = (modalId: string) => {
  modals.value.push(modalId)
}

const closeModal = (modalId: string) => {
  const index = modals.value.indexOf(modalId)
  if (index > -1) {
    modals.value.splice(index, 1)
  }
}

const isModalOpen = (modalId: string) => {
  return modals.value.includes(modalId)
}
</script>

<template>
  <button @click="openModal('first')">Open First Modal</button>
  
  <!-- First Modal -->
  <div v-if="isModalOpen('first')" class="modal-backdrop">
    <div class="modal">
      <h2>First Modal</h2>
      <button @click="openModal('second')">Open Second Modal</button>
      <button @click="closeModal('first')">Close</button>
    </div>
  </div>
  
  <!-- Second Modal -->
  <div v-if="isModalOpen('second')" class="modal-backdrop">
    <div class="modal">
      <h2>Second Modal</h2>
      <p>Press Escape to close this modal first</p>
      <button @click="closeModal('second')">Close</button>
    </div>
  </div>
</template>
```

### Dropdown with Escape Support

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start"
})

useClick(context)
useEscapeKey({
  enabled: context.open,
  onEscape: () => {
    context.setOpen(false)
    // Return focus to the trigger button
    referenceRef.value?.focus()
  }
})
</script>

<template>
  <button 
    ref="referenceRef" 
    :aria-expanded="context.open.value"
    aria-haspopup="menu"
  >
    Menu ▼
  </button>
  
  <ul 
    v-if="context.open.value" 
    ref="floatingRef" 
    :style="context.floatingStyles"
    role="menu"
  >
    <li role="menuitem">
      <button @click="context.setOpen(false)">Item 1</button>
    </li>
    <li role="menuitem">
      <button @click="context.setOpen(false)">Item 2</button>
    </li>
    <li role="menuitem">
      <button @click="context.setOpen(false)">Item 3</button>
    </li>
  </ul>
</template>
```

## Accessibility Considerations

- **Keyboard Navigation**: Essential for keyboard-only users who need an easy way to dismiss floating elements
- **Focus Management**: Consider returning focus to appropriate elements when dismissing
- **Screen Readers**: Escape key behavior is expected and understood by screen reader users
- **ARIA**: Works well with ARIA patterns for modals, menus, and other dismissible components

## Browser Compatibility

- **Modern Browsers**: Full support in all modern browsers
- **Composition Events**: Automatically handled for proper IME support
- **Event Capture**: Configurable capture phase support for advanced use cases

## Related Composables

- [`useOutsideClick`](/api/use-outside-click) - For dismissing with outside clicks
- [`useClick`](/api/use-click) - For toggling floating elements with click interactions
- [`useFocus`](/api/use-focus) - For focus-based interactions
- [`useHover`](/api/use-hover) - For hover-based interactions