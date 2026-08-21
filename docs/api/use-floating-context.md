---
description: Create the shared refs and open state used by VFloat behavior composables.
---

# useFloatingContext

`useFloatingContext` creates the shared floating context. It owns refs, open state, reasoned open changes, and the stable identity passed to behavior composables.

## Type

```ts
function useFloatingContext(options: UseFloatingContextOptions): FloatingContext;
```

```ts
interface UseFloatingContextOptions {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl?: Ref<HTMLElement | null>;
  open?: Ref<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
  parentContext?: FloatingContext | null;
}

interface FloatingContext {
  id: FloatingContextId;
  refs: FloatingRefs;
  state: FloatingState;
  isRoot: boolean;
}

type FloatingContextId = symbol;

interface FloatingRefs {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

interface FloatingState {
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;
  lastOpenEvent?: Readonly<Ref<Event | null>>;
}
```

## Details

`useFloatingContext` does not compute coordinates, run middlewares, or wire auto-update listeners. Add [`usePosition`](/api/use-position) when a surface needs JavaScript positioning.

- `anchorEl` and `floatingEl` are required options.
- `arrowEl` is optional and used by [`useArrow`](/api/use-arrow).
- `context.id` is a stable symbol created with the context and used to coordinate related contexts without comparing context objects by identity.
- `open` (in `context.state.open`) defaults to internally managed state initialized from `defaultOpen` (or `false` when omitted).
- Passing `open` makes the context use your controlled ref.
- `defaultOpen` only seeds uncontrolled state; it is ignored when `open` option is provided and is not watched after creation.
- `context.state.setOpen(open, reason?, event?)` forwards the reason and source event to `onOpenChange`.
- `context.state.lastOpenReason` tracks the reason of the most recent open transition or reaffirmation (`null` when closed).
- `context.state.lastOpenEvent` holds the source event of the most recent open transition or reaffirmation (`null` when closed).
- Missing reasons fall back to `"programmatic"`.
- `context.isRoot` indicates whether this is a top-level floating context (`!parentContext`).
- `parentContext` links related floating contexts so outside-click and focus checks can treat descendants as part of the same floating family.
- Closing a context also closes its descendant contexts from deepest child to nearest child.
- Setting the current open value is a no-op, except setting `false` still closes descendants.

Open-change reasons use these string values:

```ts
type OpenChangeReason =
  | "anchor-click"
  | "keyboard-activate"
  | "keyboard-exit"
  | "outside-pointer"
  | "focus"
  | "blur"
  | "hover"
  | "escape-key"
  | "tab-key"
  | "programmatic";
```

## Example

This dialog uses VFloat state and behavior without JavaScript positioning.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEscapeKey, useFloatingContext, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({
  anchorEl,
  floatingEl,
});

useEscapeKey(context);
useRole(context, { role: "dialog" });
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(true, 'anchor-click', $event)">
    Open dialog
  </button>

  <div v-if="context.state.open.value" ref="floatingEl" class="dialog">
    <button @click="context.state.setOpen(false, 'programmatic', $event)">Close</button>
  </div>
</template>
```

## See Also

- [usePosition](/api/use-position) - Opt into JavaScript positioning
- [useClick](/api/use-click) - Click-based activation
- [Floating Context](/guide/floating-context) - Context mental model
