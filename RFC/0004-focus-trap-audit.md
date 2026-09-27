# RFC 0004: Focus Trap Audit and Native Hardening

- **Date**: 2026-09-20
- **Relevant Subsystems**: `use-focus-trap`, `tabbable`, `inert-stack`

---

## 1. The problem

An audit of VFloat's initial focus trap against `focus-trap 8.2.2` revealed four critical containment and DOM state bugs:

1. Container-only listeners leak focus. Keydown Tab wrapping and microtask focus pull-back were attached directly to the floating container. If focus escaped to `document.body` or the browser address bar, the container listener never fired, allowing Tab to move freely through the background page.
2. Tabbable candidate blind spots. The DOM query missed `iframe` elements, property-set `tabIndex` without attributes, content inside closed `<details>` tags, and `<fieldset disabled>` descendants without first-`<legend>` exemptions. Radio group checks were document-wide, allowing outside radios to suppress inside radios.
3. Multi-trap isolation collisions. Multiple open dialogs applied `inert` and `aria-hidden` attributes to sibling elements without reference counting. When a child dialog closed, it stripped `inert` attributes that the parent dialog still needed.
4. Permanent DOM mutations. Returning focus to a non-focusable trigger permanently injected `tabindex="-1"` into the consumer's host element.

```html
<!-- Problem: Listener on floatingEl never intercepts Tab once focus hits body -->
<div ref="floatingEl" @keydown="onTab">
  <!-- Content inside closed details mistakenly treated as tabbable -->
  <details>
    <button>Hidden action</button>
  </details>
</div>

<!-- Problem: Closing Child Dialog strips inert from Host App, leaving Parent exposed -->
<div id="app" inert>...</div>
<div id="parent-dialog">...</div>
<div id="child-dialog">...</div>
```

---

## 2. The proposed solution

Do not add `focus-trap` or `tabbable` as external dependencies. VFloat is a zero-dependency, Vue 3.5 reactive headless engine. External libraries add roughly 7.5 kB min+gzip, manipulate the DOM imperatively, and access `window` during module load, which breaks SSR.

Instead, harden VFloat's native `useFocusTrap` composable around five core mechanics:

1. Document-level capture routing. Listen for `keydown` (Tab) and `focusin` on `targetDocument` in the capture phase. Wrap Tab across boundaries even if focus escaped to `body`, and pull focus back synchronously into the active container before screen readers announce background elements.
2. Reference-counted inert stack. Track outside element isolation through a global `inert-stack` registry with reference counts per element. Stacked modals increment counts; closing a top modal decrements counts without removing isolation needed by lower modals.
3. LIFO modal trap stack. Register open modal traps in a per-document stack. Only the topmost modal handles Tab containment, automatically yielding and resuming as dialogs open and close.
4. Standards-compliant tabbability. Inspect `iframe` elements, property-set `tabIndex`, closed `<details>`, and `<fieldset disabled>` hierarchies with first-`<legend>` exemptions. Scope radio group queries to the trap container.
5. Transient attribute cleanup. When temporary `tabindex="-1"` attributes are added to arbitrary trigger targets or fallback containers, remove them immediately after focus moves.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFloatingNode, useFocusTrap } from 'v-float';

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });

useFocusTrap(node, {
  modal: true,
  returnFocus: true,
  preventScroll: true,
});
</script>

<template>
  <button ref="anchorEl" @click="node.open.value = !node.open.value">
    Open Settings
  </button>
  <div v-if="node.open.value" ref="floatingEl" role="dialog" aria-modal="true">
    <h2>Settings</h2>
    <input type="text" placeholder="Username" />
    <button @click="node.open.value = false">Save</button>
  </div>
</template>
```

---

## 3. What we killed (do not implement)

| Discarded concept | Why we dropped it |
| :--- | :--- |
| **`focus-trap` dependency** | Adds 7.5 kB min+gzip, duplicates state tracking, and accesses `window` at module evaluation time. |
| **`tabbable` dependency** | Adds an external package for small DOM traversal algorithms that fit cleanly into zero-dependency TypeScript. |
| **Microtask-deferred focus pull-back** | Using `queueMicrotask` on `focusout` creates a one-frame window where screen readers announce outside content. Synchronous capture `focusin` fixes this. |
| **Permanent `tabindex="-1"` injection** | Leaving `tabindex="-1"` on triggers pollutes host DOM attributes and disrupts subsequent keyboard tab orders. |
| **Shadow DOM piercing traversal** | Piercing shadow boundaries adds recursive overhead and edge-case fragility unnecessary for standard floating surfaces. |
| **Imperative pause/unpause methods** | Reactive state (`node.open`) drives the trap lifecycle directly. Exposing imperative pause controls creates dual sources of truth. |

---

## 4. API and types

```ts
import type { MaybeRefOrGetter, Ref } from 'vue';
import type { FloatingNode } from '@/composables/floating-node';

export interface UseFocusTrapOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  modal?: MaybeRefOrGetter<boolean>;
  initialFocus?:
    | HTMLElement
    | Ref<HTMLElement | null>
    | (() => HTMLElement | null | false)
    | false;
  returnFocus?: MaybeRefOrGetter<boolean | HTMLElement | Ref<HTMLElement | null>>;
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;
  preventScroll?: MaybeRefOrGetter<boolean>;
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
  onError?: (error: unknown) => void;
}

export interface UseFocusTrapReturn {
  isActive: Readonly<Ref<boolean>>;
  activate: () => void;
  deactivate: () => void;
}

export function useFocusTrap(
  node: FloatingNode,
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn;
```

---

## 5. Verification plan

- Unit tests (`tabbable.test.ts`): Verify candidate detection for `iframe`, property-set `tabIndex`, closed `<details>`, `<fieldset disabled>` with legend exemptions, and scoped radio groups.
- Unit tests (`inert-stack.test.ts`): Verify reference-counted isolation across multiple simulated dialogs, ensuring sibling dialogs do not strip shared `inert` markers.
- Vitest Browser Mode tests (`use-focus-trap.test.ts`): Validate forward and backward Tab wrapping, synchronous pull-back when focus targets outside elements, LIFO trap precedence, and trigger focus restoration.
- SSR validation (`pnpm run test:ssr`): Ensure `useFocusTrap` evaluates safely in Node environments without accessing `window` or `document`.
