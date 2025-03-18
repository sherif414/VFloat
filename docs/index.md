---
layout: home

hero:
  name: V-Float
  text: Vue 3 Floating UI Library
  tagline: A comprehensive toolkit for creating perfectly positioned and interactive floating elements
  image:
    src: /logo.svg
    alt: V-Float logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/yourusername/v-float
    - theme: alt
      text: Examples
      link: /examples/

features:
  - icon: 🎯
    title: Accurate Positioning
    details: Position floating elements with pixel-perfect accuracy, even in complex layouts.
  - icon: 🧩
    title: Powerful Composables
    details: Leverage the power of Vue 3 Composition API with our suite of flexible composables.
  - icon: 🧰
    title: Ready-to-use Components
    details: Drop-in components for arrows, focus management, portals, and more to accelerate development.
  - icon: 🚀
    title: Lightweight & Tree-shakable
    details: Import only what you need. Keep your bundle size small and performance high.
  - icon: ♿
    title: Accessibility Built-in
    details: ARIA attributes, keyboard navigation, and focus management for inclusive UIs.
  - icon: 📱
    title: Device & Framework Agnostic
    details: Works on all screen sizes and within any Vue 3 project.
---

## Quick Example

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useHover } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const hover = useHover(floating.context);

const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover me</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="{
      position: floating.strategy,
      top: '0px',
      left: '0px',
      transform: `translate(${floating.x}px, ${floating.y}px)`,
    }"
  >
    This is a tooltip
  </div>
</template>
```
