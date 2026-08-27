---
name: vfloat-file-structure
description: Enforce the unified file structure for VFloat composables and modules. This skill ensures a consistent layout where the main logic is prioritized at the top, followed by internal helpers, and finally public types/interfaces. Use this when creating new composables, refactoring existing ones, or during code cleanup.
---

# VFloat File Structure

This skill defines the "Gold Standard" for file organization in the VFloat repository. It prioritizes the **public API and main logic** at the top of the file to improve "scannability" and developer experience.

## When to use this Skill

- When creating any new composable in `src/composables/`.
- When refactoring "shallow" or "deep" modules to align with project standards.
- When performing a polish pass on existing files.
- When the user asks to "fix the structure" or "normalize the file layout."

## The Blueprint: Standard Order

All VFloat files (especially composables) must follow this sequence:

1. **Imports**: Third-party first (Vue, etc.), then internal VFloat modules.
2. **Internal Module Constants/Types**: (Optional) Simple, non-exported types or constants needed by the main logic.
3. **📌 Main Section**: The primary exported function (e.g., `useClick`, `useFloating`).
4. **📌 Helpers Section**: (Optional) Module-level private functions or logic blocks. *Omit banner if there are no helpers.*
5. **📌 Types Section**: (Optional) Exported interfaces and types (`UseXOptions`, `UseXContext`, etc.). *Omit banner if there are no types.*

> [!IMPORTANT]
> **No Empty Section Banners**: Never leave a section banner (such as `📌 Helpers` or `📌 Types`) without actual code under it. If a file has no helpers or no types, omit the banner entirely.

---

## 1. Visual Markers (Banners & Dividers)

### Top-Level Section Banners

Used for module-level sections (`📌 Main`, `📌 Helpers`, `📌 Types`).
Width: `//` + 85 `=` (Total 87 characters).

```typescript
//=======================================================================================
// 📌 Main
//=======================================================================================
```

### Sub-section Dividers (Inside Functions)

Used to group distinct, cohesive logical blocks within large functions.

- **Format**: Single-line dashed divider (`// --- Section Name ----------------------------------------------`), followed by an empty line before the first line of code.
- **Guideline**: **Use sparingly.** Only apply internal dividers inside large, complex functions where grouping distinct blocks (e.g. event listeners, navigation algorithms, state synchronization) genuinely improves readability. Do not use internal dividers in short or straightforward functions.

```typescript
  // --- Interaction State ------------------------------------------------------

  const interactionState = {
    pointerType: undefined as PointerType | undefined,
    didKeyDown: false,
  };
```

---

## 2. The Composable Anatomy

When writing the main exported function, follow this internal flow:

1. **JSDoc**: Comprehensive description with `@param`, `@returns`, and at least one `@example`.
2. **Options Destructuring**: Destructure all options at the top with sensible defaults.
3. **Internal State**: Reactive and non-reactive state variables.
4. **Derived State**: `computed` properties and helper booleans.
5. **Logic / Event Handlers**: The "meat" of the behavior.
6. **Wiring (Watchers/Listeners)**: `watch`, `watchPostEffect`, and `useEventListener` calls.
7. **Return Statement**: Only if the composable returns an object (often interaction composables return `void`).

---

## 3. Section Detail: 📌 Types

The Types section at the bottom should include:

- `UseXContext`: If a specific context shape is required.
- `UseXOptions`: The configuration interface.
- `UseXReturn`: If the function returns more than just a cleanup.

*Remember: If a file defines no types, omit the `📌 Types` banner entirely.*

```typescript
//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseClickOptions { ... }
```

## Checklist for Validation

- [ ] Imports are sorted and clean.
- [ ] Main exported function is at the top (after imports and module-private constants).
- [ ] `📌 Main` banner is present.
- [ ] `📌 Helpers` and `📌 Types` banners are **only** present when code exists in those sections (no empty section banners).
- [ ] Internal dividers use single-line dashed dividers (`// --- Name -----------------`) with a trailing empty line, and are used sparingly only in large functions.
- [ ] Options are destructured with defaults.
- [ ] Types are placed at the bottom of the file (when present).
