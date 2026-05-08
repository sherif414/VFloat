# [PRD] VFloat Source Structural Standardization

## Problem Statement

As the VFloat library has grown, the internal file organization across the `src/` directory has become inconsistent. Some files place configuration types at the top, others at the bottom; banner styles for section dividers vary; and internal helpers are often mixed with public logic. This "shallow" structural drift increases cognitive load for developers and makes the codebase harder to navigate and maintain.

## Solution

Systematically refactor every file in the `src/` directory to follow the unified **`vfloat-file-structure`** standard. This standard prioritizes public scannability by placing the main logic at the top, followed by internal helpers, and finally the public types/interfaces at the bottom.

## User Stories

1. As a developer, I want to see the main composable logic immediately upon opening a file, so I can understand its behavior quickly.
2. As a developer, I want all files to use consistent 📌 emoji banners, so I can visually parse sections at a glance.
3. As a developer, I want all configuration interfaces (`UseXOptions`) to be at the bottom of the file, so they don't clutter the logic path.
4. As a developer, I want internal module-level helpers to be grouped together, so I can distinguish between the core API and implementation details.
5. As a maintainer, I want a standardized file layout across the entire project, so that new contributions follow a predictable pattern.

## Implementation Decisions

### Structural Standard (The "Blueprint")

All files must adhere to the following sequence:

1. **Imports**: Sorted by source (Vue first, then internal).
2. **Internal Constants**: Simple module-level state.
3. **📌 Main Section**: The primary exported function/composable with comprehensive JSDoc.
4. **📌 Helpers Section**: Module-level private functions or logic blocks.
5. **📌 Types Section**: Exported interfaces (`Options`, `Context`, `Return`).

### Formatting Rules

- **Banner Width**: 85 `=` characters.
- **Emoji Markers**: Use `📌 Main`, `📌 Helpers`, `📌 Types`.
- **Destructuring**: Always destructure options at the top of the main function with default values.

### Migration Phases

| Phase | Scope             | Files                                                                                         | Status   |
| ----- | ----------------- | --------------------------------------------------------------------------------------------- | -------- |
| 1     | Core Interaction  | `use-click`, `use-list-navigation`, `use-floating-tree-node`                                  | **Done** |
| 2     | Other Interaction | `use-hover`, `use-focus`, `use-escape-key`, `use-role`, `use-focus-trap`, `use-floating-tree` | **Done** |
| 3     | Positioning       | `use-floating`, `use-arrow`, `use-client-point`                                               | **Done** |
| 4     | Internal Modules  | `src/composables/interactions/internal/`, `src/composables/positioning/internal/`             | **Done** |
| 5     | Shared Utilities  | `src/shared/`                                                                                 | **Done** |
| 6     | Root & Exports    | `src/index.ts`, `src/types.ts`                                                                | **Done** |

## Testing Decisions

Structural refactoring should **not** change runtime behavior.

- **Verification**: Run `vp check` and `vp test` after each file or phase to ensure no regressions were introduced.
- **Snapshots**: Compare the public API (exported types/functions) before and after to ensure no accidental breaking changes.

## Out of Scope

- Functional refactoring or bug fixes (unless they are "obvious" cleanups discovered during the pass).
- Changing the public API surface (method names, parameter orders).
- Updating documentation in `docs/` (this will be a separate task).

## Further Notes

- This is a "tracer bullet" migration—we move file-by-file to minimize merge conflicts and maintain a working state.
- The `vfloat-file-structure` agent skill will be used to automate/guide the refactoring of each file.

## Project Status: ✅ 100% Complete

All files in the `src/` directory have been refactored to the unified "Main -> Helpers -> Types" structure. A final cleanup pass was performed to remove empty section banners. `vp check` and `vp test` have been executed to confirm architectural and functional integrity.
