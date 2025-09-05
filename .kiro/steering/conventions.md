---
inclusion: always
---
# Project File Structure and Coding Conventions

**Purpose:** These rules aim to ensure consistency, maintainability, and readability across the codebase. Adhering to them helps onboard new developers faster and reduces cognitive load when working with different files.

## 1. Folder Structure (New Section)

*   **Organize by Feature or Type:** Choose a primary organization strategy (e.g., group files by feature/domain, or by type like `components/`, `composables/`, `utils/`, `types/`, `services/`) and apply it consistently. Feature-based organization often scales better for larger applications.
*   **Use `src/` as Root:** All source code should reside within the `src/` directory.
*   **Clear Naming:** Folder names should be `kebab-case` and clearly indicate their contents.
*   **Index Files (`index.ts`):** Use `index.ts` files (barrel files) sparingly. They can simplify imports but may negatively impact tree-shaking and increase bundle sizes if overused. Primarily use them for public APIs of distinct modules or libraries within the project.

## 2. General File Principles

*   **Single Responsibility Principle (SRP):** Each file should ideally have one primary purpose (e.g., define a component, a composable, a set of related utility functions, types for a specific domain).
*   **Readability:** Prioritize clear and understandable code. Use descriptive names and logical structure.
*   **Consistency:** Apply the chosen patterns and conventions uniformly across *all* similar files. Predictability is key.
*   **Modularity:** Design components, composables, and utilities to be as self-contained and reusable as possible.

## 3. Standard File Layout

*(Refined version of your layout with added detail)*

```typescript
// Group imports logically:
// 1. External libraries (npm packages)
// 2. Internal absolute paths (@/...) - e.g., services, stores, composables
// 3. Internal relative paths (./ or ../) - e.g., sibling components, local utils
// Use type imports where appropriate: `import type { ... } from '...'`
// do not seperate imports by comments, just sort them

import { defineComponent } from 'vue' // Example: External
import type { SomeType } from 'external-package' // Example: External Type Import

import { useMyComposable } from '@/composables/use-my-composable' // Example: Internal Absolute
import { logger } from '@/utils/logger' // Example: Internal Absolute

import MyHelperComponent from './my-helper-component.vue' // Example: Internal Relative
import { localUtil } from './utils' // Example: Internal Relative

//=======================================================================================
// 📌 Constants (Optional but Recommended)
//=======================================================================================
// File-specific constants. Use UPPER_SNAKE_CASE. Use `as const` for stricter typing.
const DEFAULT_TIMEOUT = 5000;
const SUPPORTED_MODES = ['read', 'write'] as const;

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

// Type definitions, interfaces specific to this file's functionality.
// Exported types/interfaces used by other files should also be defined here.
interface InternalState {
  isLoading: boolean;
  data: string | null;
}

export interface MyComponentProps { // Example for Vue component props
  label: string;
  count?: number;
}

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================
// The core purpose of the file.
// Examples: Vue component definition, composable function, main utility functions.

export function useMyFeature(props: Readonly<MyComponentProps>) {
  // ... composable logic ...
  return { /* ... */ };
}

// OR (for a component using <script setup>)
/*
<script setup lang="ts">
  // Component logic here
</script>
*/

// OR (for a utility file)
export function mainUtilFunction(input: string): boolean {
  // ... function logic ...
  return localUtil(input);
}

//=======================================================================================
// 📌 Internal Helpers / Utilities
//=======================================================================================
// Utility functions or helpers used only within this file. Not exported.
function formatData(data: any): string {
  // ... helper logic ...
  return JSON.stringify(data);
}

//=======================================================================================
// 📌 Exports (Consolidated View - Optional if using named exports directly)
//=======================================================================================
// Sometimes useful for clarity, but usually direct `export` on functions/types is sufficient.
// Ensure all intended public members are explicitly exported.
// NO: export default ...
```

**Notes on Layout:**
*   The order of sections (Types, Main Logic, Helpers) can sometimes be adjusted based on context (e.g., defining types first often improves readability of the main logic). The key is consistency.

## 4. Naming Conventions

*   **Files:** `kebab-case` (e.g., `user-profile.vue`, `use-fetch-data.ts`, `string-utils.ts`).
*   **Variables & Functions:** `camelCase` (e.g., `userData`, `calculateTotal`).
*   **Types, Interfaces, Enums:** `PascalCase` (e.g., `UserProfile`, `RequestOptions`, `LoadingStatus`).
*   **Components:** `PascalCase` (e.g., `UserProfileCard.vue`, `BaseButton.vue`). Use multi-word names where possible for clarity.
*   **Composables:** Prefix both the *function name* and *filename* with `use` followed by `PascalCase` for the function and `kebab-case` for the file (e.g., function `useFloating`, filename `use-floating.ts`). *(Slight adjustment for function name convention)*.
*   **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `API_ENDPOINT`).
*   **Boolean Variables:** Prefix with `is`, `has`, `should`, `can` (e.g., `isLoading`, `hasPermission`).

## 5. Coding Style & Practices

*   **Exports:**
    *   **Prefer Named Exports:** Use `export { ... }` or `export function/const/type ...`. Avoid `export default`.
        *   *Why:* Improves discoverability, makes renaming/refactoring easier, and avoids ambiguity in imports.
    *   **Explicit Exports:** Clearly export all types, interfaces, functions, and constants intended for external use.
*   **Imports:**
    *   **Group & Order:** Follow the grouping order specified in the Standard File Layout.
    *   **Absolute vs. Relative:** Prefer absolute paths (`@/`) for imports outside the current feature/module directory. Use relative paths (`./`, `../`) for imports within the same logical module/feature.
    *   **Type Imports:** Use `import type { ... }` when importing only types. This makes the dependency explicit to build tools and can sometimes improve performance.
*   **Types:**
    *   **`type` vs `interface`:** Use `type` for simple types, unions, intersections, or function signatures. Use `interface` for defining the shape of objects or implementing classes (though classes might be less common in Vue/composable patterns). Be consistent.
    *   **Export Types:** Export types/interfaces alongside the functions or components that use them, or group them in dedicated `types.ts` files if they are shared across many files.
    *   **Readonly:** Use `Readonly<T>` or `readonly` modifiers where appropriate to enforce immutability, especially for props and shared state.
*   **Constants:** Define constants using `const`. Use `as const` for literal types or arrays where the values should be treated as readonly literals.
*   **Reactive State Management:** Use Vue's reactivity primitives (`ref`, `reactive`, `computed`) only when the value needs to be reactive (will change and trigger updates). For constants, utility values, or variables that don't affect the template or other reactive state, use regular JavaScript variables (`const`, `let`) to avoid unnecessary reactivity overhead and improve performance.

## 6. Documentation (JSDoc)

*   **Exported Members:** Document *all* exported functions, types, interfaces, composables, and complex constants using JSDoc comments (`/** ... */`).
*   **Clarity:** Write clear and concise descriptions. Explain the *purpose* (`what` and `why`), not just the *how*.
*   **Tags:** Consistently use:
    *   `@param {TypeName} paramName - Description.`
    *   `@returns {TypeName} - Description of the return value.`
    *   `@throws {ErrorType} - Description of errors thrown.` (If applicable)
    *   `@example` - Provide clear usage examples, especially for utilities and composables.
    *   `@see` - Link to related functions or documentation.
    *   `@deprecated` - Mark deprecated features with instructions for alternatives.
*   **Interface/Type Properties:** Add brief JSDoc comments (`/** Description */`) above properties in interfaces and complex types.
*   **Complex Logic:** Add comments within function bodies to explain complex or non-obvious logic sections.

## 7. Vue Component Specifics

*   **`<script setup>`:** Use Vue 3 `<script setup lang="ts">` for components.
*   **Props Definition:**
    *   **Interface:** Define props using a `PascalCase` interface named `<ComponentName>Props`.
    *   **Declaration:** Use the type-based `defineProps<ComponentNameProps>()` macro within `<script setup>`.
    *   **Export (If Needed):** If the `Props` interface needs to be used externally (e.g., in stories, tests, or parent components), you *can* define it outside `<script setup>` in a separate `<script>` block *or* define it in a separate `types.ts` file and import it. Choose *one* consistent approach. Defining it outside allows easy export:
        ```typescript
        // Separate script block allows exporting the interface easily
        <script lang="ts">
          // Export the interface if needed elsewhere
          export interface MyButtonProps {
            label: string;
            disabled?: boolean;
          }
        </script>

        <script setup lang="ts">
          // Import if defined elsewhere, or use directly if defined above
          // import type { MyButtonProps } from './types'; // If external

          const props = withDefaults(defineProps<MyButtonProps>(), {
            disabled: false,
          });
        </script>
        ```
    *   **`withDefaults`:** Use `withDefaults` for providing default prop values.
*   **Emits Definition:** Use the type-based `defineEmits<{(event: 'update:modelValue', value: string): void; (event: 'submit'): void;}>()` macro for defining emitted events.
*   **Headless/Unstyled:** Aim for components to be "headless" (contain logic and structure but minimal styling) by default, allowing flexible styling via props or parent contexts. This promotes reusability within different visual themes or design systems. Encapsulate styling separately (e.g., CSS Modules, Tailwind via `@apply`, dedicated style props).
*   **Template Structure:** Keep templates clean. Use meaningful element names, minimal logic (move complex logic to `<script setup>`), and consider a single root element unless using fragments deliberately.

## 8. Dependencies

*   **Package Manager:** Use `pnpm` consistently for package management. Ensure a `pnpm-lock.yaml` file is committed.
*   **Minimize Dependencies:** Prefer standard Web APIs or well-established Vue/framework utilities over small, single-purpose external packages.
*   **Local Utilities:** Create shared utilities within the project (`@/utils`) for common tasks instead of repeatedly installing micro-packages. Evaluate the trade-offs (maintenance vs. dependency management).

## 9. Enforcement (New Section)

*   **Linting:** Configure ESLint (`eslint`) with relevant plugins (e.g., `@typescript-eslint/eslint-plugin`, `eslint-plugin-vue`) to automatically check for many of these rules.
*   **Formatting:** Use Prettier (`prettier`) configured consistently across the team to handle code formatting automatically.
*   **TypeScript:** Enable strict mode (`"strict": true`) in `tsconfig.json` to catch type-related errors early.

---

These improved rules provide more context, cover more areas (like folder structure and enforcement), and refine some of the existing points for better clarity and modern best practices. Remember to adapt them slightly if your project has unique requirements.