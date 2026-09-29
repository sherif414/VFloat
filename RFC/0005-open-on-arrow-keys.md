# RFC 0005: Open on Arrow Keys Interaction

- **Date**: 2026-09-29
- **Relevant Subsystems**: `keyboard-navigation` (`use-roving-focus`, `use-aria-activedescendant`), `floating-node`

---

## 1. The problem

Today, VFloat's keyboard navigation composables (`useRovingFocus` and `useAriaActivedescendant`) only process navigation keystrokes after the floating surface is already open. `useRovingFocus` binds keydown listeners exclusively to `containerEl` (`floatingEl`), while `useAriaActivedescendant` binds to `targetEl` (`anchorEl`) but never mutates `node.open.value`.

When a menu or select trigger button is focused and closed, pressing `ArrowDown` or `ArrowUp` does nothing. To comply with WAI-ARIA APG patterns (Menu Button, Listbox, and Combobox), consumers are forced to author bespoke keyboard trigger handlers on their anchor elements to open the popup and manually coordinate which item to focus:

```vue
<!-- Today: manual wiring and race conditions across unmounted elements -->
<script setup lang="ts">
const node = useFloatingNode({ anchorEl, floatingEl });
const { focusIndex } = useRovingFocus(node, { elementsList });

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    node.open.value = true;
    nextTick(() => focusIndex("first"));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    node.open.value = true;
    nextTick(() => focusIndex("last")); // Fails if elementsList is not yet populated
  }
}
</script>
```

This leads to fragile `nextTick` chains, race conditions with `v-if="open"` collections where `elementsList` is empty at keystroke time, and boilerplate duplication across every menu and select component.

---

## 2. The proposed solution

Integrate `openOnArrowKeyDown` directly into the keyboard navigation composables (`useRovingFocus` and `useAriaActivedescendant`). Because navigation composables already receive `node: FloatingNode` (which exposes `node.refs.anchorEl` and `node.open`), they can bind a keydown listener to the anchor when closed.

### Staged Entry Intent

To solve the `v-if="open"` lifecycle barrier where `elementsList` is empty when the keystroke occurs:

1. When `!node.open.value` and an arrow key is pressed on the anchor:
   - `ArrowDown` stages a pending entry intent of `"first"`.
   - `ArrowUp` stages a pending entry intent of `"last"`.
   - `Alt + ArrowDown` (in comboboxes) stages entry without moving active selection.
2. Synchronously sets `node.open.value = true`.
3. When the floating element mounts and `elementsList` registers its items, the pending entry intent resolves immediately:
   - **For `useRovingFocus`**: Sets `tabStopIndex` to the target item and imperatively moves DOM focus (`focusIndex(target)`). Standalone menus do not use `useFocusTrap` (per WAI-ARIA, menus close on `Tab`, never trap it), so `useRovingFocus` must own shifting focus into the menu.
   - **For `useAriaActivedescendant`**: Real DOM focus remains on the anchor `<input>`, while `activeIndex` resolves to `0` or `totalCount - 1`.

### Consumer Experience

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, useRovingFocus } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const elementsList = ref<Array<HTMLElement | null>>([]);

const node = useFloatingNode({ anchorEl, floatingEl });
useClick(node);
useDismiss(node);

// Declarative, automatic WAI-ARIA APG anchor opening and entry coordination
const { getTabindex } = useRovingFocus(node, {
  elementsList,
  openOnArrowKeyDown: true,
});
</script>

<template>
  <button ref="anchorEl">Actions</button>
  <div v-if="node.open.value" ref="floatingEl" role="menu">
    <button
      v-for="(item, i) in items"
      :key="item"
      :ref="(el) => (elementsList[i] = el as HTMLElement)"
      :tabindex="getTabindex(i)"
      role="menuitem"
    >
      {{ item }}
    </button>
  </div>
</template>
```

---

## 3. What we killed (do not implement)

| Discarded concept | Why we dropped it |
| :--- | :--- |
| **Put `openOnArrow` in `useClick`** | `useClick` has zero knowledge of `elementsList`, `activeIndex`, or roving tab stops. It cannot distinguish focusing first item on `ArrowDown` vs last item on `ArrowUp`, and combobox inputs do not use `useClick`. |
| **Rely on `useFocusTrap` for initial focus** | Menus and composite widgets do not use `useFocusTrap` (menus close on `Tab`, not trap it). Coupling initial arrow focus to `useFocusTrap` breaks standalone `useRovingFocus` menus. `useRovingFocus` must move DOM focus itself upon resolving staged entry intents. |
| **Separate `useKeyboardTrigger` composable** | Excessive boilerplate. Requires users to instantiate and manually pass navigation instances between two hooks, creating extra friction for standard WAI-ARIA baseline behavior. |
| **Attach listeners in `useRole`** | Violates VFloat architecture. `useRole` is strictly an ARIA DOM attribute synchronizer, not an interaction handler. |
| **Immediate index resolution at keydown** | When closed, floating contents are unmounted (`v-if="open"`). Resolving `elementsList.length - 1` at keydown time yields `-1` because elements are not yet mounted. Staged entry intents solve this cleanly. |

---

## 4. API and types

### `useRovingFocus` Options

```ts
export interface UseRovingFocusOptions {
  // ... existing options

  /**
   * Whether pressing an arrow key on the anchor element opens the floating element when closed.
   * - `true`: ArrowDown opens and targets first item; ArrowUp opens and targets last item.
   * - `false`: Arrow keys on anchor are ignored.
   * - Predicate: `(event: KeyboardEvent) => boolean`.
   * @default false
   */
  openOnArrowKeyDown?: boolean | ((event: KeyboardEvent) => boolean);
}
```

### `useAriaActivedescendant` Options

```ts
export interface UseAriaActivedescendantOptions {
  // ... existing options

  /**
   * Whether pressing an arrow key on the target element opens the floating element when closed.
   * - `true`: ArrowDown opens and targets first item; ArrowUp opens and targets last item; Alt+ArrowDown opens without moving virtual focus.
   * - `false`: Arrow keys when closed are ignored.
   * - Predicate: `(event: KeyboardEvent) => boolean`.
   * @default true
   */
  openOnArrowKeyDown?: boolean | ((event: KeyboardEvent) => boolean);
}
```

---

## 5. Verification plan

- **Unit & Logic Tests**:
  - Verify `resolveKeyIntent` respects orientation and RTL when evaluating arrow triggers on anchor.
  - Verify staged entry intents resolve correctly when `elementsList` transitions from `0` to $N$ elements.
  - Verify disabled items at boundaries are skipped (e.g. if item 0 is disabled, `ArrowDown` lands on item 1).
- **Vitest Browser Mode Tests**:
  - Test Menu Button: Pressing `ArrowDown` on anchor opens menu with DOM focus shifted to item 0.
  - Test Menu Button: Pressing `ArrowUp` on anchor opens menu with DOM focus shifted to item $N - 1$.
  - Test Combobox: Pressing `ArrowDown` in `<input>` opens suggestions with `aria-activedescendant` on first item while DOM focus stays on `<input>`.
  - Test Combobox: Pressing `Alt + ArrowDown` opens suggestions without setting active descendant (`-1`).
  - Test IME composition (`useComposition`): Arrow keys during active IME composition do not trigger opening.
- **SSR Check**:
  - Run `pnpm test:ssr` to confirm anchor listeners are SSR-safe and clean up on scope dispose.
