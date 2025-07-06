# useClientPoint

A composable that enables tracking of client point (mouse/touch) coordinates for floating elements.

## Usage

```vue
<script setup>
import { useClientPoint } from "v-float"

const { refs, x, y } = useClientPoint()
</script>

<template>
  <div ref="refs.setReference">Hover me</div>
  <div
    v-if="x && y"
    :style="{
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
    }"
  >
    I follow the cursor!
  </div>
</template>
```

## API

### Options

```ts
interface UseClientPointOptions {
  enabled?: boolean
  axis?: "both" | "x" | "y"
}
```

### Returns

```ts
interface UseClientPointReturn {
  x: Ref<number | null>
  y: Ref<number | null>
  refs: {
    setReference: (el: Element | null) => void
  }
}
```
