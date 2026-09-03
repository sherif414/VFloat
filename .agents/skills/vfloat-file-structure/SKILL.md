---
name: vfloat-file-structure
description: Enforce the unified file structure and feature-based code organization for VFloat composables and modules. This skill ensures a consistent layout where the public API and main logic are prioritized at the top, internal logic is organized by feature capabilities, and public types/interfaces are at the bottom.
---

# VFloat File Structure & Organization

This skill defines the gold standard for file architecture and internal code organization across the VFloat repository. It ensures high scannability, vertical feature cohesion, and strict consistency.

## When to use this Skill

- When creating any new composable in `src/composables/`.
- When refactoring existing composables or internal modules.
- When performing a code cleanup or polish pass.
- When organizing logic inside large composables.

---

## 1. Module-Level Standard Order

Every VFloat file (especially composables) must follow this exact sequence:

1. **Imports**: Third-party first (Vue, `@floating-ui/dom`, etc.), then internal VFloat modules (`@/...`).
2. **Internal Module Constants/Types**: (Optional) File-private, non-exported types, interfaces, or constants needed by the module. Must NOT be exported.
3. **📌 Main Section**: The primary exported function (e.g., `useClick`, `useRovingFocus`, `useFloatingContext`).
4. **📌 Helpers Section**: (Optional) Module-level private pure functions and stateless calculation/lookup utilities. _Must NOT be exported (`function ...`, never `export function ...`). Must be strictly idempotent with zero side effects (no DOM mutations, no ref updates, no reactive scopes)._ _Omit banner if there are no helpers._
5. **📌 Types Section**: (Optional) Publicly exported interfaces and types (`UseXOptions`, `UseXReturn`, `UseXContext`). _Internal types used only within the file belong in Section 2 as unexported declarations. Omit banner if there are no types._

> [!IMPORTANT]
> **No Empty Section Banners**: Never leave a section banner (such as `📌 Helpers` or `📌 Types`) without actual code under it. If a file does not define helpers or types, omit the banner entirely.

---

## 2. Visual Markers (Banners & Dividers)

### Module-Level Section Banners

Used exclusively for top-level file sections (`📌 Main`, `📌 Helpers`, `📌 Types`).
Width: `//` + 85 `=` (Total 87 characters).

```typescript
//=======================================================================================
// 📌 Main
//=======================================================================================
```

### Internal Feature Dividers (Inside Functions)

Used to group cohesive feature blocks inside large composables.

- **Format**: Single-line dashed divider (`// --- Feature Name --------------------------------------------------`), padded to 80 characters.
- **Spacing**: Always leave **1 empty line** between the divider and the first line of code.
- **Usage Rule**: **Use sparingly.** Only apply internal dividers inside large, multi-feature composables (100+ lines). Small, single-concern composables should not use dividers.

```typescript
// --- Rest Detection ---------------------------------------------------------

let restCoords: Coords | null = null;
let restTimeoutId: ReturnType<typeof setTimeout> | undefined;
```

---

## 3. Internal Composable Anatomy & Feature Grouping

Inside the main composable function, organize code based on the complexity tier:

### Tier 1: Single-Concern Composables (< 100 lines)

Follows a linear flow separated only by blank lines (no internal dividers):

1. **JSDoc**: Comprehensive description with `@param`, `@returns`, and `@example`.
2. **Options Destructuring**: Destructure all options with sensible defaults.
3. **Derived State & Reactive Refs**: `computed` wrappers, reactive refs.
4. **Event Handlers & Action Functions**: Logic and user action handlers.
5. **Wiring & Listeners**: `watch`, `watchPostEffect`, `useEventListener`.
6. **Return Statement**: Public return object or `void`.

### Tier 2: Complex Composables (100+ lines or Multi-Feature)

Organize code using **Feature-Based Grouping (Vertical Cohesion)** rather than horizontal technical slicing:

```
composable()
│
├── Shared Options & Root State  (Destructuring, computed option wrappers, shared refs)
│
├── Feature Block 1               (Private state + Actions + Handlers + Effects for Feature 1)
│
├── Feature Block 2               (Private state + Actions + Handlers + Effects for Feature 2)
│
├── Feature Block 3               (Private state + Actions + Handlers + Effects for Feature 3)
│
└── Public Return Statement       (Aggregates methods & state exposed to consumer)
```

### Single-Concern Separation Rule

Never combine multiple behavioral or domain concerns into a single handler, watcher, or listener:

- **Separate State Correction from DOM Sync**: Auto-correcting state (e.g., bounds fallback when list size changes) and syncing DOM attributes (e.g., updating `tabindex` on elements) must be separate watchers.
- **Separate Attribute Sync from Focus/Scroll**: Updating DOM attributes (`tabindex`, `aria-*`) and moving DOM focus/scroll must be handled in their respective feature sections.
- **Decouple Unrelated Event Logic**: Event listeners must not bundle unrelated capabilities or logic that is independent and unaffected by call order. Each feature block should bind its own focused event listener.

---

## 4. Feature Divider Naming Standards

Divider names must answer: **"What user-facing behavior or subsystem does this block implement?"**

### The Core Rules

1. **Describe the Capability, Not the Code Type**: Never use generic technical labels like `State`, `Handlers`, `Watchers`, `Logic`, or `Helpers`.
2. **Title Case Noun Phrases**: Use standard Title Case (e.g., `Keyboard Navigation`, not `keyboard navigation`).
3. **Use Approved Naming Formulas**:

| Formula                               | Pattern                                | Examples                                                                                      |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| **[Modality / Trigger] + [Behavior]** | How the user interacts + what happens  | `Keyboard Navigation`, `Pointer Hover Activation`, `Click & Toggle Trigger`, `Item Selection` |
| **[Domain Subsystem] + [Capability]** | Dedicated feature engine / calculation | `Rest Detection`, `Safe Polygon Tracking`, `Focus Trapping`, `Search Buffer & Matcher`        |
| **[Target] + [Coordination / Sync]**  | What entity is being synchronized      | `DOM Focus & Tabindex Sync`, `Initial & Return Focus`, `Modal Inert Isolation`                |

---

## 5. Types Section Standard

The `📌 Types` section at the bottom of the file should include all exported interfaces in this order:

1. `UseXContext`: Context requirements (if applicable).
2. `UseXReturn`: Return object shape.
3. `UseXOptions`: Configuration options with comprehensive JSDoc on every property.

Only public contract types belong in this section. Keep internal working interfaces, helper types, and local parameter shapes unexported in Section 2 at the top of the file.

```typescript
//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseClickOptions { ... }
```

---

## 6. Module Encapsulation & Export Discipline

Internals are functions, interfaces, types, constants, and variables used only within their defining module and never outside of it. Internals must never be exported:

- **No Exports Without External Consumers**: Never add `export` to a function, interface, type, constant, or variable if it is only used within that same file.
- **No Speculative Exports**: Do not export symbols out of habit, convenience, or speculative future reuse.
- **Composable Files**: Only export the primary composable function and its public contract types (`UseXOptions`, `UseXReturn`, `UseXContext`). Everything used solely within the composable (helper functions, internal state interfaces, DOM query helpers, local constants) must remain unexported.
- **Helper Functions**: Helpers under `📌 Helpers` are used only inside the module and must never use `export`. Use `function ...`, never `export function ...`.
- **Internal Helper Modules**: In multi-file feature directories, internal helper files (`*-controller.ts`, `geometry.ts`, `intent.ts`) must export only the specific symbols that collaborating files actually import. Any symbol used only within that helper file must stay unexported.
- **Never Export for Tests**: Do not export module internals solely for unit test access. Test behavior through the composable's public interface.

---

## Checklist for Validation

- [ ] Imports are sorted: third-party first, then internal `@/...` modules.
- [ ] Main exported function is at the top (immediately after imports and file-private constants).
- [ ] `📌 Main` banner is present.
- [ ] `📌 Helpers` and `📌 Types` banners are **only** present when code actually exists in those sections (no empty banners).
- [ ] All helper functions under `📌 Helpers` are pure and idempotent with zero side effects.
- [ ] Helper functions under `📌 Helpers` are strictly unexported (`function ...`, not `export function ...`).
- [ ] Large composables group code by **feature capabilities** rather than technical categories.
- [ ] Watchers and effects handle a single distinct concern without conflating state correction and DOM side effects.
- [ ] Event listeners are decoupled and do not combine unrelated feature logic.
- [ ] Internal feature dividers use single-line dashed comments (`// --- Feature Name ----`) with a trailing blank line.
- [ ] Feature divider names are Title Case noun phrases describing functionality (no generic `// --- State ---` or `// --- Handlers ---`).
- [ ] Options are destructured with sensible defaults at the top of the function.
- [ ] Types and interfaces are positioned at the bottom of the file.
- [ ] Module internals (entities used only within the defining module and not imported elsewhere) are unexported.
