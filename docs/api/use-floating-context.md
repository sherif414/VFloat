---
description: Create the shared refs and open state used by VFloat behavior composables.
---

# useFloatingContext

`useFloatingContext` creates the shared floating context. It owns refs, open state, reasoned open changes, and the identity object passed to behavior composables.

## Type

```ts
function useFloatingContext(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options?: UseFloatingContextOptions,
): FloatingContext;
```

```ts
interface UseFloatingContextOptions {
  open?: Ref<boolean>;
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}
```

## Details

`useFloatingContext` does not compute coordinates, run middlewares, or wire auto-update listeners. Add [`usePosition`](/api/use-position) when a surface needs JavaScript positioning.

- `refs.anchorEl` and `refs.floatingEl` are the refs passed to the composable.
- `refs.arrowEl` is available for arrow helpers.
- `state.open` defaults to `ref(false)`.
- Passing `open` makes the context use your controlled ref.
- `state.setOpen(open, reason?, event?)` forwards the reason and source event to `onOpenChange`.
- Missing reasons fall back to `"programmatic"`.
- Setting the current open value is a no-op.

## Example

This dialog uses VFloat state and behavior without JavaScript positioning.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEscapeKey, useFloatingContext, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext(anchorEl, floatingEl);

useEscapeKey(context);
const { floatingProps } = useRole(context, { role: "dialog" });
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(true, 'anchor-click', $event)">
    Open dialog
  </button>

  <div v-if="context.state.open.value" ref="floatingEl" class="dialog" v-bind="floatingProps">
    <button @click="context.state.setOpen(false, 'programmatic', $event)">Close</button>
  </div>
</template>
```

## See Also

- [usePosition](/api/use-position) - Opt into JavaScript positioning
- [useClick](/api/use-click) - Click-based activation
- [Floating Context](/guide/floating-context) - Context mental model
