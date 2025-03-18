# Installation

This guide will help you set up V-Float in your Vue 3 project. V-Float is designed to work with Vue 3 projects using the Composition API.

## Requirements

- **Vue 3.2+**: V-Float is built specifically for Vue 3 and leverages the Composition API.
- **TypeScript** (recommended): V-Float includes full TypeScript support for better developer experience.

## Installation Options

### Option 1: Using PNPM (Recommended)

```bash
pnpm add v-float
```

### Option 2: Using NPM

```bash
npm install v-float
```

### Option 3: Using Yarn

```bash
yarn add v-float
```

## Basic Setup

Once installed, you can import the composables and components you need directly in your Vue files:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float";
</script>
```

## Global Registration (Optional)

If you prefer, you can register V-Float components globally in your main.js/ts file:

```js
// main.js or main.ts
import { createApp } from "vue";
import App from "./App.vue";
import { FloatingArrow, FloatingPortal, FloatingFocusManager } from "v-float";

const app = createApp(App);

// Register components globally
app.component("FloatingArrow", FloatingArrow);
app.component("FloatingPortal", FloatingPortal);
app.component("FloatingFocusManager", FloatingFocusManager);

app.mount("#app");
```

## Vite Configuration (Optional)

When using Vite, you can add a convenient alias for importing from v-float:

```js
// vite.config.js or vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "v-float": path.resolve(__dirname, "node_modules/v-float"),
    },
  },
});
```

## TypeScript Setup (Recommended)

V-Float includes TypeScript definitions. To get the best development experience, ensure your tsconfig.json includes:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "lib": ["esnext", "dom"],
    "types": ["vite/client", "vue"]
  }
}
```

## Checking Installation

Once installed, you can verify that V-Float is working correctly by creating a simple tooltip:

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
  onOpenChange: (open) => (isOpen.value = open),
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
    :style="floating.floatingStyles"
    style="background: #333; color: white; padding: 4px 8px; border-radius: 4px;"
  >
    I'm a tooltip!
  </div>
</template>
```

## Browser Support

V-Float supports all modern browsers:

- Chrome (and Chromium-based browsers like Edge)
- Firefox
- Safari
- iOS Safari
- Android browsers

For older browsers, you may need to include appropriate polyfills for features like:

- ResizeObserver
- Promises
- Array methods

## CDN Usage (Not Recommended)

While it's possible to use V-Float via CDN, we recommend using a build tool for better tree-shaking and optimized builds:

```html
<script src="https://unpkg.com/vue@3"></script>
<script src="https://unpkg.com/v-float"></script>

<script>
  const app = Vue.createApp({
    // Your app setup
  });
  app.mount("#app");
</script>
```

## Next Steps

Now that you have installed V-Float, you can:

- Read the [Core Concepts](/guide/concepts) to understand how V-Float works
- Explore the [Composables](/composables/) to learn about available utilities
- Check out the [Examples](/examples/) for complete implementations

For any installation issues, please check the [Troubleshooting](/guide/troubleshooting) section or file an issue on GitHub.
