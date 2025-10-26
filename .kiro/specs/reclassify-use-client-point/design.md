# Design Document: Reclassify useClientPoint as Positioning Utility

## Overview

This design outlines the refactoring of `useClientPoint()` from the interactions namespace to the positioning utilities category. The composable will remain at its current file location (`src/composables/use-client-point.ts`) but will be exported through different paths to reflect its true purpose as a positioning mechanism rather than an interaction handler.

The refactoring maintains full backward compatibility while improving the semantic organization of the codebase and documentation.

## Architecture

### Current State

```
src/composables/
├── interactions/
│   ├── index.ts                    # Exports useClientPoint (incorrect categorization)
│   ├── use-click.ts
│   ├── use-hover.ts
│   ├── use-focus.ts
│   └── use-escape-key.ts
├── middlewares/
├── use-client-point.ts             # Actual file location
├── use-floating.ts
├── use-arrow.ts
├── use-floating-tree.ts
└── index.ts                        # Main barrel file
```

**Export Path:** `interactions/index.ts` → `composables/index.ts` → `src/index.ts`

### Target State

```
src/composables/
├── positioning/
│   ├── index.ts                    # Exports all positioning utilities
│   ├── use-floating.ts             # Moved from root
│   ├── use-arrow.ts                # Moved from root
│   ├── use-client-point.ts         # Moved from root
│   └── use-floating-tree.ts        # Moved from root
├── interactions/
│   ├── index.ts                    # No longer exports useClientPoint
│   ├── use-click.ts
│   ├── use-hover.ts
│   ├── use-focus.ts
│   └── use-escape-key.ts
├── middlewares/
│   └── index.ts
└── index.ts                        # Exports from positioning, interactions, middlewares
```

**Export Path:** `positioning/index.ts` → `composables/index.ts` → `src/index.ts`

## Components and Interfaces

### 1. Export Structure Changes

#### New File: `src/composables/positioning/index.ts`

**Content:**
```typescript
export * from "./use-floating"
export * from "./use-arrow"
export * from "./use-client-point"
export * from "./use-floating-tree"
```

**Rationale:** Create a dedicated barrel file for all positioning-related composables, making the organization explicit and maintainable.

#### File: `src/composables/interactions/index.ts`

**Current:**
```typescript
export * from "./use-click"
export {
  type AxisConstraint,
  type Coordinates,
  type TrackingMode,
  type UseClientPointContext,
  type UseClientPointOptions,
  type UseClientPointReturn,
  useClientPoint,
} from "../use-client-point"
export * from "./use-escape-key"
export * from "./use-focus"
export * from "./use-hover"
```

**Target:**
```typescript
export * from "./use-click"
export * from "./use-escape-key"
export * from "./use-focus"
export * from "./use-hover"
```

**Rationale:** Remove all `useClientPoint` exports from the interactions namespace since it's not an interaction handler.

#### File: `src/composables/index.ts`

**Current:**
```typescript
export * from "./interactions"
export * from "./middlewares"
export * from "./use-arrow"
export * from "./use-floating"
export * from "./use-floating-tree"
```

**Target:**
```typescript
export * from "./positioning"
export * from "./interactions"
export * from "./middlewares"
```

**Rationale:** 
- Simplify the main barrel file by delegating to category-specific barrel files
- Make the three-category structure (positioning, interactions, middlewares) explicit
- Maintain all existing exports for backward compatibility

### 2. Documentation Structure Changes

#### File: `docs/api/index.md`

**Current Structure:**
```markdown
## Core Composables
- useFloating
- useFloatingTree
- useArrow

## Interaction Composables
- useClick
- useHover
- useFocus
- useClientPoint  ← Incorrectly categorized
- useEscapeKey
```

**Target Structure:**
```markdown
## Core Composables
- useFloating - Main floating positioning composable
- useFloatingTree - Tree-aware floating element management
- useArrow - Arrow positioning for floating elements

## Positioning Utilities
- useClientPoint - Pointer-based positioning with multiple tracking modes

## Interaction Composables
- useClick - Click interaction handling
- useHover - Hover interaction with safe polygon support
- useFocus - Focus interaction handling
- useEscapeKey - Escape key handling
```

**Rationale:** Create a new "Positioning Utilities" section to clearly distinguish positioning mechanisms from interaction handlers.

#### File: `docs/guide/interactions.md`

**Current:** Includes `useClientPoint` in the "See Also" section and demonstrates it in context menu examples

**Target:** 
- Remove `useClientPoint` from the "See Also" section
- Keep the context menu example but add a note explaining that `useClientPoint` is a positioning utility, not an interaction
- Add a cross-reference to a new positioning guide or the virtual elements guide

**Example Addition:**
```markdown
> **Note:** `useClientPoint` is a positioning utility, not an interaction handler. 
> It works alongside `useFloating` to position elements at pointer coordinates. 
> See the [Virtual Elements guide](/guide/virtual-elements) for more details on positioning strategies.
```

#### New Section in `docs/guide/virtual-elements.md`

Add a section explaining `useClientPoint` as a positioning mechanism:

```markdown
## Pointer-Based Positioning with useClientPoint

The `useClientPoint` composable is a positioning utility that creates virtual anchor 
elements at pointer coordinates. Unlike interaction handlers like `useClick` or `useHover`, 
`useClientPoint` focuses solely on determining WHERE the floating element should appear, 
not WHEN it should open or close.

### Relationship to useFloating

`useClientPoint` works by updating the `anchorEl` reference in the floating context 
with a virtual element positioned at the pointer coordinates. This integrates seamlessly 
with `useFloating`'s positioning system.
```

## Data Models

No data model changes are required. All existing types and interfaces remain unchanged:

- `UseClientPointOptions`
- `UseClientPointReturn`
- `UseClientPointContext`
- `Coordinates`
- `AxisConstraint`
- `TrackingMode`

## Error Handling

No error handling changes are required. The refactoring is purely organizational and maintains all existing functionality.

## Testing Strategy

### Unit Tests

No unit test changes are required since the composable implementation remains unchanged.

### Integration Tests

**Test: Verify Export Paths**
- Import `useClientPoint` from the main package entry point
- Import `useClientPoint` from `@/composables`
- Verify both imports resolve to the same function
- Verify `useClientPoint` is NOT exported from `@/composables/interactions`

**Test: Backward Compatibility**
- Verify all existing import patterns continue to work
- Verify all types are exported correctly
- Verify no breaking changes in the public API

### Documentation Tests

**Manual Verification:**
- Build documentation site
- Verify `useClientPoint` appears in "Positioning Utilities" section
- Verify `useClientPoint` is removed from "Interaction Composables" section
- Verify all links and cross-references work correctly
- Verify code examples in documentation still function

## Implementation Phases

### Phase 1: Create Positioning Directory Structure
1. Create `src/composables/positioning/` directory
2. Move `use-floating.ts` to `src/composables/positioning/`
3. Move `use-arrow.ts` to `src/composables/positioning/`
4. Move `use-client-point.ts` to `src/composables/positioning/`
5. Move `use-floating-tree.ts` to `src/composables/positioning/`
6. Create `src/composables/positioning/index.ts` barrel file

### Phase 2: Update Import Paths
1. Update all internal imports in moved files to reflect new locations
2. Update imports in interaction composables that reference positioning utilities
3. Update imports in middleware files that reference positioning utilities
4. Update test files to use new import paths

### Phase 3: Update Export Structure
1. Remove `useClientPoint` exports from `src/composables/interactions/index.ts`
2. Update `src/composables/index.ts` to export from `./positioning`
3. Remove individual positioning utility exports from `src/composables/index.ts`

### Phase 4: Update Documentation Structure
1. Update `docs/api/index.md` to create "Positioning Utilities" section
2. Move `useClientPoint` entry to new section
3. Update `docs/guide/interactions.md` to remove `useClientPoint` from "See Also"
4. Add clarifying note about `useClientPoint` being a positioning utility

### Phase 5: Enhance Documentation Content
1. Add positioning-focused content to `docs/guide/virtual-elements.md`
2. Update `docs/api/use-client-point.md` "See Also" section to reference positioning guides
3. Review all documentation for consistency

### Phase 6: Verification
1. Run build to ensure no compilation errors
2. Verify all imports work correctly
3. Run test suite to ensure no regressions
4. Build and review documentation site
5. Verify backward compatibility

## Design Decisions and Rationales

### Decision 1: Create Dedicated Positioning Directory

**Rationale:** Grouping all positioning composables (`useFloating`, `useArrow`, `useClientPoint`, `useFloatingTree`) in a dedicated `positioning/` directory makes the architecture explicit and mirrors the existing `interactions/` and `middlewares/` structure. This creates a clear three-category organization that's easy to understand and maintain.

### Decision 2: Move All Positioning Utilities Together

**Rationale:** Moving `useFloating`, `useArrow`, and `useFloatingTree` alongside `useClientPoint` creates consistency. All positioning-related composables are now co-located, making it easier for developers to discover related functionality and understand the library's structure.

### Decision 3: Use Barrel Files for Each Category

**Rationale:** Each category (`positioning/`, `interactions/`, `middlewares/`) has its own `index.ts` barrel file. This delegates export management to the appropriate level and keeps the main `composables/index.ts` clean and simple.

### Decision 4: Create "Positioning Utilities" Section in Documentation

**Rationale:** A dedicated section makes it clear that positioning and interaction are separate concerns. This helps developers understand the library's architecture and find the right tools for their needs.

### Decision 5: Maintain Full Backward Compatibility

**Rationale:** Since all composables are exported from the top-level package, existing imports will continue to work. This is a non-breaking change that only affects internal organization and documentation. The barrel file structure ensures that `export * from "./positioning"` re-exports everything that was previously exported individually.

### Decision 6: Add Cross-References Instead of Removing Examples

**Rationale:** The context menu example in the interactions guide is valuable. Rather than removing it, we add a note explaining that `useClientPoint` is a positioning utility. This educates users about the distinction while preserving useful examples.

## Migration Guide

No migration is required for library consumers. All existing import paths continue to work:

```typescript
// All of these continue to work
import { useClientPoint } from 'v-float'
import { useClientPoint } from 'v-float/composables'
```

The only change is internal organization and documentation categorization.
