# FloatingFocusManager

The `FloatingFocusManager` component provides accessible focus management for floating elements like modals, dialogs, and menus. It traps focus within the floating element, prevents focus from leaving while the element is open, and restores focus to the previous element when the floating element closes.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, FloatingPortal, FloatingFocusManager } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});
</script>

<template>
  <button ref="referenceRef" @click="isOpen = !isOpen">Open Dialog</button>

  <FloatingPortal>
    <FloatingFocusManager v-if="isOpen" :context="floating.context">
      <div
        ref="floatingRef"
        role="dialog"
        aria-modal="true"
        :style="{
          position: floating.strategy,
          top: '0px',
          left: '0px',
          transform: `translate(${floating.x}px, ${floating.y}px)`,
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        }"
      >
        <h2>Focus is trapped inside this dialog</h2>
        <input placeholder="Input 1" />
        <input placeholder="Input 2" />
        <button @click="isOpen = false">Close</button>
      </div>
    </FloatingFocusManager>
  </FloatingPortal>
</template>
```

## Props

<script setup>
import { ref } from 'vue'
</script>

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>context</td>
      <td>Object</td>
      <td><code>required</code></td>
      <td>The context object from <code>useFloating()</code></td>
    </tr>
    <tr>
      <td>initialFocus</td>
      <td>Number | HTMLElement | Ref&lt;HTMLElement&gt; | <code>() => HTMLElement</code></td>
      <td>0</td>
      <td>
        Element to receive focus when the component mounts. Can be:
        <ul>
          <li>A number (index of the child element)</li>
          <li>A specific element reference</li>
          <li>A function that returns an element</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>returnFocus</td>
      <td>Boolean</td>
      <td>true</td>
      <td>Whether to return focus to the reference element when the component unmounts</td>
    </tr>
    <tr>
      <td>modal</td>
      <td>Boolean</td>
      <td>true</td>
      <td>Whether the focus trap is modal (prevents interaction outside)</td>
    </tr>
    <tr>
      <td>order</td>
      <td>Array&lt;string&gt;</td>
      <td><code>['content']</code></td>
      <td>The order of focus. Can include 'reference' and 'content'</td>
    </tr>
    <tr>
      <td>disabled</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether to disable the focus trap temporarily</td>
    </tr>
    <tr>
      <td>visuallyHiddenDismiss</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether to add a visually hidden dismiss button at the end for accessibility</td>
    </tr>
  </tbody>
</table>

## Features

### Focus Trapping

The `FloatingFocusManager` traps focus within its children when active, preventing users from tabbing out of the floating element. This is especially important for modal dialogs, as it ensures users cannot interact with content outside the dialog.

### Initial Focus

By default, the first focusable element inside the floating element receives focus when it opens. You can customize this behavior with the `initialFocus` prop:

```vue
<!-- Focus the second focusable element -->
<FloatingFocusManager :context="floating.context" :initial-focus="1">
  <!-- ... -->
</FloatingFocusManager>

<!-- Focus a specific element -->
<FloatingFocusManager :context="floating.context" :initial-focus="myButtonRef">
  <!-- ... -->
</FloatingFocusManager>

<!-- Use a function to determine focus -->
<FloatingFocusManager
  :context="floating.context"
  :initial-focus="() => document.querySelector('#special-button')"
>
  <!-- ... -->
</FloatingFocusManager>
```

### Return Focus

When the floating element closes, focus automatically returns to the element that was focused before it opened (usually the reference element). You can disable this behavior with the `returnFocus` prop:

```vue
<FloatingFocusManager :context="floating.context" :return-focus="false">
  <!-- ... -->
</FloatingFocusManager>
```

### Modal vs Non-Modal

By default, `FloatingFocusManager` operates in modal mode, where focus is completely trapped within the floating element. In non-modal mode, focus can leave the floating element but will be guided back when tabbing through the page.

```vue
<!-- Non-modal focus management -->
<FloatingFocusManager :context="floating.context" :modal="false">
  <!-- ... -->
</FloatingFocusManager>
```

Non-modal focus management is useful for non-modal tooltips, popovers, and other elements that shouldn't completely block interaction with the rest of the page.

## Advanced Usage

### Focus Order

You can customize the order of focusable elements with the `order` prop:

```vue
<!-- Include the reference element in the focus order -->
<FloatingFocusManager
  :context="floating.context"
  :order="['reference', 'content']"
>
  <!-- ... -->
</FloatingFocusManager>
```

This is useful for menus and comboboxes where you want the reference element (like a button or input) to be part of the focus loop.

### Visually Hidden Dismiss Button

For dialogs and modals, it's a good accessibility practice to provide a way to dismiss the dialog with the keyboard. The `visuallyHiddenDismiss` prop adds a visually hidden dismiss button at the end of the focus order:

```vue
<FloatingFocusManager
  :context="floating.context"
  :visually-hidden-dismiss="true"
>
  <!-- ... -->
</FloatingFocusManager>
```

### Temporarily Disabling

You can temporarily disable focus management with the `disabled` prop:

```vue
<FloatingFocusManager
  :context="floating.context"
  :disabled="isFocusManagementDisabled"
>
  <!-- ... -->
</FloatingFocusManager>
```

This is useful for complex scenarios where you need to handle focus manually for a specific interaction.

## Accessibility Considerations

- Always use `aria-modal="true"` and a proper ARIA role (like `role="dialog"`) on modal floating elements.
- Ensure there's a way to close the floating element using the keyboard (e.g., Escape key or a close button).
- If your floating element contains long content requiring scrolling, ensure that content is properly focusable and navigable with the keyboard.
- Use descriptive labels and ARIA attributes to improve screen reader announcements.

```vue
<div
  ref="floatingRef"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-description">Dialog description text.</p>
  <!-- Dialog content -->
</div>
```
