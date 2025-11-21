# useFocusTrap

The `useFocusTrap` composable traps keyboard focus within the floating element, managing keyboard navigation with Tab/Shift+Tab keys. It supports both modal and non-modal modes, focus guards, initial focus placement, and intelligent focus restoration. When used with `TreeNode`, it enables nested trap behavior where only the deepest open node activates trapping.

## Signature

```ts
function useFocusTrap(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseFocusTrapOptions
): UseFocusTrapReturn
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Floating context or tree node to trap focus within. |
| options | `UseFocusTrapOptions` | No | Configuration options. |

## Options

```ts
interface UseFocusTrapOptions {
  enabled?: MaybeRefOrGetter<boolean>
  modal?: MaybeRefOrGetter<boolean>
  initialFocus?: MaybeRefOrGetter<HTMLElement | (() => HTMLElement | null) | string | false>
  returnFocus?: MaybeRefOrGetter<boolean>
  closeOnFocusOut?: MaybeRefOrGetter<boolean>
  preventScroll?: MaybeRefOrGetter<boolean>
  outsideElementsInert?: MaybeRefOrGetter<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable focus trap listeners. |
| modal | `MaybeRefOrGetter<boolean>` | `false` | When true, hides/inerts content outside the trap and prevents focus from escaping. |
| initialFocus | `MaybeRefOrGetter<...>` | `undefined` | Element to focus when trap activates: CSS selector, HTMLElement, or function returning element. |
| returnFocus | `MaybeRefOrGetter<boolean>` | `true` | Returns focus to previously focused element when trap deactivates. |
| closeOnFocusOut | `MaybeRefOrGetter<boolean>` | `false` | On non-modal, close floating when focus escapes the trap. |
| preventScroll | `MaybeRefOrGetter<boolean>` | `true` | Pass `preventScroll` to focus operations. |
| outsideElementsInert | `MaybeRefOrGetter<boolean>` | `false` | Apply `inert` attribute (when supported) to outside elements while modal. |

## Return Value

```ts
interface UseFocusTrapReturn {
  cleanup: () => void
}
```

| Property | Type | Description |
|----------|------|-------------|
| cleanup | `() => void` | Manual cleanup function to remove all listeners and restore DOM state. |

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useFocusTrap } from 'v-float'

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const open = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Basic focus trap
useFocusTrap(context)
</script>

<template>
  <button ref="referenceRef" @click="open = !open">
    Open Dialog
  </button>

  <div v-if="open" ref="floatingRef" role="dialog">
    <h2>Focus Trapped Dialog</h2>
    <input placeholder="Focus stays within" />
    <button @click="open = false">Close</button>
  </div>
</template>
```

### Modal Dialog

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useFocusTrap } from 'v-float'

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Modal focus trap - prevents focus from escaping
useFocusTrap(context, {
  modal: true,
  initialFocus: 'first',
  returnFocus: true
})
</script>

<template>
  <button ref="referenceRef" @click="open = true">
    Open Modal
  </button>

  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <div ref="floatingRef" role="dialog" aria-modal="true">
        <h2>Modal Dialog</h2>
        <p>Try tabbing outside - you can't!</p>
        <input placeholder="First tabbable element" />
        <button @click="open = false">Close</button>
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
</style>
```

## Focus Trap Modes

### Modal Mode

In modal mode, the focus trap prevents focus from leaving the trapped area:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocusTrap } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Modal: Focus cannot escape
useFocusTrap(context, {
  modal: true,
  outsideElementsInert: true // Make outside elements inert (when supported)
})
</script>
```

### Non-Modal Mode

In non-modal mode, you can optionally close the floating element when focus escapes:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocusTrap } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Non-modal: Auto-close on focus out
useFocusTrap(context, {
  modal: false,
  closeOnFocusOut: true
})
</script>
```

## Initial Focus Options

### Focus First Element

```vue
<script setup>
useFocusTrap(context, {
  initialFocus: 'first' // Default behavior
})
</script>
```

### Focus Last Element

```vue
<script setup>
useFocusTrap(context, {
  initialFocus: 'last'
})
</script>
```

### Focus Specific Element by Index

```vue
<script setup>
// Focus the 3rd tabbable element (0-indexed)
useFocusTrap(context, {
  initialFocus: 2
})
</script>
```

### Focus Specific Element by Reference

```vue
<script setup>
import { ref } from 'vue'

const closeButton = ref(null)

useFocusTrap(context, {
  initialFocus: closeButton
})
</script>

<template>
  <div ref="floatingRef">
    <input placeholder="Not initially focused" />
    <button ref="closeButton">Close (Initially Focused)</button>
  </div>
</template>
```

### Focus Element via Function

```vue
<script setup>
useFocusTrap(context, {
  initialFocus: () => document.getElementById('important-field')
})
</script>

<template>
  <div ref="floatingRef">
    <input id="important-field" placeholder="Gets initial focus" />
    <button>Close</button>
  </div>
</template>
```



## Focus Return Behavior

### Return Focus on Close

```vue
<script setup>
// Returns focus to element that opened the trap
useFocusTrap(context, {
  returnFocus: true // Default
})
</script>
```

### Prevent Focus Return

```vue
<script setup>
// Don't return focus when closing
useFocusTrap(context, {
  returnFocus: false
})
</script>
```



## Nested Focus Traps

When working with nested floating elements, use tree-aware focus trapping:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFloatingTree, useFocusTrap } from "v-float"

const triggerRef = ref(null)
const dialogRef = ref(null)
const nestedTriggerRef = ref(null)
const nestedDialogRef = ref(null)

const dialogOpen = ref(false)
const nestedOpen = ref(false)

// Main dialog
const dialogContext = useFloating(triggerRef, dialogRef, {
  open: dialogOpen,
  onOpenChange: (value) => dialogOpen.value = value
})

// Nested dialog
const nestedContext = useFloating(nestedTriggerRef, nestedDialogRef, {
  open: nestedOpen,
  onOpenChange: (value) => nestedOpen.value = value
})

// Create tree
const tree = useFloatingTree()
const dialogNode = tree.addNode(triggerRef, dialogRef)
const nestedNode = tree.addNode(nestedTriggerRef, nestedDialogRef, {
  parentId: dialogNode?.id
})

// Tree-aware focus trapping
// Only the deepest open node activates trapping
useFocusTrap(dialogNode, { modal: true })
useFocusTrap(nestedNode, { modal: true })
</script>

<template>
  <button ref="triggerRef" @click="dialogOpen = true">
    Open Dialog
  </button>

  <div v-if="dialogOpen" ref="dialogRef" role="dialog">
    <h2>Main Dialog</h2>
    <button ref="nestedTriggerRef" @click="nestedOpen = true">
      Open Nested Dialog
    </button>
    <button @click="dialogOpen = false">Close</button>

    <div v-if="nestedOpen" ref="nestedDialogRef" role="dialog">
      <h3>Nested Dialog</h3>
      <p>Focus is trapped in this nested dialog</p>
      <input placeholder="Tab stays here" />
      <button @click="nestedOpen = false">Close Nested</button>
    </div>
  </div>
</template>
```

## Combining with Other Interactions

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useFocusTrap,
  useClick,
  useEscapeKey,
  useOutsideClick
} from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Click to toggle
useClick(context)

// Trap focus when open
useFocusTrap(context, {
  modal: true,
  returnFocus: true
})

// Close on Escape
useEscapeKey({
  enabled: open,
  onEscape: () => {
    open.value = false
  }
})

// Close on outside click
useOutsideClick(context)
</script>

<template>
  <button ref="referenceRef">Toggle Modal</button>

  <Teleport to="body">
    <div v-if="open" class="modal-backdrop">
      <div ref="floatingRef" role="dialog" aria-modal="true">
        <h2>Accessible Modal</h2>
        <p>Press Escape, click outside, or use the close button</p>
        <input placeholder="Focus is trapped" />
        <button @click="open = false">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

## Advanced Examples

### Dynamic Initial Focus

```vue
<script setup>
import { ref, computed } from 'vue'
import { useFloating, useFocusTrap } from 'v-float'

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)
const mode = ref('default') // 'default', 'close', 'input'

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

const initialFocusTarget = computed(() => {
  if (mode.value === 'close') {
    return () => document.getElementById('close-btn')
  }
  if (mode.value === 'input') {
    return () => document.getElementById('main-input')
  }
  return 'first'
})

useFocusTrap(context, {
  modal: true,
  initialFocus: initialFocusTarget
})
</script>

<template>
  <div>
    <label>
      <input type="radio" v-model="mode" value="default" /> First element
    </label>
    <label>
      <input type="radio" v-model="mode" value="close" /> Close button
    </label>
    <label>
      <input type="radio" v-model="mode" value="input" /> Main input
    </label>
  </div>

  <button ref="referenceRef" @click="open = true">
    Open Modal
  </button>

  <div v-if="open" ref="floatingRef" role="dialog">
    <h2>Dynamic Initial Focus</h2>
    <input id="main-input" placeholder="Main input" />
    <button id="close-btn" @click="open = false">Close</button>
  </div>
</template>
```

### Conditional Trap Activation

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useFocusTrap } from 'v-float'

const referenceRef = ref(null)
const floatingRef = ref(null)
const open = ref(false)
const trapEnabled = ref(true)

const context = useFloating(referenceRef, floatingRef, {
  open,
  onOpenChange: (value) => open.value = value
})

// Conditionally enable/disable the trap
useFocusTrap(context, {
  enabled: trapEnabled,
  modal: true
})
</script>

<template>
  <div>
    <label>
      <input type="checkbox" v-model="trapEnabled" />
      Enable Focus Trap
    </label>
  </div>

  <button ref="referenceRef" @click="open = true">
    Open Dialog
  </button>

  <div v-if="open" ref="floatingRef" role="dialog">
    <h2>Conditional Trap</h2>
    <p v-if="trapEnabled">Focus is trapped</p>
    <p v-else>Focus is NOT trapped - you can tab outside</p>
    <input placeholder="Type something" />
    <button @click="open = false">Close</button>
  </div>
</template>
```

## Best Practices

1. **Use Modal for Dialogs**: For dialog/modal interfaces, always use `modal: true` to prevent focus from escaping and ensure proper ARIA compliance.

2. **Return Focus**: Keep `returnFocus: true` (default) to ensure focus returns to the triggering element when the trap closes, improving keyboard navigation UX.

3. **Initial Focus Management**: For most cases, `initialFocus: 'first'` works well. For destructive actions, consider focusing a cancel/close button initially.

4. **ARIA Attributes**: Always include appropriate ARIA attributes manually:
   - `role="dialog"` for dialogs
   - `aria-modal="true"` for modal dialogs
   - `aria-labelledby` and `aria-describedby` for accessibility

5. **Combine with useEscapeKey**: Always pair focus traps with escape key handling for better UX.

6. **Test Keyboard Navigation**: Thoroughly test Tab, Shift+Tab, and Escape key navigation to ensure the trap works correctly.

7. **Nested Traps**: Use `useFloatingTree` for nested floating elements to enable intelligent hierarchical focus trapping.

8. **Prevent Scroll**: Keep `preventScroll: true` (default) to avoid unwanted scrolling when focus moves.

10. **Inert Outside Elements**: For critical modal dialogs, consider using `outsideElementsInert: true` in browsers that support the `inert` attribute.

## Accessibility Considerations

- ✅ **Keyboard Trapping**: Primary purpose - keeps keyboard focus within the intended area
- ✅ **Modal Semantics**: Supports `aria-modal` and proper dialog semantics
- ✅ **Focus Return**: Automatically returns focus to the triggering element
- ✅ **Screen Readers**: Works seamlessly with assistive technologies
- ✅ **WCAG Compliance**: Follows WCAG 2.1 focus management guidelines
- ✅ **Nested Support**: Handles complex nested dialog scenarios
- ✅ **Inert Support**: Can mark outside elements as inert when supported

## Related Composables

- [`useFocus`](/api/use-focus) - For focus-based show/hide interactions
- [`useEscapeKey`](/api/use-escape-key) - For keyboard dismissal (commonly paired with focus traps)
- [`useClick`](/api/use-click) - For click-based interactions
- [`useFloatingTree`](/api/use-floating-tree) - For managing nested focus traps
- [`useListNavigation`](/api/use-list-navigation) - For keyboard navigation within lists
