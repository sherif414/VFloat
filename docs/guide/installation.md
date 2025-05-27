# Installation

This guide will walk you through setting up V-Float in your Vue 3 project. V-Float provides precise positioning utilities for your floating UI elements, built for the Vue 3 Composition API.

## Requirements

*   **Vue 3.2+**: V-Float is specifically designed for Vue 3 and leverages its Composition API for reactive positioning.
*   **TypeScript** (recommended): V-Float ships with full TypeScript definitions, offering an enhanced development experience with type safety and auto-completion.

## Installation Options

Choose your preferred package manager to add V-Float to your project:

```bash
# Using pnpm (recommended)
pnpm add v-float

# Or with npm
npm install v-float

# Or with yarn
yarn add v-float
```


## Basic Setup

Once installed, you can import the core `useFloating` composable directly into your Vue components. This is the primary utility for calculating element positions.

```vue
<script setup>
import { useFloating } from "v-float";
</script>
```

## Browser Support

V-Float is built to support all modern browsers:

*   Chrome (and Chromium-based browsers like Edge)
*   Firefox
*   Safari
*   iOS Safari
*   Android browsers

For compatibility with older browsers, you may need to include appropriate polyfills for modern JavaScript features and APIs such as `ResizeObserver`, `Promises`, and various `Array` methods.

## CDN Usage (Not Recommended)

While it's technically possible to use V-Float via a Content Delivery Network (CDN), we strongly recommend using a build tool (like Vite or Webpack) in conjunction with a package manager. This approach provides better benefits such as tree-shaking for optimized bundle sizes and more efficient dependency management.

```html
<script src="https://unpkg.com/vue@3"></script>
<script src="https://unpkg.com/v-float"></script>

<script>
  const app = Vue.createApp({
    // Your Vue application setup
  });
  app.mount("#app");
</script>
```

## Next Steps

With V-Float successfully installed, you're ready to dive deeper:

*   Read the [Core Concepts](/guide/concepts) to understand how V-Float works at a fundamental level.
*   Explore the [Composables](/composables/) to learn about all the available utilities for advanced positioning.
*   Check out the [Examples](/examples/) for complete implementations of common floating UI patterns.

Should you encounter any installation issues, please consult the [Troubleshooting](/guide/troubleshooting) section or file an issue on the [V-Float GitHub repository](https://github.com/sherif414/VFloat).