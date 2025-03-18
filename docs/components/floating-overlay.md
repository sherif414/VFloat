# FloatingOverlay

The `FloatingOverlay` component creates a fixed overlay that covers the entire viewport. It's commonly used as a backdrop for modals, dialogs, and other components that require a visual separation from the rest of the page. The overlay can also optionally lock scrolling to prevent the underlying content from being scrolled while a modal is open.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { FloatingOverlay, FloatingPortal } from "v-float";

const isOpen = ref(false);
</script>

<template>
  <button @click="isOpen = true">Open Modal</button>

  <FloatingPortal>
    <FloatingOverlay
      v-if="isOpen"
      :lock-scroll="true"
      :style="{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }"
    >
      <div
        :style="{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }"
      >
        <h2>Modal Title</h2>
        <p>Modal content goes here.</p>
        <button @click="isOpen = false">Close</button>
      </div>
    </FloatingOverlay>
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
      <td>lockScroll</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether to prevent scrolling of the body while the overlay is active</td>
    </tr>
    <tr>
      <td>zIndex</td>
      <td>Number</td>
      <td>undefined</td>
      <td>The z-index value for the overlay (optional)</td>
    </tr>
  </tbody>
</table>

## Features

### Fixed Positioning

The `FloatingOverlay` component uses fixed positioning to cover the entire viewport, regardless of the page's scroll position. This ensures that the overlay remains in view even if the user tries to scroll the page.

### Scroll Locking

When the `lockScroll` prop is set to `true`, the component prevents scrolling of the body while the overlay is active. This is achieved by adding a CSS class to the body element that disables scrolling.

```vue
<FloatingOverlay :lock-scroll="true">
  <!-- Overlay content -->
</FloatingOverlay>
```

This is particularly useful for modal dialogs, where allowing scrolling of the background content can create confusion and accessibility issues.

### Default Styling

The `FloatingOverlay` component comes with minimal default styling to make it easy to customize:

- `position: fixed`
- `top: 0`
- `right: 0`
- `bottom: 0`
- `left: 0`
- `background: rgba(0, 0, 0, 0.5)` (semi-transparent black)

### Z-Index Management

You can control the stacking order of the overlay by setting the `zIndex` prop:

```vue
<FloatingOverlay :z-index="1000">
  <!-- Overlay content -->
</FloatingOverlay>
```

This is useful when you need to ensure the overlay appears above other fixed or absolutely positioned elements on the page.

## Advanced Usage

### Customizing the Appearance

You can customize the appearance of the overlay by applying your own styles:

```vue
<FloatingOverlay
  :style="{
    background: 'rgba(15, 23, 42, 0.75)', // Dark blue overlay
    backdropFilter: 'blur(4px)', // Apply blur effect
  }"
>
  <!-- Overlay content -->
</FloatingOverlay>
```

### Creating a Modal with Focus Management

For a fully accessible modal dialog, combine `FloatingOverlay` with `FloatingFocusManager`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  FloatingOverlay,
  FloatingPortal,
  FloatingFocusManager,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});
</script>

<template>
  <button ref="referenceRef" @click="isOpen = true">Open Modal</button>

  <FloatingPortal>
    <FloatingOverlay v-if="isOpen" :lock-scroll="true">
      <FloatingFocusManager :context="floating.context">
        <div
          ref="floatingRef"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :style="{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            margin: '0 auto',
            outline: 'none', // Remove focus outline
          }"
        >
          <h2 id="dialog-title">Modal Title</h2>
          <p>Modal content goes here.</p>
          <button @click="isOpen = false">Close</button>
        </div>
      </FloatingFocusManager>
    </FloatingOverlay>
  </FloatingPortal>
</template>
```

### Animated Overlay

You can add transitions to the overlay for a smoother experience:

```vue
<template>
  <Transition name="fade">
    <FloatingOverlay v-if="isOpen" :lock-scroll="true">
      <!-- Overlay content -->
    </FloatingOverlay>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### Closing on Backdrop Click

You can implement a common pattern of closing the modal when clicking the backdrop:

```vue
<template>
  <FloatingOverlay
    v-if="isOpen"
    :lock-scroll="true"
    @click="handleOverlayClick"
  >
    <div role="dialog" aria-modal="true" @click="stopPropagation">
      <!-- Modal content -->
      <button @click="isOpen = false">Close</button>
    </div>
  </FloatingOverlay>
</template>

<script setup>
const handleOverlayClick = () => {
  isOpen.value = false;
};

// Prevent clicks on the modal itself from closing it
const stopPropagation = (e) => {
  e.stopPropagation();
};
</script>
```

## Accessibility Considerations

- When using `FloatingOverlay` for modal dialogs, make sure to include proper ARIA attributes (`role="dialog"`, `aria-modal="true"`).
- Always provide a clearly visible way to close the overlay (e.g., a close button).
- Use `FloatingFocusManager` to trap focus within the modal dialog for keyboard navigation.
- Ensure sufficient color contrast between the overlay and its content.
- Consider adding keyboard shortcuts (like Escape key) to close the overlay:

```vue
<script setup>
import { onMounted, onUnmounted } from "vue";

// Close on escape key
const handleKeyDown = (e) => {
  if (isOpen.value && e.key === "Escape") {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>
```
