# RFC 0003: Anchor-Keyboard Navigation Bridge & Focus Lifecycle Coordination

- **Start Date**: 2026-09-15
- **Status**: Proposed
- **Target Version**: VFloat 1.0 / Next Minor
- **Relevant Subsystems**: `keyboard-navigation`, `roving-focus`, `aria-activedescendant`, `typeahead`, `dismiss`, `floating-node`

---

## 1. Executive Summary

VFloat provides high-performance, headless composables for physical roving focus (`useRovingFocus`) and virtual focus (`useAriaActivedescendant`). However, a critical boundary gap remains in the interaction lifecycle: **coordination between the trigger element (`anchorEl`) and the floating list (`floatingEl`)**.

Currently:
1. When closed, trigger elements ignore `ArrowDown` and `ArrowUp` keystrokes because list listeners only bind to `floatingEl`.
2. When a floating panel mounts asynchronously via `v-if="open"`, physical DOM focus cannot be immediately acquired on the same tick without consumer-side `nextTick` boilerplate.
3. When a roving-focus popup closes (via `Escape`, outside click, or selection), physical focus drops to `document.body` instead of safely returning to `anchorEl`.
4. Non-modal popups lack a coordinated `Tab` key departure protocol.
5. 2D grid widgets (calendars, color pickers, emoji pickers) lack matrix navigation.
6. Closed `<select>`-style anchor triggers cannot coordinate typeahead queries with unmounted lists.

This RFC introduces the **Anchor-Keyboard Navigation Bridge and Focus Lifecycle Protocol** to provide seamless, zero-boilerplate WAI-ARIA APG compliance across all VFloat composite widgets.

---

## 2. Core Motivation & Problem Analysis

In WAI-ARIA Authoring Practices (APG), keyboard interaction is a continuous state machine spanning both the anchor and the floating panel:

```
┌─────────────────┐       ArrowDown / ArrowUp        ┌────────────────────────────┐
│                 │ ───────────────────────────────> │  Floating List Surface     │
│  Anchor Trigger │                                  │  • Physical Roving Focus   │
│  (Button/Input) │ <─────────────────────────────── │  • Virtual Activedescendant│
└─────────────────┘       Escape / Select / Tab      └────────────────────────────┘
```

### The Two Distinct Interaction Models

| Modality | Physical Roving Focus (`useRovingFocus`) | Virtual Focus (`useAriaActivedescendant`) |
| :--- | :--- | :--- |
| **Primary Widgets** | Menus, MenuButtons, Selects, Toolbars, Tabs | Comboboxes, Autocompletes, Searchable Selects |
| **Trigger Element** | `<button>`, menuitem, or custom trigger | `<input type="text">`, `<textarea>`, or editable node |
| **Focus Invariant** | DOM focus moves *into* list items (`tabindex="0"`) | DOM focus **never leaves** the input trigger |
| **`ArrowDown` on Anchor** | Opens popup + focuses **item `0`** | Opens popup + sets **`activeIndex = 0`** |
| **`ArrowUp` on Anchor** | Opens popup + focuses **item `N-1`** | Opens popup + sets **`activeIndex = N-1`** |
| **`Alt + ArrowDown`** | Opens popup + focuses entry index | Opens popup without displacing caret/selection |
| **`Alt + ArrowUp`** | Closes popup + returns focus to anchor | Closes popup (focus remains on input) |
| **On Close (Escape / Select)** | Returns DOM focus to `anchorEl` | Keeps DOM focus on `anchorEl` |

---

## 3. The Architecture: 6 Core Pillars

```
                                 User on Anchor Element
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
         [Physical Roving Focus]                         [Virtual Active Descendant]
          (useRovingFocus)                                (useAriaActivedescendant)
                    │                                               │
  • ArrowDown -> Open + Queue Pending: 'first'    • ArrowDown -> Open + activeIndex = 0
  • ArrowUp   -> Open + Queue Pending: 'last'     • ArrowUp   -> Open + activeIndex = N-1
  • Enter/Spc -> Open + Queue Pending: 'entry'    • Alt+Down  -> Open (preserve active)
                    │                                               │
           [v-if Post-Mount]                               [Virtual DOM Sync]
        watchPostEffect(elementsList)                aria-activedescendant synced
       -> Focus resolved element                    DOM focus remains on <input>
                    │                                               │
        [Return Focus on Close]                                     │
    open: false -> anchorEl.focus()                                 │
```

---

### Pillar 1: The Anchor-to-List Trigger Protocol

Both `useRovingFocus` and `useAriaActivedescendant` receive `node: FloatingNode` as their primary argument and have reactive access to `node.refs.anchorEl` and `node.open`.

By binding focused `keydown` listeners to `anchorEl`:

1. **`useRovingFocus` Anchor Trigger**:
   - `ArrowDown` (closed): Calls `node.setOpen(true, "keyboard-activate", e)` and registers pending focus as `"first"`.
   - `ArrowUp` (closed): Calls `node.setOpen(true, "keyboard-activate", e)` and registers pending focus as `"last"`.
   - `Enter` / `Space` (closed, on custom anchor): Calls `node.setOpen(true, "keyboard-activate", e)` and registers pending focus as `"entry"`.

2. **`useAriaActivedescendant` Anchor Trigger**:
   - `ArrowDown` (closed): Calls `node.setOpen(true, "keyboard-activate", e)` and sets `activeIndex = 0`.
   - `ArrowUp` (closed): Calls `node.setOpen(true, "keyboard-activate", e)` and sets `activeIndex = total - 1`.
   - `Alt + ArrowDown` (closed): Calls `node.setOpen(true, "keyboard-activate", e)` without moving `activeIndex`.
   - `Alt + ArrowUp` (open): Calls `node.setOpen(false, "keyboard-exit", e)`.

Controlled via `openOnArrowKeys: MaybeRefOrGetter<boolean>` (default: `true`).

---

### Pillar 2: Asynchronous Mount Focus Handoff (`v-if` Queue)

In Vue, floating lists are predominantly rendered with `v-if="open"`. When `node.setOpen(true)` executes:
1. `node.open.value` becomes `true`.
2. The floating template element is not yet created in the DOM.
3. `elementsList.value` is empty (`[]`).

`useRovingFocus` implements a resilient **Post-Mount Pending Focus Queue**:

```typescript
let pendingFocusTarget: "first" | "last" | "entry" | number | null = null;

watchPostEffect(() => {
  if (!node.open.value || pendingFocusTarget === null) return;
  const list = toValue(elementsList);
  if (list.length === 0) return; // Wait for elements to mount

  let targetIndex: number | null = null;

  if (typeof pendingFocusTarget === "number") {
    targetIndex = pendingFocusTarget;
  } else if (pendingFocusTarget === "first") {
    targetIndex = resolveNavigableIndexByIntent("first", null, list.length, (i) => !isNavigable(i), false);
  } else if (pendingFocusTarget === "last") {
    targetIndex = resolveNavigableIndexByIntent("last", null, list.length, (i) => !isNavigable(i), false);
  } else if (pendingFocusTarget === "entry") {
    targetIndex = tabStopIndex.value;
  }

  pendingFocusTarget = null;
  if (targetIndex !== null && targetIndex >= 0) {
    focusIndex(targetIndex);
  }
});
```

This guarantees that physical focus transitions into the list smoothly on the exact tick items mount, with zero user-land `nextTick` calls.

---

### Pillar 3: Deterministic Return Focus on Close

When a physical roving focus widget closes, the focused list item is destroyed. Without active focus management, the browser resets active focus to `document.body`.

`useRovingFocus` implements **Automatic Return Focus**:

```typescript
watch(node.open, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    const doc = containerEl.value?.ownerDocument ?? document;
    const active = doc.activeElement;
    const isFocusInside = active && containerEl.value?.contains(active);

    if (isFocusInside && toValue(returnFocus ?? true)) {
      const anchor = resolveAnchorElement(node.refs.anchorEl.value);
      anchor?.focus({ preventScroll: true });
    }
    reset();
  }
});
```

Controlled via `returnFocus: MaybeRefOrGetter<boolean>` (default: `true`).

---

### Pillar 4: Non-Modal `Tab` Key Departure Protocol

Per WAI-ARIA APG, when focused inside a non-modal dropdown or menu:
1. Pressing `Tab` must close the dropdown.
2. Focus must naturally advance to the **next tabbable element in the page after the anchor** (or previous with `Shift+Tab`).

`useRovingFocus` registers a dedicated `Tab` handler on `containerEl`:

```typescript
useEventListener(containerEl, "keydown", (e: KeyboardEvent) => {
  if (e.key !== "Tab" || e.defaultPrevented || !isEnabled.value || !toValue(closeOnTab ?? true)) {
    return;
  }

  // Close the node but DO NOT preventDefault, allowing native Tab navigation
  node.setOpen(false, "tab-key", e);
});
```

Controlled via `closeOnTab: MaybeRefOrGetter<boolean>` (default: `true`).

---

### Pillar 5: 2D Matrix / Grid Navigation Protocol

To support 2D surfaces such as **Datepickers (calendar grids)**, **Color Pickers**, and **Emoji Pickers**, both `useRovingFocus` and `useAriaActivedescendant` support a `cols` option:

- `ArrowLeft` / `ArrowRight`: Step $\pm 1$ column (respecting RTL).
- `ArrowUp` / `ArrowDown`: Step $\pm \text{cols}$ (e.g. $\pm 7$ days in a datepicker).
- `Home` / `End`: Jump to row start / row end.
- `PageUp` / `PageDown`: Step by page size or month delta.

```typescript
export interface GridNavigationOptions {
  /**
   * Number of columns in the 2D grid matrix.
   * When specified, ArrowUp/ArrowDown jump by column count.
   */
  cols?: MaybeRefOrGetter<number>;

  /**
   * Wrapping strategy at matrix boundaries:
   * - `'grid'`: ArrowRight at the end of a row wraps to the start of the next row.
   * - `'row'`: ArrowRight stops at row boundaries.
   * - `'none'`: No boundary wrapping.
   * @default 'grid'
   */
  wrap?: MaybeRefOrGetter<"grid" | "row" | "none">;
}
```

---

### Pillar 6: Closed Anchor Typeahead Coordination (`useTypeahead`)

When a user types on a closed `<select>`-style button trigger:
1. `useTypeahead` captures the printable key on `anchorTarget`.
2. Buffers keystrokes and locates the matched item index.
3. If `openOnMatch: true`, calls `node.setOpen(true, "keyboard-activate")` and passes the match index to the pending focus queue.
4. If `openOnMatch: false` (default), fires `onMatch(index)` so the consumer can update the selected value directly without opening the dropdown (native `<select>` parity).

```typescript
export interface UseTypeaheadOptions {
  // ... existing options ...

  /**
   * Whether matching a query on a closed anchor automatically opens the floating node
   * and focuses the matched item.
   * @default false
   */
  openOnMatch?: MaybeRefOrGetter<boolean>;
}
```

---

## 4. Public API Specifications

### 4.1. Extended `UseRovingFocusOptions`

```typescript
export interface UseRovingFocusOptions {
  // --- Core Elements & State ---
  elementsList: MaybeRefOrGetter<Array<HTMLElement | null>>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  activeIndex?: Ref<number>;
  entryIndex?: MaybeRefOrGetter<number | null | undefined>;
  entryFocusMode?: RovingEntryFocusMode;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  loop?: MaybeRefOrGetter<boolean>;
  pageSize?: MaybeRefOrGetter<number>;
  rtl?: MaybeRefOrGetter<boolean>;
  enabled?: MaybeRefOrGetter<boolean>;
  focusOnHover?: MaybeRefOrGetter<boolean>;
  focusDisabledElements?: MaybeRefOrGetter<boolean>;

  // --- 🆕 Anchor Coordination & Focus Lifecycle ---

  /**
   * Whether pressing ArrowDown or ArrowUp on the anchor opens the floating node
   * and focuses the boundary item.
   * @default true
   */
  openOnArrowKeys?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to automatically return DOM focus to the anchor element when the
   * floating node closes.
   * @default true
   */
  returnFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Whether pressing Tab inside the floating element closes the node and lets
   * focus advance to the next sequential document tab stop.
   * @default true
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Number of columns for 2D matrix navigation (e.g. 7 for datepicker calendars).
   * When omitted, navigation remains 1D linear.
   */
  cols?: MaybeRefOrGetter<number>;

  // --- Callbacks ---
  onSelect?: (index: number, event: KeyboardEvent) => void;
  onEnter?: (index: number, event: KeyboardEvent) => boolean | void;
  onExit?: (index: number, event: KeyboardEvent) => boolean | void;
  onActiveIndexChange?: (index: number) => void;
}
```

### 4.2. Extended `UseAriaActivedescendantOptions`

```typescript
export interface UseAriaActivedescendantOptions {
  // --- Core Elements & State ---
  targetEl?: MaybeRefOrGetter<HTMLElement | null>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  elementsList?: MaybeRefOrGetter<Array<HTMLElement | null>>;
  itemCount?: MaybeRefOrGetter<number>;
  activeIndex?: Ref<number>;
  defaultIndex?: number;
  idPrefix?: string;
  getItemId?: (index: number) => string;
  getItemKey?: (index: number) => string | number;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  loop?: MaybeRefOrGetter<boolean>;
  pageSize?: MaybeRefOrGetter<number>;
  rtl?: MaybeRefOrGetter<boolean>;
  enabled?: MaybeRefOrGetter<boolean>;
  scrollIntoView?: MaybeRefOrGetter<boolean>;
  editable?: MaybeRefOrGetter<boolean | "auto">;
  focusOnHover?: MaybeRefOrGetter<boolean>;
  focusDisabledElements?: MaybeRefOrGetter<boolean>;
  virtualizer?: VirtualizerAdapter;

  // --- 🆕 Anchor Coordination & 2D Matrix ---

  /**
   * Whether pressing ArrowDown or ArrowUp on a closed anchor opens the floating surface
   * and highlights the initial item.
   * @default true
   */
  openOnArrowKeys?: MaybeRefOrGetter<boolean>;

  /**
   * Whether Alt + ArrowDown / Alt + ArrowUp opens and closes the popup.
   * @default true
   */
  altKeyNavigation?: MaybeRefOrGetter<boolean>;

  /**
   * Number of columns for 2D matrix virtual focus navigation.
   */
  cols?: MaybeRefOrGetter<number>;

  // --- Callbacks ---
  onSelect?: (index: number, event: KeyboardEvent) => void;
  onActiveIndexChange?: (index: number) => void;
  isKeyHandled?: (event: KeyboardEvent) => boolean;
}
```

---

## 5. Backward Compatibility & Rollout Strategy

1. **Zero Breaking Changes:** All additions are strictly additive with safe, APG-compliant defaults.
2. **Opt-Out Safety:** Consumers with specialized or nested custom interaction models can set `openOnArrowKeys: false`, `returnFocus: false`, or `closeOnTab: false`.
3. **SSR Safety:** All anchor and container listeners use VFloat's SSR-safe `useEventListener` without accessing bare globals during setup.
4. **Clean Decoupling:** `useClick` remains the owner of primary click and Enter/Space activation; navigation composables own directional triggers and focus transitions.

---

## 6. Verification Plan

### Test Suites to Expand

1. **`use-roving-focus.test.ts` (Tier S Component Tests)**:
   - Pressing `ArrowDown` on anchor opens closed node and shifts DOM focus to item `0` after `v-if` mount.
   - Pressing `ArrowUp` on anchor opens closed node and shifts DOM focus to item `N-1`.
   - Closing node via Escape, click-outside, or programmatic `setOpen(false)` restores focus to `anchorEl`.
   - Pressing `Tab` inside floating element closes node with reason `"tab-key"`.
   - 2D grid matrix navigation with `cols: 7` jumps by row/col correctly.

2. **`use-aria-activedescendant.test.ts` (Tier S Component Tests)**:
   - Pressing `ArrowDown` on closed input opens node and sets `aria-activedescendant` to item `0` while DOM focus stays on input.
   - Pressing `ArrowUp` on closed input opens node and sets `aria-activedescendant` to last item.
   - `Alt + ArrowDown` opens listbox without modifying `activeIndex`.
   - `Alt + ArrowUp` closes listbox.

3. **`use-typeahead.test.ts` (Tier S Component Tests)**:
   - Typing on closed anchor with `openOnMatch: true` opens popup and focuses matched item.
   - Typing on closed anchor with `openOnMatch: false` emits `onMatch` without opening popup.
