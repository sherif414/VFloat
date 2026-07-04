---
description: Control floating open state from your own Vue state and event handling.
---

# Control Open State

Let's talk about open state.

Most floating surfaces are easiest when VFloat owns the open state for you. But sometimes the parent component needs to stay in charge because the floating surface has to follow routing, forms, or other application rules.

This page shows both models and when each one makes sense.

## The Default: Let VFloat Own It

If you call [`useFloatingContext`](/api/use-floating-context) without `state.open`, VFloat creates and owns that state for you.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingContext } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });

useClick(context);
</script>
```

This is usually the simplest starting point. The component stays small, and your interaction composables and template all coordinate through `context.state`.

## The Controlled Version

When the parent needs to read or react to the open state directly in its own logic, pass your own `open` ref.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingContext, useOutsideClick } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const context = useFloatingContext({
  refs: { anchorEl, floatingEl },
  state: { open },
});

useClick(context);
useOutsideClick(context);

// To change the state programmatically, call setOpen
function close() {
  context.state.setOpen(false);
}
</script>
```

VFloat will automatically update your parent `open` ref when interaction helpers (like clicks or keyboard shortcuts) trigger open state changes.

> [!IMPORTANT]
> The `open` ref you pass to VFloat must be mutable so that internal interactions can write to it. If you are wrapping a read-only prop or implementing component `v-model` delegation, make sure to pass a **writable computed property**:
>
> ```ts
> import { computed, ref } from "vue";
> import { useFloatingContext } from "v-float";
>
> const props = defineProps<{ modelValue: boolean }>();
> const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
>
> const open = computed({
>   get: () => props.modelValue,
>   set: (value) => emit("update:modelValue", value),
> });
>
> const context = useFloatingContext({
>   refs: { anchorEl, floatingEl },
>   state: { open },
> });
> ```

If your parent component needs to programmatically open or close the surface, call `context.state.setOpen()` instead of mutating your `open` ref directly. This ensures VFloat's internal cleanup routines (such as dismissing descendant menus) run correctly.

> [!NOTE]
> You can also pass an `onOpenChange` callback for debugging or logging, but it is not intended to be used for driving state updates.

## When Each Model Makes Sense

Choose uncontrolled when:

- The surface is local
- The component can own its own lifecycle
- Simplicity matters most

Choose controlled when:

- Another component needs to decide whether the surface may open
- Closing the surface should trigger other state updates
- Multiple related surfaces need shared coordination

## Keep One Context Per Surface

Whatever state model you choose, make sure every interaction composable for that surface shares the same `context`.

That shared `context` is what lets click, escape handling, and positioning cooperate instead of fighting each other.

## Next Step

If you want to understand the shared model behind both versions, read [Floating Context](/guide/floating-context). If you are ready for practical builds, jump to [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns).
