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

All VFloat files (especially composables) must follow this exact sequence:

1. **Imports**: Third-party first (Vue, etc.), then internal VFloat modules.
2. **Internal Module Constants/Types**: Simple, non-exported types or constants needed by the main logic.
3. **📌 Main Section**: The primary exported function (e.g., `useClick`, `useFloating`).
4. **📌 Helpers Section**: (Optional) Module-level private functions or logic blocks.
5. **📌 Types Section**: All exported interfaces (`UseXOptions`, `UseXContext`, etc.).

---

## 1. Visual Markers (Banners)

Use consistent divider widths and emoji markers.

### Main Section Banners

Width: `//` + 85 `=` (Total 87 characters).

```typescript
//=======================================================================================
// 📌 Main
//=======================================================================================
```

### Sub-section Banners (Inside Functions)

Width: `//` + 85 `=` (Total 87 characters). Used to group logical blocks inside a large function.

```typescript
//=====================================================================================
// Interaction State
//=====================================================================================
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

```typescript
//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseClickOptions { ... }
```

## Examples

### Reference Implementation

Always refer to [use-click.ts](file:///c:/projects/VFloat/src/composables/interactions/use-click.ts) as the master template for this structure.

### Checklist for Validation

- [ ] Imports are sorted and clean.
- [ ] Main exported function is at the top (after imports).
- [ ] 📌 Main and 📌 Types banners are present.
- [ ] Sub-dividers are used for grouping logic.
- [ ] Options are destructured with defaults.
- [ ] Types are at the absolute bottom of the file.
