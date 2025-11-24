# useClick

The `useClick` composable attaches click handlers for opening/toggling a floating element and optional outside-click dismissal. Works with either a `FloatingContext` or a `TreeNode<FloatingContext>` for tree-aware behavior.

## Signature

```ts
function useClick(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseClickOptions
): void
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Floating context or tree node to control. |
| options | `UseClickOptions` | No | Configuration options. |

## Options

```ts
interface UseClickOptions {
  enabled?: MaybeRefOrGetter<boolean>
  event?: MaybeRefOrGetter<'click' | 'mousedown'>
  toggle?: MaybeRefOrGetter<boolean>
  ignoreMouse?: MaybeRefOrGetter<boolean>
  ignoreKeyboard?: MaybeRefOrGetter<boolean>
  ignoreTouch?: MaybeRefOrGetter<boolean>
  outsideClick?: MaybeRefOrGetter<boolean>
  outsideEvent?: MaybeRefOrGetter<'pointerdown' | 'mousedown' | 'click'>
  outsideCapture?: MaybeRefOrGetter<boolean>
  onOutsideClick?: (event: MouseEvent) => void
  preventScrollbarClick?: MaybeRefOrGetter<boolean>
  handleDragEvents?: MaybeRefOrGetter<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable click interaction. |
| event | `MaybeRefOrGetter<'click' \| 'mousedown'>` | `'click'` | Inside click trigger event. |
| toggle | `MaybeRefOrGetter<boolean>` | `true` | Toggle open state on reference click. |
| ignoreMouse | `MaybeRefOrGetter<boolean>` | `false` | Ignore mouse events. |
| ignoreKeyboard | `MaybeRefOrGetter<boolean>` | `false` | Ignore Enter/Space keyboard activation. |
| ignoreTouch | `MaybeRefOrGetter<boolean>` | `false` | Ignore touch events. |
| outsideClick | `MaybeRefOrGetter<boolean>` | `false` | Enable outside-click dismissal. |
| outsideEvent | `MaybeRefOrGetter<'pointerdown' \| 'mousedown' \| 'click'>` | `'pointerdown'` | Event used for outside detection. |
| outsideCapture | `MaybeRefOrGetter<boolean>` | `true` | Use capture phase for outside listener. |
| onOutsideClick | `(event: MouseEvent) => void` | `undefined` | Custom outside-click handler. |
| preventScrollbarClick | `MaybeRefOrGetter<boolean>` | `true` | Ignore scrollbar clicks. |
| handleDragEvents | `MaybeRefOrGetter<boolean>` | `true` | Handle drag-in/out sequences. |

## Return Value

`void` — listeners are attached for you.

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const context = useFloating(referenceRef, floatingRef)
useClick(context)
</script>
```

### With Outside Click

```vue
<script setup lang="ts">
useClick(context, { outsideClick: true, outsideEvent: 'pointerdown' })
</script>
```

## See Also

- [useEscapeKey](/api/use-escape-key)
- [useFocus](/api/use-focus)
- [useFloatingTree](/api/use-floating-tree)

## Additional Details

## Tree-Aware Usage (Enhanced)

The `useClick` composable now supports tree-aware behavior for complex nested floating UI structures. This is particularly useful for menus with submenus where child elements are teleported to different DOM locations.

### Key Tree-Aware Behaviors

- **Descendant Protection**: A floating node does NOT close when any of its descendants are clicked
- **Ancestral Authority**: A floating node DOES close when any of its ancestors/parents are clicked  
- **Outside Closure**: A floating node closes when clicked outside the entire tree
- **Sibling Isolation**: A floating node closes when any sibling nodes are clicked

### Basic Tree-Aware Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useFloatingTree, useClick } from "v-float"

const menuTriggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const submenuTriggerRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)

// Create floating contexts
const menuContext = useFloating(menuTriggerRef, menuRef)
const submenuContext = useFloating(submenuTriggerRef, submenuRef)

// Create tree structure
const tree = useFloatingTree(menuContext)
const menuNode = tree.root
const submenuNode = tree.addNode(submenuContext, menuNode.id)

// Tree-aware click handling
useClick(menuNode, { outsideClick: true }) // Closes when: outside, siblings clicked
useClick(submenuNode, { outsideClick: true }) // Closes when: outside, siblings, parent clicked
</script>

<template>
  <!-- Root Menu -->
  <button ref="menuTriggerRef">Menu</button>
  <Teleport to="body">
    <div v-if="menuContext.open.value" ref="menuRef" :style="menuContext.floatingStyles.value">
      <div ref="submenuTriggerRef">Item with Submenu</div>
    </div>
  </Teleport>

  <!-- Submenu (Teleported) -->
  <Teleport to="body">
    <div v-if="submenuContext.open.value" ref="submenuRef" :style="submenuContext.floatingStyles.value">
      <div>Submenu Item 1</div>
      <div>Submenu Item 2</div>
    </div>
  </Teleport>
</template>
```

### Tree-Aware Behavior Examples

Consider a three-level menu hierarchy: **Root Menu** → **Submenu** → **Sub-submenu**

| Action             | Root Menu     | Submenu       | Sub-submenu   | Explanation                           |
| ------------------ | ------------- | ------------- | ------------- | ------------------------------------- |
| Click Sub-submenu  | Open          | Open          | Handles Click | Descendants don't affect ancestors    |
| Click Submenu      | Open          | Handles Click | **Closes**    | Parent click closes descendants       |
| Click Root Menu    | Handles Click | **Closes**    | **Closes**    | Ancestor click closes all descendants |
| Click Outside      | **Closes**    | **Closes**    | **Closes**    | Outside click closes entire tree      |
| Click Sibling Menu | **Closes**    | **Closes**    | **Closes**    | Sibling interaction closes tree       |

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Create click interaction (inside clicks only)
useClick(context)
</script>

<template>
  <button ref="referenceRef">Click Me</button>

  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles.value">
    This element appears when the button is clicked
  </div>
</template>
```

## Outside Click Support

The `useClick` composable now includes built-in support for outside click detection, eliminating the need for a separate `useOutsideClick` composable:

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Enable both inside and outside click handling
useClick(context, {
  outsideClick: true, // Enable outside click to close
  outsideEvent: 'pointerdown' // Use pointerdown for outside detection
})
</script>

<template>
  <button ref="referenceRef">Click Me</button>

  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles.value">
    Click outside to close this element
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useClick(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseClickOptions
): void // useClick directly attaches event listeners and returns void
```

| Parameter | Type                                                   | Description                                                                    |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| context   | `FloatingContext \| TreeNode<FloatingContext>`         | The context object from `useFloating` or tree node from `useFloatingTree`.     |
| options   | `UseClickOptions` (see below)                          | Optional configuration for the click behavior.                                 |

**Context Parameter Behavior:**
- `FloatingContext`: Enables standalone usage with standard DOM containment checks
- `TreeNode<FloatingContext>`: Enables tree-aware usage with hierarchical click behavior for nested floating elements

### Options (`UseClickOptions`)

The `useClick` composable accepts several options to customize its behavior. These options can be reactive (e.g., a `Ref`).

| Option                 | Type                                        | Default        | Description                                                                              |
| ---------------------- | ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| **Inside Click Options** |                                           |                |                                                                                          |
| enabled                | `MaybeRefOrGetter<boolean>`                 | `true`         | Whether the click interaction is enabled.                                                |
| event                  | `MaybeRefOrGetter<'click' \| 'mousedown'>`   | `'click'`      | The mouse event that triggers the interaction. Keyboard clicks are handled separately.   |
| toggle                 | `MaybeRefOrGetter<boolean>`                 | `true`         | Whether clicking the reference element toggles the floating element's open state.        |
| ignoreMouse            | `MaybeRefOrGetter<boolean>`                 | `false`        | If `true`, mouse events will be ignored.                                                 |
| ignoreKeyboard         | `MaybeRefOrGetter<boolean>`                 | `false`        | If `true`, keyboard events (`Enter` and `Space`) will be ignored.                        |
| ignoreTouch            | `MaybeRefOrGetter<boolean>`                 | `false`        | If `true`, touch events will be ignored.                                                 |
| **Outside Click Options** |                                          |                |                                                                                          |
| outsideClick           | `MaybeRefOrGetter<boolean>`                 | `false`        | Whether to enable outside click detection to close the floating element.                 |
| outsideEvent           | `MaybeRefOrGetter<'pointerdown' \| 'mousedown' \| 'click'>` | `'pointerdown'` | The event to use for outside click detection.                                            |
| outsideCapture         | `MaybeRefOrGetter<boolean>`                 | `true`         | Whether to use capture phase for document outside click listener.                        |
| onOutsideClick         | `(event: MouseEvent) => void` | `undefined`    | Custom function to handle outside clicks instead of default behavior.                    |
| preventScrollbarClick  | `MaybeRefOrGetter<boolean>`                 | `true`         | Whether to prevent clicks on scrollbars from triggering outside click.                   |
| handleDragEvents       | `MaybeRefOrGetter<boolean>`                 | `true`         | Whether to handle drag events that start inside and end outside.                         |

(Note: `MaybeRefOrGetter<T>` means the value can be `T`, `Ref<T>`, or a getter function `() => T`.)

### Return Value

`useClick` returns `void`. It performs its actions by attaching event listeners to the reference element obtained from the `FloatingContext`.

## Customizing Click Behavior

### Changing the Triggering Event

By default, `useClick` uses the 'click' event, but you can change it to 'mousedown' or 'mouseup' for different behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Trigger on mousedown instead of click.
// useClick directly attaches event listeners to the reference element.
useClick(context, {
  event: "mousedown",
})

// ARIA attributes and other non-event props should be handled manually or by other composables.
// For example:
// :aria-expanded="isOpen"
// :aria-controls="floatingId" (if floating element has an ID)
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Trigger on mousedown
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

Using 'mousedown' can make the interaction feel more responsive since it triggers before the user releases the mouse button.

### Disabling Toggle Behavior

By default, clicking the reference element toggles the floating element (showing it if hidden and hiding it if shown). You can disable this toggle behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Disable toggle behavior (clicking again won't close if already open)
// useClick directly attaches event listeners.
useClick(context, {
  toggle: false,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Clicking again won't close
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

This is useful when you want clicking the reference element to only open the floating element, and closing requires another action (like clicking a close button or outside the element).

### Ignoring Mouse Clicks

For touch interfaces, you might want to handle touch events differently from mouse events:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore mouse clicks (only keyboard or programmatic opening through isOpen ref)
// useClick directly attaches event listeners.
useClick(context, {
  ignoreMouse: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Mouse clicks ignored (try keyboard)
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

This is useful when combining with other interaction methods or when creating touch-specific interfaces.

### Ignoring Touch Events

You can also ignore touch events, which can be useful when you want to handle touch and mouse interactions differently.

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore touch events
useClick(context, {
  ignoreTouch: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Touch events ignored
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```
This is useful when you want to implement custom touch interactions, like swipe gestures, without triggering a click.

## Outside Click Configuration

The `useClick` composable now includes comprehensive outside click detection, providing a unified solution for both opening and closing floating elements.

### Basic Outside Click

Enable outside click detection to automatically close the floating element when clicking outside:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Enable outside click detection
useClick(context, {
  outsideClick: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Click me, then click outside
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Click outside this element to close it
  </div>
</template>
```

### Custom Outside Click Handler

Provide a custom handler for outside clicks instead of the default closing behavior:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Custom outside click handler
function handleOutsideClick(event) {
  console.log('Outside click detected', event)
  // You can implement custom logic here
  if (confirm('Close the floating element?')) {
    context.setOpen(false)
  }
}

useClick(context, {
  outsideClick: true,
  onOutsideClick: handleOutsideClick,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Custom outside click handler
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Outside clicks will show a confirmation dialog
  </div>
</template>
```

### Outside Click Event Types

Choose different event types for outside click detection:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use mousedown for faster response
useClick(context, {
  outsideClick: true,
  outsideEvent: 'mousedown', // More responsive than 'click'
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Fast outside click detection
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Closes on mousedown outside
  </div>
</template>
```

### Scrollbar Click Prevention

By default, clicking on scrollbars is ignored to prevent unintentional closing:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Disable scrollbar click prevention (not recommended)
useClick(context, {
  outsideClick: true,
  preventScrollbarClick: false, // Scrollbar clicks will close the element
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Scrollbar clicks enabled
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Even scrollbar clicks will close this
  </div>
</template>
```

### Dynamic Outside Click Control

Enable or disable outside click detection dynamically:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)
const outsideClickEnabled = ref(true)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Reactive outside click control
useClick(context, {
  outsideClick: outsideClickEnabled,
})

function toggleOutsideClick() {
  outsideClickEnabled.value = !outsideClickEnabled.value
}
</script>
<template>
  <div>
    <button ref="referenceRef" :aria-expanded="isOpen.value">
      Open floating element
    </button>
    <button @click="toggleOutsideClick">
      {{ outsideClickEnabled ? 'Disable' : 'Enable' }} outside click
    </button>
    <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
      Outside click is {{ outsideClickEnabled ? 'enabled' : 'disabled' }}
    </div>
  </div>
</template>
```

## Migration from useOutsideClick

If you were previously using the separate `useOutsideClick` composable, here's how to migrate:

### Before (using separate composables)

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useOutsideClick } from "v-float"

const context = useFloating(referenceRef, floatingRef)

// Separate composables
useClick(context, { toggle: true })
useOutsideClick(context, {
  enabled: true,
  onOutsideClick: (event) => console.log('Outside click'),
})
</script>
```

### After (unified composable)

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const context = useFloating(referenceRef, floatingRef)

// Unified composable
useClick(context, {
  toggle: true,
  outsideClick: true,
  onOutsideClick: (event) => console.log('Outside click'),
})
</script>
```

### Ignoring Keyboard Handlers

By default, `useClick` handles keyboard events (`Enter` and `Space`) for accessibility. You can ignore this behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore keyboard handling (Enter/Space keys won't trigger)
useClick(context, {
  ignoreKeyboard: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Keyboard handlers ignored
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

However, ignoring keyboard handlers is generally not recommended for accessibility reasons unless you provide an alternative way to interact with the component.

## Combining with Other Interactions

`useClick` is commonly combined with other interaction composables, especially for accessible UI components:

```vue
<script setup>
import { ref } from "vue"; // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick, useEscapeKey /*, useRole */ } from "v-float";
// Note: useInteractions and prop-getters like getReferenceProps are not returned by
// v-float's useClick or useDismiss as per current source.
// Event listeners are attached directly. ARIA props need manual binding or a separate utility.

const isOpen = ref(false);
const referenceRef = ref(null);
const floatingRef = ref(null);
const floatingId = "my-floating-element"; // Example ID for ARIA

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
});

// useClick sets up click listeners on the reference element.
useClick(context);

// useEscapeKey sets up escape key listener.
useEscapeKey(context, {
  onEscape: () => {
    isOpen.value = false;
  }
});

// If a useRole composable exists and provides ARIA logic, it would be used here.
// For now, ARIA attributes are shown manually in the template.
</script>
<template>
  <button
    ref="referenceRef"
    :aria-expanded="isOpen.value"
    :aria-controls="floatingId"
    aria-haspopup="dialog"
  >
    Toggle Dialog
  </button>
  <div
    v-if="isOpen.value"
    :id="floatingId"
    ref="floatingRef"
    :style="context.floatingStyles.value"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title" /* Assuming a title element exists */
  >
    <h2 id="dialog-title">Dialog</h2>
    <p>Content... Click outside or press Esc to dismiss (if useEscapeKey is configured).</p>
    <button @click="isOpen.value = false">Close</button>
  </div>
</template>
```

This creates a dialog that opens when the reference element is clicked, closes when clicking outside, and has proper ARIA attributes.

## Example: Nested Menu with Tree-Aware Behavior

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFloatingTree, useClick, offset, flip, shift } from "v-float"

const menuItems = [
  { label: "Edit", hasSubmenu: false },
  { label: "View", hasSubmenu: true },
  { label: "Insert", hasSubmenu: true },
  { label: "Help", hasSubmenu: false },
]

const viewSubmenuItems = [
  { label: "Zoom In" },
  { label: "Zoom Out" },
  { label: "Full Screen" },
]

const insertSubmenuItems = [
  { label: "Image" },
  { label: "Table" },
  { label: "Link" },
]

// Main menu setup
const menuTriggerRef = ref(null)
const menuRef = ref(null)
const menuContext = useFloating(menuTriggerRef, menuRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
})

// View submenu setup
const viewTriggerRef = ref(null)
const viewSubmenuRef = ref(null)
const viewSubmenuContext = useFloating(viewTriggerRef, viewSubmenuRef, {
  placement: "right-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
})

// Insert submenu setup
const insertTriggerRef = ref(null)
const insertSubmenuRef = ref(null)
const insertSubmenuContext = useFloating(insertTriggerRef, insertSubmenuRef, {
  placement: "right-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
})

// Create tree structure
const tree = useFloatingTree()
const menuNode = tree.addNode(menuContext)
const viewSubmenuNode = tree.addNode(viewSubmenuContext, menuNode.id)
const insertSubmenuNode = tree.addNode(insertSubmenuContext, menuNode.id)

// Tree-aware click handling
// - Main menu closes when clicked outside or on sibling elements
// - Submenus close when parent menu items are clicked or when clicked outside
// - Submenus do NOT close when their own items are clicked
useClick(menuNode, { outsideClick: true })
useClick(viewSubmenuNode, { outsideClick: true })
useClick(insertSubmenuNode, { outsideClick: true })

function openViewSubmenu() {
  // Close other submenus when opening this one
  insertSubmenuContext.setOpen(false)
  viewSubmenuContext.setOpen(true)
}

function openInsertSubmenu() {
  // Close other submenus when opening this one
  viewSubmenuContext.setOpen(false)
  insertSubmenuContext.setOpen(true)
}

function selectMenuItem(item) {
  console.log('Selected:', item.label)
  // Close all menus
  menuContext.setOpen(false)
  viewSubmenuContext.setOpen(false)
  insertSubmenuContext.setOpen(false)
}
</script>

<template>
  <button ref="menuTriggerRef" class="menu-trigger">
    Context Menu
  </button>

  <!-- Main Menu -->
  <Teleport to="body">
    <div
      v-if="menuContext.open.value"
      ref="menuRef"
      :style="menuContext.floatingStyles.value"
      class="menu"
    >
      <div
        v-for="item in menuItems"
        :key="item.label"
        :ref="item.label === 'View' ? viewTriggerRef : item.label === 'Insert' ? insertTriggerRef : null"
        class="menu-item"
        :class="{ 'has-submenu': item.hasSubmenu }"
        @click="item.hasSubmenu ? 
          (item.label === 'View' ? openViewSubmenu() : openInsertSubmenu()) : 
          selectMenuItem(item)"
        @mouseenter="item.hasSubmenu ? 
          (item.label === 'View' ? openViewSubmenu() : openInsertSubmenu()) : 
          null"
      >
        {{ item.label }}
        <span v-if="item.hasSubmenu" class="submenu-arrow">▶</span>
      </div>
    </div>
  </Teleport>

  <!-- View Submenu -->
  <Teleport to="body">
    <div
      v-if="viewSubmenuContext.open.value"
      ref="viewSubmenuRef"
      :style="viewSubmenuContext.floatingStyles.value"
      class="menu submenu"
    >
      <div
        v-for="item in viewSubmenuItems"
        :key="item.label"
        class="menu-item"
        @click="selectMenuItem(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </Teleport>

  <!-- Insert Submenu -->
  <Teleport to="body">
    <div
      v-if="insertSubmenuContext.open.value"
      ref="insertSubmenuRef"
      :style="insertSubmenuContext.floatingStyles.value"
      class="menu submenu"
    >
      <div
        v-for="item in insertSubmenuItems"
        :key="item.label"
        class="menu-item"
        @click="selectMenuItem(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.menu-trigger {
  padding: 8px 16px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 100;
}

.submenu {
  z-index: 101;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-item:hover {
  background-color: #f0f0f0;
}

.menu-item.has-submenu {
  position: relative;
}

.submenu-arrow {
  font-size: 10px;
  color: #666;
}
</style>
```

## Migration from Standalone to Tree-Aware

If you have existing dropdown/menu components that experience issues with nested teleported elements, here's how to migrate:

### Before (Standalone - may have issues with nested menus)

```vue
<script setup>
import { useFloating, useClick } from "v-float"

// This approach may incorrectly close parent menus when child menus are clicked
const parentContext = useFloating(parentRef, parentFloatingRef)
const childContext = useFloating(childRef, childFloatingRef)

useClick(parentContext, { outsideClick: true })
useClick(childContext, { outsideClick: true }) // May conflict with parent
</script>
```

### After (Tree-Aware - coordinated behavior)

```vue
<script setup>
import { useFloating, useFloatingTree, useClick } from "v-float"

// Tree-aware approach provides coordinated behavior
const parentContext = useFloating(parentRef, parentFloatingRef)
const childContext = useFloating(childRef, childFloatingRef)

const tree = useFloatingTree()
const parentNode = tree.addNode(parentContext)
const childNode = tree.addNode(childContext, parentNode.id)

useClick(parentNode, { outsideClick: true }) // Coordinates with children
useClick(childNode, { outsideClick: true }) // Aware of parent relationship
</script>
```

## Example: Dropdown Menu

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useClick,
  useEscapeKey,
  useRole,
  useListNavigation,
  offset,
  flip,
  shift,
} from "v-float"

const items = [
  { label: "Edit", action: () => console.log("Edit clicked") },
  { label: "Duplicate", action: () => console.log("Duplicate clicked") },
  { label: "Delete", action: () => console.log("Delete clicked") },
  { label: "Export", action: () => console.log("Export clicked") },
]

const referenceRef = ref(null)
const floatingRef = ref(null)
const listRef = ref([])
const isOpen = ref(false)
const activeIndex = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Click to open the dropdown
const click = useClick(context)

// Close when pressing escape
const escapeKey = useEscapeKey(context, {
  onEscape: () => context.setOpen(false)
})

// Set ARIA attributes
const role = useRole(context, { role: "menu" })

// Handle keyboard navigation
const listNav = useListNavigation(context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index
  },
  loop: true,
})

// Event listeners from useClick, useEscapeKey are attached directly.
// ARIA roles from useRole would need manual application or its own prop mechanism.
// useListNavigation typically provides getItemProps or similar for list items.
// Since useInteractions is not available in v-float as per source,
// props need to be managed differently.

// Example: useClick sets up listeners on referenceRef
// Example: useEscapeKey sets up its listeners
// Example: useRole would mean manually adding role attributes or using its specific return.
// Example: listNav might return getItemProps, which would be bound manually.

// For simplicity, this example will focus on click and manual ARIA.
// The full complexity of combining these without useInteractions is beyond this specific example.

// Track item elements for list navigation (assuming listRef is used by useListNavigation)
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el)
  }
}

// Execute action when item is clicked
function selectItem(index) {
  items[index].action()
  isOpen.value = false
}
</script>

<template>
  <button
    ref="referenceRef"
    <!-- getReferenceProps() from useInteractions is not used here -->
    <!-- Event listeners for click are attached by useClick(context) -->
    aria-haspopup="menu"
    :aria-expanded="isOpen.value"
    class="dropdown-button"
  >
    Actions
    <span class="dropdown-icon">▼</span>
  </button>

  <div
    v-if="isOpen.value"
    ref="floatingRef"
    <!-- getFloatingProps() from useInteractions is not used here -->
    :style="context.floatingStyles.value"
    role="menu" <!-- Assuming useRole would handle this, or it's manual -->
    class="dropdown-menu"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      <!-- getItemProps() from useListNavigation would be bound here if available and useInteractions wasn't used -->
      role="menuitem"
      :tabindex="activeIndex === index ? 0 : -1"
      class="menu-item"
      :class="{ active: activeIndex === index }"
      @click="selectItem(index)"
      @keydown.enter="selectItem(index)" @keydown.space="selectItem(index)" <!-- Basic keyboard handling for items -->
    >
      {{ item.label }}
    </div>
  </div>
</template>

<style scoped>
.dropdown-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.dropdown-icon {
  font-size: 10px;
}

.dropdown-button:hover {
  background: #e0e0e0;
}

.dropdown-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 100;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
}

.menu-item:hover,
.menu-item.active {
  background-color: #f0f0f0;
}
</style>
```

## Example: Modal Dialog

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useClick,
  useEscapeKey,
  useRole,
  FloatingFocusManager,
  FloatingOverlay,
} from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isOpen = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Click to open the modal
const click = useClick(context)

// Close when pressing escape (but not when clicking outside)
const escapeKey = useEscapeKey(context, {
  onEscape: () => context.setOpen(false)
})

// Set ARIA attributes for accessibility
const role = useRole(context, { role: "dialog" })

// Event listeners from useClick and useEscapeKey are attached directly.
// ARIA roles from useRole would need manual application or its own prop mechanism.
// Since useInteractions is not available in v-float as per source,
// props need to be managed differently.
useClick(context); // Attaches click listeners
useEscapeKey(context, { onEscape: () => context.setOpen(false) }); // Attaches escape key listener

// ARIA attributes are shown manually in the template.
</script>

<template>
  <button
    ref="referenceRef"
    class="open-modal-button"
    :aria-expanded="isOpen.value"
    aria-controls="modal-dialog"
    aria-haspopup="dialog"
  >
    Open Modal
  </button>

  <FloatingOverlay v-if="isOpen.value" lock-scroll>
    <FloatingFocusManager :context="context" modal>
      <div
        ref="floatingRef"
        id="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        class="modal"
        :style="context.floatingStyles.value"
      >
        <div class="modal-header">
          <h2 id="modal-title">Modal Title</h2>
          <button @click="isOpen = false" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <p>This is a modal dialog that appears when you click the button.</p>
          <p>It traps focus inside the modal and has proper ARIA attributes for accessibility.</p>
        </div>

        <div class="modal-footer">
          <button @click="isOpen = false" class="cancel-button">Cancel</button>
          <button @click="isOpen = false" class="confirm-button">Confirm</button>
        </div>
      </div>
    </FloatingFocusManager>
  </FloatingOverlay>
</template>

<style scoped>
.open-modal-button {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  margin: 50px auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.cancel-button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

## Best Practices

### General Usage

1. **Combine with dismissal**: Always combine `useClick` with `useEscapeKey` to provide a way to close the floating element.

2. **Ensure keyboard accessibility**: Avoid setting `ignoreKeyboard` to `true` so keyboard users can trigger the interaction with the `Enter` or `Space` keys.

3. **Add ARIA attributes**: Use `useRole` to add appropriate ARIA attributes for accessibility.

4. **Manage focus properly**: For modal dialogs, use `FloatingFocusManager` to trap focus inside the floating element.

5. **Consider mobile users**: Ensure the clickable area is large enough for touch interactions on mobile devices.

6. **Provide visual feedback**: Add hover and active states to indicate the element is clickable.

7. **Handle escape key**: Use `useEscapeKey` to close the floating element when pressing the escape key.

### Tree-Aware Usage

8. **Use tree structure for nested menus**: When building menus with submenus, always use `useFloatingTree` and `TreeNode` contexts for proper hierarchical behavior.

9. **Organize tree hierarchy logically**: Structure your tree to match the logical relationship between floating elements (parent-child relationships).

10. **Handle sibling coordination**: Be aware that clicking on sibling elements will close the current floating element - use this for mutually exclusive dropdowns.

11. **Performance optimization**: Tree traversal only occurs when necessary and only checks open floating elements for efficiency.

12. **Backward compatibility**: Existing standalone usage continues to work unchanged - migrate to tree-aware usage only when needed for complex nested structures.

## Related Composables

- `useEscapeKey`: For handling escape key dismissal behavior
- `useRole`: For ARIA attribute management
- `useListNavigation`: For keyboard navigation within the floating element
- `FloatingFocusManager`: For managing focus within modal dialogs
- `FloatingOverlay`: For creating a backdrop behind modal dialogs
