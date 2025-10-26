# Implementation Plan

- [x] 1. Create positioning directory structure and move files
  - Create `src/composables/positioning/` directory
  - Move `use-floating.ts`, `use-arrow.ts`, `use-client-point.ts`, and `use-floating-tree.ts` to the new directory
  - Create `src/composables/positioning/index.ts` barrel file that exports all positioning utilities
  - _Requirements: 1.2, 2.1_

- [x] 2. Update internal import paths
  - [x] 2.1 Fix imports in positioning composables
    - Update relative imports within positioning composables to reflect new directory structure
    - Ensure all cross-references between positioning utilities use correct paths
    - _Requirements: 2.1_
  
  - [x] 2.2 Fix imports in interaction composables
    - Update imports in `use-click.ts`, `use-hover.ts`, `use-focus.ts`, `use-escape-key.ts` that reference positioning utilities
    - Change paths from `../use-floating` to `../positioning/use-floating`
    - _Requirements: 2.1_
  
  - [x] 2.3 Fix imports in middleware files
    - Update any middleware imports that reference positioning utilities
    - Verify middleware barrel file exports remain correct
    - _Requirements: 2.1_
  
  - [x] 2.4 Fix imports in test files
    - Update test file imports to use new positioning directory paths
    - Verify all test files compile without errors
    - _Requirements: 2.1_

- [x] 3. Update export structure
  - [x] 3.1 Remove useClientPoint from interactions barrel
    - Remove all `useClientPoint` exports and types from `src/composables/interactions/index.ts`
    - Verify interactions barrel only exports interaction-related composables
    - _Requirements: 1.3, 2.1_
  
  - [x] 3.2 Update main composables barrel
    - Replace individual positioning utility exports with `export * from "./positioning"`
    - Ensure structure is: positioning, interactions, middlewares
    - Verify all exports are maintained for backward compatibility
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 4. Update API documentation structure
  - [x] 4.1 Update API index page
    - Modify `docs/api/index.md` to add "Positioning Utilities" section
    - Move `useClientPoint` from "Interaction Composables" to "Positioning Utilities"
    - List all positioning utilities (`useFloating`, `useArrow`, `useClientPoint`, `useFloatingTree`) in the new section
    - _Requirements: 4.1, 4.2_
  
  - [x] 4.2 Update interactions guide





    - Remove `useClientPoint` from "See Also" section in `docs/guide/interactions.md`
    - Add clarifying note in context menu example explaining `useClientPoint` is a positioning utility
    - Add cross-reference to virtual elements guide
    - _Requirements: 4.2, 4.3_
  - [x] 4.3 Update useClientPoint API docs




  - [ ] 4.3 Update useClientPoint API docs

    - Modify "See Also" section in `docs/api/use-client-point.md` to reference positioning guides
    - Add references to `useFloating` and `useArrow` as related positioning utilities
    - _Requirements: 4.2_

- [ ] 5. Enhance positioning documentation

  - [x] 5.1 Add positioning content to virtual elements guide


    - Add section to `docs/guide/virtual-elements.md` explaining `useClientPoint` as a positioning mechanism
    - Explain relationship between `useClientPoint` and `useFloating`
    - Include examples showing pointer-based positioning patterns
    - _Requirements: 4.2, 4.3_

- [x] 6. Verification and testing
  - [x] 6.1 Verify build and compilation
    - Run build command to ensure no TypeScript errors
    - Verify all modules resolve correctly
    - Check that dist output includes all expected exports
    - _Requirements: 3.1, 3.2_
  
  - [x] 6.2 Verify backward compatibility
    - Test importing `useClientPoint` from main package entry
    - Test importing from `@/composables`
    - Verify all types are exported correctly
    - Confirm `useClientPoint` is NOT available from `@/composables/interactions`
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 6.3 Run test suite
    - Execute full test suite to catch any regressions
    - Verify all tests pass with new import paths
    - _Requirements: 2.1_
  
  - [ ]* 6.4 Build and review documentation
    - Build documentation site
    - Verify "Positioning Utilities" section appears correctly
    - Check all links and cross-references work
    - Verify code examples render and function correctly
    - _Requirements: 4.1, 4.2, 4.3_
