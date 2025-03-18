# Components

V-Float provides several ready-to-use components that handle common patterns when creating floating UI elements. These components are designed to be composable, accessible, and easy to integrate into your Vue 3 application.

## Available Components

### FloatingArrow

A customizable arrow component that points to the reference element. Perfect for tooltips, popovers, and dropdown menus.

```vue
<FloatingArrow
  :context="floating.context"
  :fill="'white'"
  :stroke="'#ccc'"
  :stroke-width="1"
/>
```

[Learn more about FloatingArrow →](/components/floating-arrow)

### FloatingPortal

Renders content in a different DOM location, useful for ensuring floating elements aren't clipped by parent containers with `overflow` styles.

```vue
<FloatingPortal>
  <div v-if="isOpen" ref="floatingRef">
    Portal content
  </div>
</FloatingPortal>
```

[Learn more about FloatingPortal →](/components/floating-portal)

### FloatingOverlay

Displays an overlay behind floating elements, commonly used for modals and dialogs.

```vue
<FloatingOverlay v-if="isOpen" :lock-scroll="true" :z-index="50">
  Modal content
</FloatingOverlay>
```

[Learn more about FloatingOverlay →](/components/floating-overlay)

### FloatingFocusManager

Manages focus trapping and tab order within floating elements, essential for accessible modals, dialogs, and menus.

```vue
<FloatingFocusManager :context="floating.context" :modal="true">
  <div ref="floatingRef">
    <input placeholder="Focus trapped here" />
    <button>Button</button>
  </div>
</FloatingFocusManager>
```

[Learn more about FloatingFocusManager →](/components/floating-focus-manager)

### FloatingList & FloatingListItem

Components for creating keyboard-navigable lists in menus, select dropdowns, and comboboxes.

```vue
<FloatingList :context="floating.context" :list-ref="listNavigation">
  <FloatingListItem :index="0">
    Option 1
  </FloatingListItem>
  <FloatingListItem :index="1">
    Option 2
  </FloatingListItem>
</FloatingList>
```

[Learn more about FloatingList →](/components/floating-list)
[Learn more about FloatingListItem →](/components/floating-list-item)

## Composing Components

V-Float components are designed to work together. For example, you might use `FloatingPortal`, `FloatingFocusManager`, and `FloatingArrow` together to create an accessible dropdown:

```vue
<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Menu</button>

  <FloatingPortal>
    <FloatingFocusManager v-if="isOpen" :context="floating.context">
      <div
        ref="floatingRef"
        v-bind="getFloatingProps()"
        :style="{
          position: floating.strategy,
          top: '0px',
          left: '0px',
          transform: `translate(${floating.x}px, ${floating.y}px)`,
        }"
      >
        Dropdown content
        <FloatingArrow ref="arrowRef" :context="floating.context" />
      </div>
    </FloatingFocusManager>
  </FloatingPortal>
</template>
```

## Styling Components

All V-Float components are unstyled by design, giving you complete control over the visual appearance. You can apply your own CSS, utility classes, or integrate with your preferred styling solution.
