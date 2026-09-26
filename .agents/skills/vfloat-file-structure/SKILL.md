---
name: vfloat-file-structure
description: >-
  Enforce unified file structure, vertical feature cohesion, and strict module encapsulation across VFloat composables and utilities in packages/vue/src/. Use when authoring new composables, refactoring existing modules, reviewing file layout, standardizing section banners and feature dividers, or organizing logic inside composables.
---

# VFloat File Structure & Module Organization

This skill defines the architectural standards, file layouts, and internal code organization for all composables and helper modules in the VFloat repository.

---

## 1. Architectural Philosophy: Vertical Feature Cohesion

Traditional UI libraries often arrange code horizontally by technical type: all refs at the top, followed by all computed values, then all event handlers, and finally all watchers at the bottom. In complex composables, this pattern fragments single capabilities across hundreds of lines, forcing developers to jump repeatedly through a file to understand or modify one behavior.

VFloat enforces **Vertical Feature Cohesion**: each distinct capability owns its entire vertical slice from configuration to DOM synchronization.

```
composable()
│
├── Shared Options & Environment   (Only options used in 2+ feature blocks, root DOM targets, lifecycle refs)
│
├── Feature Block 1                (Feature-scoped option computed + local state + actions + watchers/listeners)
│
├── Feature Block 2                (Feature-scoped option computed + local state + actions + watchers/listeners)
│
├── Feature Block N                (Feature-scoped option computed + local state + actions + watchers/listeners)
│
└── Public Return Statement        (Exposes consolidated public state, actions, and element bindings)
```

Code that changes together lives together. A single capability can be inspected, refactored, or isolated without touching unrelated feature blocks.

---

## 2. The 5-Stage Module Sequence

Every TypeScript file in `packages/vue/src/` must follow this exact top-to-bottom sequence:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Imports (External -> Internal Aliases -> Relative)           │
├─────────────────────────────────────────────────────────────────┤
│ 2. File-Private Declarations (Unexported constants & types)     │
├─────────────────────────────────────────────────────────────────┤
│ 3. 📌 Main (Exported composable + module-level coordination)    │
├─────────────────────────────────────────────────────────────────┤
│ 4. 📌 Helpers (Pure, idempotent calculation & lookup utilities) │
├─────────────────────────────────────────────────────────────────┤
│ 5. 📌 Types (Publicly exported interfaces: Context, Return, Opts)│
└─────────────────────────────────────────────────────────────────┘
```

### Stage 1: Imports
Organize imports in three distinct groups separated by single blank lines:
1. **External Third-Party**: Vue core APIs (`computed`, `shallowRef`, `toValue`, `watch`), Floating UI packages.
2. **Internal Aliases (`@/...`)**: Composable dependencies (`@/composables/...`), shared utilities (`@/shared/dom`, `@/shared/env`, `@/shared/lifecycle`).
3. **Relative Sibling Imports (`./...`)**: Internal helper modules residing within the same feature directory (`./polygon`, `./intent`, `./navigation`).

### Stage 2: File-Private Declarations
Declare module-level constants, lookup tables, and private types required across the file.
- **Strictly Unexported**: Never add `export` to module constants, bitmasks, or local working interfaces.
- **Placement**: Placed above the `📌 Main` section banner.

### Stage 3: 📌 Main
Contains the primary exported composable function (`useXxx`) and any impure module-level coordination logic.
- **Coordination Logic**: Code that manages per-document event multiplexing, shared gesture stacks, or document-level listeners belongs directly under `📌 Main`. Coordination logic performs side effects, so it must never be placed in `📌 Helpers`.
- **Capability Dividers**: When `📌 Main` contains two or more module-level capabilities after the composable function, group them using unindented capability dividers.

### Stage 4: 📌 Helpers
Contains module-level private helper functions and calculation utilities.
- **Pure and Idempotent Only**: Every function in this section must be completely pure, stateless, and idempotent. Zero DOM mutations, zero ref updates, and zero Vue reactive scopes (`watch`, `effectScope`).
- **Strictly Unexported**: Helper functions are private to the file. Use `function helperName(...)`, never `export function helperName(...)`.
- **Omission Rule**: If a module defines no pure helpers, omit the `📌 Helpers` banner entirely. Never leave an empty banner.

### Stage 5: 📌 Types
Contains publicly exported TypeScript interfaces and types for the composable.
- **Standard Sequence**:
  1. `UseXContext` (if the composable requires context or extends a specific node shape).
  2. `UseXReturn` (the shape of the returned public object, if returning state or methods).
  3. `UseXOptions` (configuration options interface, with JSDoc comments on every property).
- **Public Contracts Only**: Internal working interfaces or helper parameter shapes belong in Stage 2 as unexported declarations.
- **Omission Rule**: If a file defines no public types, omit the `📌 Types` banner entirely. Never leave an empty banner.

---

## 3. Visual Markers & Formatting Rules

### Module-Level Section Banners
Module banners separate the top-level stages of the file: `📌 Main`, `📌 Helpers`, and `📌 Types`.

- **Width**: Exactly 89 characters (`//` followed by 87 `=` characters).
- **Authorized Banners**: Only `📌 Main`, `📌 Helpers`, and `📌 Types` are permitted.
- **Omission Rule**: Never output empty banners. If a section contains no code, do not render its banner.

```typescript
//=======================================================================================
// 📌 Main
//=======================================================================================
```

### Feature Dividers (Inside Functions)
Internal feature dividers group cohesive capabilities inside large composables.

- **Format**: Single-line dashed comment padded to exactly 80 characters total: `// --- Feature Name ---`.
- **Indentation**: Indented to match the composable function body (2 spaces).
- **Spacing**: Always leave exactly 1 empty line between the divider and the first line of code.
- **Usage Rule**: Use only in Tier 2 composables (100+ lines or multi-feature). Single-concern Tier 1 composables must not use feature dividers.

```typescript
  // --- Pointer Hover Activation ------------------------------------------------

  const showDelay = computed(() => resolveDelay(toValue(options.delay), "open"));
  let hoverTimerId: ReturnType<typeof setTimeout> | undefined;
```

### Module-Level Capability Dividers (Under `📌 Main`)
Used when module-level coordination code below the primary composable owns two or more distinct capabilities (such as document listener multiplexing and stack coordination).

- **Format**: Single-line dashed comment padded to exactly 80 characters total.
- **Indentation**: Unindented at column 0.
- **Spacing**: Always leave exactly 1 empty line between the divider and the first line of code.
- **Usage Rule**: Use only when `📌 Main` contains two or more coordination capabilities. If `📌 Main` contains only the composable function, do not add dividers.

```typescript
// --- Document Listener & Stack Coordination ----------------------------------

function syncDocumentListeners(doc: Document): void {
  // ...
}
```

### Divider Naming Standards
Divider names must answer: **What user-facing behavior or domain capability does this block implement?**

- **Rule 1: Name the Capability, Not the Code Type**: Never use generic technical labels like `State`, `Handlers`, `Watchers`, `Effects`, `Logic`, `Pointers`, `Helpers`, or `Listeners`.
- **Rule 2: Title Case Noun Phrases**: Use standard Title Case (for example, `Keyboard Navigation`, not `keyboard navigation`).
- **Rule 3: Use the Approved Formulas**:

| Formula | Pattern | Compliant Examples |
| :--- | :--- | :--- |
| **`[Modality / Trigger] + [Behavior]`** | User interaction + runtime outcome | `Pointer Hover Activation`, `Keyboard Navigation`, `Click Dismissal`, `Item Selection` |
| **`[Domain Subsystem] + [Capability]`** | Dedicated engine or subsystem logic | `Rest Detection`, `Safe Polygon Tracking`, `Focus Trapping`, `Search Buffer & Matcher` |
| **`[Target] + [Coordination / Sync]`** | Target element or environment sync | `DOM Focus & Tabindex Sync`, `Initial & Return Focus`, `Modal Inert Isolation` |

---

## 4. Composable Complexity Tiers

| Attribute | Tier 1: Single-Concern | Tier 2: Complex / Multi-Feature |
| :--- | :--- | :--- |
| **Size Threshold** | < 100 lines of implementation | 100+ lines or multiple user-facing capabilities |
| **Divider Usage** | No internal feature dividers | Internal feature dividers for each capability |
| **Flow Model** | Linear top-to-bottom sequence | Feature-based grouping (vertical cohesion) |
| **Options Scope** | All options normalized at top | Shared options at top; feature-scoped options in their blocks |

### Tier 1: Single-Concern Composables (< 100 lines)
Follows a clean linear flow separated only by blank lines:

1. **JSDoc**: Purpose, parameters (`@param node`, `@param options`), return value, and `@example`.
2. **Options Normalization**:
   - Dynamic options (`MaybeRefOrGetter<T>`): normalized into `computed` properties at the top.
   - Non-reactive static options: extracted via object destructuring with default values.
3. **Environment & Derived State**: Dynamic `ownerDocument`, `ownerWindow`, and reactive state refs.
4. **Action Handlers**: Pure logic and user action callbacks.
5. **DOM Wiring & Watchers**: `useEventListener`, `watch`, or `watchPostEffect`.
6. **Return Statement**: Public return object or `void`.

### Tier 2: Complex Composables (100+ lines or Multi-Feature)
Organize logic into vertical feature blocks using feature dividers:

1. **Shared Options & Environment**:
   - Contains ONLY options read across 2 or more distinct feature blocks.
   - Contains root DOM targets (`anchorEl`, `floatingEl`) and dynamic environment refs (`ownerDocument`, `ownerWindow`).
   - Contains root lifecycle state required by multiple blocks.
2. **Feature Blocks (Repeated per capability)**:
   - **Feature-Scoped Option Normalization**: Any option consumed exclusively within this feature block must be declared here, not in the shared root.
   - **Local State**: Non-reactive tracking variables, element-specific refs, and timer IDs.
   - **Action Methods**: Handlers and algorithms specific to this capability.
   - **Listeners & Watchers**: Dedicated event bindings and side-effect watchers for this capability alone.
3. **Public Return Statement**:
   - Aggregates public state refs, methods, and element bindings for consumer components.

---

## 5. Reactivity, Environment & Cross-Realm Invariants

### Options Normalization & Reactivity Economy
1. **Dynamic Options (`MaybeRefOrGetter<T>`)**:
   - Normalize once into a `computed` at the top of their owning block:
     ```typescript
     const isEnabled = computed(() => toValue(options.enabled) ?? true);
     ```
   - **Unwrapping Sequence**: Always write `toValue(options.prop) ?? default`, never `toValue(options.prop ?? default)`.
   - **No Inline Unwrapping**: Never inline `toValue(options.prop) ?? default` inside event handlers, watchers, or internal callbacks.
   - **No Suffix Renaming**: Never rename option variables with an `*Option` suffix (for example, avoid `enabledOption`).
2. **Non-Reactive Static Options**:
   - Destructure once with default values at the top of the block:
     ```typescript
     const { capture = true, event = "click" } = options;
     ```
3. **Initialization Seeds**:
   - Options that seed initial or uncontrolled state (for example, `initialIndex: number`, `defaultOpen: boolean`) must be plain non-reactive primitives, never `MaybeRefOrGetter`.
4. **DOM Element References**:
   - Always use `shallowRef()` for DOM node references to prevent unnecessary deep reactivity proxying.

### Single-Concern Separation for Watchers & Listeners
Never conflate multiple distinct responsibilities within a single `watch`, `watchPostEffect`, or event handler:

- **Separate State Correction from DOM Sync**: Auto-correcting reactive state (such as falling back when an item is removed) and syncing DOM attributes (such as writing `tabindex` or `aria-*`) must use separate watchers.
- **Separate Attribute Sync from Focus / Scroll**: Updating DOM attributes and moving DOM focus or triggering scrolling must reside in distinct watchers or dedicated feature blocks.
- **Decoupled Event Listeners**: Event listeners must not combine unrelated logic representing independent capabilities. Each capability block registers its own event listener.

### Cross-Realm (Iframe) & SSR Environment Safety
1. **Zero Bare Globals**:
   - Never access bare `window` or `document` directly in composable setup scopes or event handlers.
   - Always resolve dynamic owners from active elements:
     ```typescript
     const ownerDocument = computed(() => element.value?.ownerDocument ?? getDocument());
     const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());
     ```
   - Always import safe SSR fallbacks (`getDocument()`, `getWindow()`) from `@/shared/env`.
2. **Realm-Scoped Timers**:
   - Timers (`setTimeout`, `clearTimeout`, `requestAnimationFrame`, `cancelAnimationFrame`) must execute on the resolved `ownerWindow`, never on global `window`:
     ```typescript
     // Compliant:
     timerId = ownerWindow.value?.setTimeout(callback, delay);
     ownerWindow.value?.clearTimeout(timerId);
     ```
3. **Cross-Realm Type Checks**:
   - Never use bare `instanceof Element`, `instanceof HTMLElement`, or `instanceof Window`. Use `isElement(target)`, `isHTMLElement(target)`, or `isNode(target)` from `@/shared/dom`.
   - Prefer structural checks (`nodeType === 1`, string `tagName`) over prototype chain checks (`instanceof`).
   - Use `isElement` (not `isHTMLElement`) when target elements can be SVG nodes (such as SVG triggers or canvas anchors).

### TypeScript Contract Trust (Zero Defensive Boilerplate)
Trust TypeScript type contracts without adding defensive runtime fallbacks:
- If a parameter is typed as a non-nullable container (for example, `elements: MaybeRefOrGetter<Array<HTMLElement | null>>`), do not write `if (!elements) return` or `elements ?? []`.
- Distinguish container existence from element existence: the container is guaranteed; individual indexed lookups (`elements[i]`) require null checks before DOM property access (`el?.focus()`).
- Always prefer modern optional chaining (`options.onDismiss?.()`, `element?.isConnected`) over legacy pre-ES2020 truthy checks (`options.onDismiss && options.onDismiss()`).

---

## 6. Module Encapsulation & Export Discipline

Internals are functions, interfaces, types, constants, and variables used only within their defining module.

- **Zero Unconsumed Exports**: Never add `export` to an entity if it is not imported by an external file. Do not export symbols for speculative future reuse.
- **Composable File Exports**:
  - Export only the primary composable function (for example, `export function useHover(...)`).
  - Export only public companion types: `UseXContext`, `UseXReturn`, `UseXOptions`.
  - Keep helper functions, local constants, and working interfaces unexported.
- **Helper Functions in `📌 Helpers`**:
  - Helpers must remain unexported. Use `function helperName(...)`, never `export function helperName(...)`.
- **Internal Helper Modules**:
  - In internal multi-file directories (such as `hover/polygon/`), helper files must export only the specific symbols that collaborating files import.
  - Symbols used only within that helper file must stay unexported.
  - Never re-export internal helper modules or state classes from public entry points.
- **Never Export for Tests**:
  - Never export module internals solely to test them in isolation. Test behavior through the composable's public API.

---

## 7. Operational Workflows

### Workflow A: Authoring a New Composable
1. **Determine Complexity Tier**:
   - If the composable handles a single task under 100 lines, use Tier 1 (linear flow).
   - If the composable handles multiple user interactions, delayed timers, or exceeds 100 lines, use Tier 2 (vertical feature blocks).
2. **Draft the Top Sequence**:
   - Write external, alias, and relative imports.
   - Declare any module-level constants or private types in Stage 2.
   - Add the `//=======================================================================================` banner for `📌 Main`.
3. **Scaffold Composable Setup**:
   - Destructure static options with default values.
   - Normalize dynamic options consumed across multiple blocks into `computed` properties.
   - Resolve `ownerDocument` and `ownerWindow` from active elements.
4. **Implement Capabilities**:
   - For Tier 1: implement linear flow (options -> state -> actions -> watchers -> return).
   - For Tier 2: add feature dividers using approved formulas (`// --- Modality + Behavior ---`). In each block, declare feature-scoped options, local state, actions, and effects.
5. **Append Optional Sections**:
   - If pure calculation functions were extracted, add the `📌 Helpers` banner and write unexported pure functions.
   - If public types are exposed, add the `📌 Types` banner and export `UseXContext`, `UseXReturn`, and `UseXOptions` with full JSDoc.
   - Verify that neither banner is empty.

### Workflow B: Refactoring an Existing File
1. **Audit Section Sequence**:
   - Check against the 5-stage order: Imports -> File-Private -> `📌 Main` -> `📌 Helpers` -> `📌 Types`.
   - Move public types to the bottom and file-private constants to the top.
2. **Audit Section Banners & Dividers**:
   - Confirm section banners are exactly 89 characters wide.
   - Confirm feature dividers are exactly 80 characters wide with 1 empty line before code.
   - Remove any empty section banners (`📌 Helpers` or `📌 Types` with no contents).
3. **Convert Horizontal Layers to Vertical Cohesion**:
   - Identify distinct user-facing capabilities.
   - Move feature-scoped options, local state, handlers, and watchers into dedicated vertical blocks.
   - Replace generic divider labels (such as `// --- Handlers ---`) with capability titles (such as `// --- Pointer Hover Activation ---`).
4. **Isolate Feature-Scoped Options**:
   - Check options in `Shared Options & Environment`. If an option is used in only one feature block, move its computed declaration into that block.
5. **Split Conflated Watchers**:
   - If a watcher adjusts reactive indices and also modifies DOM attributes, split it into two dedicated watchers.
6. **Enforce Cross-Realm Safety**:
   - Replace direct `window.setTimeout` calls with `ownerWindow.value?.setTimeout`.
   - Replace bare `instanceof HTMLElement` with `isHTMLElement`.
7. **Clean Exports**:
   - Remove `export` from functions in `📌 Helpers`.
   - Remove `export` from internal types and constants.

---

## 8. Canonical Reference Archetypes

### Archetype 1: Tier 1 Single-Concern Composable

```typescript
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { isHTMLElement, isNode } from "@/shared/dom";
import { getDocument, getWindow } from "@/shared/env";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes the floating node when a scroll event occurs outside the floating tree.
 *
 * @param node - The floating node with open state and refs.
 * @param options - Configuration options for scroll dismissal.
 */
export function useScrollDismiss(
  node: FloatingNode,
  options: UseScrollDismissOptions = {},
): void {
  const { capture = true } = options;

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const ownerDocument = computed(
    () => node.refs.floatingEl.value?.ownerDocument ?? getDocument(),
  );
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());

  function handleScroll(event: Event): void {
    if (!isEnabled.value || !node.open.value) return;

    const target = event.target;
    if (isNode(target) && node.contains(target)) {
      return;
    }

    node.open.value = false;
  }

  useEventListener(
    () => (isEnabled.value && node.open.value ? ownerDocument.value : null),
    "scroll",
    handleScroll,
    capture,
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/** Options for configuring scroll dismissal. */
export interface UseScrollDismissOptions {
  /**
   * Whether scroll dismissal is active.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Whether to capture scroll events during the capture phase.
   * @default true
   */
  capture?: boolean;
}
```

### Archetype 2: Tier 2 Multi-Feature Composable

```typescript
import { computed, type MaybeRefOrGetter, shallowRef, toValue, watch, watchPostEffect } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { isHTMLElement, isNode } from "@/shared/dom";
import { getDocument, getWindow } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages complex overlay dismissals via pointer taps, scrollbar detection, and iframe blur.
 *
 * @param node - The floating node with open state and element refs.
 * @param options - Configuration options for outside interactions.
 */
export function useDismiss(
  node: FloatingNode,
  options: UseDismissOptions = {},
): void {
  // --- Shared Options & Environment --------------------------------------------

  const { capture = true } = options;

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const ownerDocument = computed(
    () => node.refs.floatingEl.value?.ownerDocument ?? getDocument(),
  );
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());

  // --- Pointer Outside Dismissal -----------------------------------------------

  const ignoreScrollbar = computed(() => toValue(options.ignoreScrollbar) ?? true);

  function handlePointerDown(event: PointerEvent): void {
    if (!isEnabled.value || !node.open.value || event.button !== 0) return;

    const target = event.target;
    if (!isNode(target) || !target.isConnected) return;

    if (ignoreScrollbar.value && isEventOnScrollbar(event, ownerDocument.value)) {
      return;
    }

    if (node.contains(target)) {
      return;
    }

    node.open.value = false;
  }

  useEventListener(
    () => (isEnabled.value && node.open.value ? ownerDocument.value : null),
    "pointerdown",
    handlePointerDown,
    capture,
  );

  // --- Iframe Blur Dismissal ---------------------------------------------------

  let blurTimerId: ReturnType<typeof setTimeout> | undefined;

  function clearBlurTimer(): void {
    if (blurTimerId !== undefined) {
      ownerWindow.value?.clearTimeout(blurTimerId);
      blurTimerId = undefined;
    }
  }

  function handleWindowBlur(): void {
    clearBlurTimer();
    blurTimerId = ownerWindow.value?.setTimeout(() => {
      blurTimerId = undefined;
      const activeEl = ownerDocument.value?.activeElement;
      if (isHTMLElement(activeEl) && activeEl.tagName === "IFRAME") {
        if (!node.contains(activeEl)) {
          node.open.value = false;
        }
      }
    }, 0);
  }

  useEventListener(
    () => (isEnabled.value && node.open.value ? ownerWindow.value : null),
    "blur",
    handleWindowBlur,
  );

  tryOnScopeDispose(() => {
    clearBlurTimer();
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Checks whether a pointer event occurred on the document scrollbar gutter.
 */
function isEventOnScrollbar(event: PointerEvent, doc: Document | undefined): boolean {
  if (!doc) return false;
  const root = doc.documentElement;
  return event.clientX >= root.clientWidth || event.clientY >= root.clientHeight;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/** Options for configuring outside dismissal behavior. */
export interface UseDismissOptions {
  /**
   * Whether dismissal interactions are enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Whether to capture pointer events during the capture phase.
   * @default true
   */
  capture?: boolean;
  /**
   * Whether clicks on scrollbar gutters should be ignored.
   * @default true
   */
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
}
```

### Archetype 3: Module-Level Coordination in `📌 Main`

When a module shares a global stack, registry, or document listener multiplexer across composable instances, place the coordination logic directly under `📌 Main` using unindented capability dividers:

```typescript
//=======================================================================================
// 📌 Main
//=======================================================================================

export function useModalStack(node: FloatingNode, options: UseModalStackOptions = {}): void {
  // Composable setup and entry registration...
}

// --- Document Listener & Stack Coordination ----------------------------------

function syncDocumentListeners(doc: Document): void {
  // Document-level coordination logic...
}

function dispatchStackEvent(doc: Document, event: Event): void {
  // Event dispatch across registered stack entries...
}
```

---

## 9. Anti-Patterns & Corrections

| Anti-Pattern | Why It Fails | Compliant Standard |
| :--- | :--- | :--- |
| `// --- State ---`<br>`// --- Handlers ---` | Slices code horizontally by technical type, scattering features across the file. | `// --- Pointer Hover Activation ---`<br>Group state, actions, and effects vertically by user-facing capability. |
| Inlining `toValue(options.enabled ?? true)` | Wrong unwrapping precedence; evaluates default before `toValue` unwrap. | `toValue(options.enabled) ?? true`<br>Normalize into `computed(() => toValue(options.enabled) ?? true)`. |
| Declaring all options in root `Shared Options` | Violates vertical cohesion; leaks feature-specific options into root scope. | Move single-feature options into their respective feature block. |
| Conflating bounds correction and DOM tabindex in one watcher | Entangles internal state updates with DOM mutations, causing cascading flushes. | Write two independent watchers: one for state correction, one for DOM attribute synchronization. |
| `window.setTimeout(fn, delay)` | Breaks when components render inside same-origin iframes; unsafe in SSR. | `ownerWindow.value?.setTimeout(fn, delay)`. |
| `export function calculateOffset(...)` in `📌 Helpers` | Leaks module internals into public exports; bloats bundle and public API contract. | Keep helpers unexported: `function calculateOffset(...)`. |
| Outputting an empty `// 📌 Helpers` banner | Adds visual clutter and creates noisy placeholder banners. | Omit the banner entirely when no pure helpers are defined. |
| Renaming options: `const enabledOption = options.enabled` | Creates inconsistent option naming boilerplate across composables. | Destructure directly or normalize: `const isEnabled = computed(...)`. |
| `if (!elements) return` when typed as non-nullable | Redundant defensive boilerplate that distrusts TypeScript contracts. | Trust the contract. Guard only nullable element lookups: `elements[i]?.focus()`. |

---

## 10. Self-Audit Checklist

Before completing work on any VFloat composable or module, verify each item:

- [ ] **Stage Sequence**: File adheres strictly to: Imports -> File-Private -> `📌 Main` -> `📌 Helpers` -> `📌 Types`.
- [ ] **Import Organization**: External packages first, `@/...` aliases second, `./...` relative siblings third.
- [ ] **Banner Dimensions**: Section banners are exactly 89 characters wide (`//` + 87 `=`).
- [ ] **No Empty Banners**: `📌 Helpers` and `📌 Types` banners are omitted if they contain no code.
- [ ] **Divider Dimensions**: Feature dividers are exactly 80 characters wide (trimmed) with 1 empty line before code.
- [ ] **Divider Naming**: Feature dividers use Title Case capability phrases (no generic `State`, `Handlers`, `Watchers`, `Logic`).
- [ ] **Vertical Cohesion**: Large composables group logic by capability. Feature-scoped options live inside their feature block.
- [ ] **Shared Options Economy**: `Shared Options & Environment` contains only options consumed in 2 or more feature blocks.
- [ ] **Options Normalization**: Dynamic options use `computed(() => toValue(options.prop) ?? default)`. Static options are destructured with defaults.
- [ ] **Single-Concern Separation**: Reactive state corrections, DOM attribute sync, and focus/scroll operations use dedicated watchers.
- [ ] **Zero Bare Globals**: DOM operations dynamically resolve `ownerDocument` and `ownerWindow`.
- [ ] **Realm-Scoped Timers**: All `setTimeout` and `requestAnimationFrame` calls execute on `ownerWindow.value`.
- [ ] **Cross-Realm Guards**: Structural checks (`isElement`, `isHTMLElement`, `nodeType === 1`) are used instead of bare `instanceof`.
- [ ] **Export Discipline**: Only the main composable and public contract types are exported. Helpers and internals are strictly unexported.
- [ ] **Type Contract Trust**: No redundant defensive container checks (`?? []`, `if (!elements)`).
