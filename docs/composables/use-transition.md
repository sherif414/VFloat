# useTransition

A composable that provides transition state management for floating elements.

## Usage

```vue
<script setup>
import { useTransition } from 'vfloat'

const { isMounted, status, styles } = useTransition({
  duration: 200,
  initial: false
})
</script>

<template>
  <div
    v-if="isMounted"
    :style="{
      ...styles,
      transition: 'all 200ms ease'
    }"
  >
    I will animate!
  </div>
</template>
```

## API

### Options

```ts
interface UseTransitionOptions {
  duration?: number
  initial?: boolean
  onEnter?: () => void
  onExit?: () => void
}
```

### Returns

```ts
interface UseTransitionReturn {
  isMounted: Ref<boolean>
  status: Ref<'unmounted' | 'initial' | 'open' | 'close'>
  styles: Ref<{
    opacity?: string
    transform?: string
  }>
}
```