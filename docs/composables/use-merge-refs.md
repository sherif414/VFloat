# useMergeRefs

A utility composable that combines multiple refs into a single callback ref.

## Usage

```vue
<script setup>
import { useMergeRefs } from 'vfloat'
import { ref } from 'vue'

const elementRef = ref(null)
const setFloating = (node) => {
  // do something with node
}

const mergedRef = useMergeRefs(elementRef, setFloating)
</script>

<template>
  <div :ref="mergedRef">
    This element has multiple refs
  </div>
</template>
```

## API

### Parameters

- `...refs`: Array of refs to merge (can be template refs or callback refs)

### Returns

- Returns a callback function that sets all provided refs