# Design Document

## Overview

This design outlines the integration of interaction composables (`useClick`, `useHover`, `useFocus`, `useDismiss`) with `useFloatingTree` to create a unified, tree-aware floating element system. The solution will enhance existing interaction composables to automatically detect and coordinate with floating trees when present, while maintaining full backward compatibility.

The core approach involves:

1. **Automatic Tree Detection**: Interaction composables will automatically detect when they're used within a floating tree context
2. **Enhanced Context Pattern**: A tree-aware context wrapper that intercepts and coordinates state changes
3. **Unified API**: Consistent tree configuration options across all interaction types
4. **Backward Compatibility**: Zero breaking changes to existing APIs

## Architecture

### Core Components

#### 1. Tree Context Detection System

```typescript
interface TreeContextProvider {
  tree: UseFloatingTreeReturn
  nodeId: string
  treeOptions: TreeAwareOptions
}
```

A context provider system that allows interaction composables to automatically detect when they're operating within a tree structure. This uses Vue's provide/inject mechanism to make tree context available to child components.

#### 2. Enhanced Floating Context

```typescript
interface TreeAwareFloatingContext extends FloatingContext {
  tree?: UseFloatingTreeReturn
  nodeId?: string
  treeOptions?: TreeAwareOptions
}
```

An enhanced version of the existing FloatingContext that includes optional tree information. This maintains backward compatibility while enabling tree-aware behavior.

#### 3. Tree-Aware State Coordinator

```typescript
class TreeStateCoordinator {
  coordinateOpen(nodeId: string, open: boolean): void
  coordinateDismiss(nodeId: string, event: Event): boolean
  coordinateHover(nodeId: string, state: HoverState): void
  coordinateFocus(nodeId: string, focused: boolean): void
}
```

A centralized coordinator that handles tree-specific logic for state changes, ensuring consistent behavior across all interaction types.

### Integration Strategy

#### Phase 1: Context Enhancement

- Extend FloatingContext to optionally include tree information
- Create tree context provider for automatic detection
- Implement backward-compatible context creation

#### Phase 2: Interaction Composable Enhancement

- Modify each interaction composable to detect tree context
- Add tree-aware behavior when context is present
- Maintain existing behavior when no tree context exists

#### Phase 3: Unified Tree Options

- Create consistent tree configuration interface
- Implement tree option resolution and validation
- Add TypeScript support for tree-aware options

## Components and Interfaces

### 1. Tree Context Provider

```typescript
// Tree context that can be provided to child components
export interface FloatingTreeContext {
  tree: UseFloatingTreeReturn
  nodeId: string
  options: TreeAwareOptions
}

// Composable to provide tree context
export function useFloatingTreeProvider(
  tree: UseFloatingTreeReturn,
  nodeId: string,
  options: TreeAwareOptions = {}
): void

// Composable to consume tree context
export function useFloatingTreeContext(): FloatingTreeContext | null
```

### 2. Enhanced Interaction Options

```typescript
// Base tree options that apply to all interactions
export interface TreeAwareOptions {
  closeSiblingsOnOpen?: MaybeRefOrGetter<boolean>
  closeDescendantsOnClose?: MaybeRefOrGetter<boolean>
  closeOnAncestorClose?: MaybeRefOrGetter<boolean>
  preventOpenIfDescendantOpen?: MaybeRefOrGetter<boolean>
}

// Enhanced options for each interaction type
export interface UseClickOptions {
  // ... existing options
  tree?: TreeAwareOptions | false
}

export interface UseHoverOptions {
  // ... existing options
  tree?:
    | (TreeAwareOptions & {
        maintainHoverAcrossBranch?: MaybeRefOrGetter<boolean>
        coordinateDelaysWithTree?: MaybeRefOrGetter<boolean>
      })
    | false
}

export interface UseFocusOptions {
  // ... existing options
  tree?:
    | (TreeAwareOptions & {
        maintainFocusInBranch?: MaybeRefOrGetter<boolean>
        keyboardNavigationMode?: MaybeRefOrGetter<"linear" | "tree">
      })
    | false
}

export interface UseDismissProps {
  // ... existing options
  tree?:
    | (TreeAwareOptions & {
        dismissMode?: MaybeRefOrGetter<"node" | "branch" | "topmost">
      })
    | false
}
```

### 3. Tree-Aware Context Factory

```typescript
export function createTreeAwareContext(
  baseContext: FloatingContext,
  treeContext?: FloatingTreeContext
): FloatingContext {
  if (!treeContext) return baseContext

  return {
    ...baseContext,
    setOpen: createTreeAwareSetOpen(baseContext.setOpen, treeContext),
    tree: treeContext.tree,
    nodeId: treeContext.nodeId,
    treeOptions: treeContext.options,
  }
}
```

### 4. Enhanced Interaction Composables

Each interaction composable will be enhanced to:

1. Automatically detect tree context using `useFloatingTreeContext()`
2. Create tree-aware behavior when context is present
3. Respect tree-specific options passed in the composable options
4. Fall back to original behavior when no tree context exists

```typescript
export function useClick(context: FloatingContext, options: UseClickOptions = {}): void {
  // Detect tree context
  const treeContext = useFloatingTreeContext()

  // Create enhanced context if tree is present
  const enhancedContext = createTreeAwareContext(context, treeContext)

  // Apply tree options if specified
  const treeOptions =
    options.tree !== false
      ? {
          ...treeContext?.options,
          ...options.tree,
        }
      : null

  // Original click logic with tree-aware enhancements
  // ...
}
```

## Data Models

### Tree State Coordination Model

```typescript
interface TreeStateChange {
  nodeId: string
  action: "open" | "close" | "hover" | "focus" | "dismiss"
  source: "click" | "hover" | "focus" | "dismiss" | "external"
  metadata?: Record<string, unknown>
}

interface TreeCoordinationResult {
  allowed: boolean
  sideEffects: TreeStateChange[]
  warnings?: string[]
}
```

### Tree Options Resolution Model

```typescript
interface ResolvedTreeOptions extends TreeAwareOptions {
  // Resolved from multiple sources with precedence:
  // 1. Interaction-specific options
  // 2. Tree context options
  // 3. Default values

  readonly closeSiblingsOnOpen: boolean
  readonly closeDescendantsOnClose: boolean
  readonly closeOnAncestorClose: boolean
  readonly preventOpenIfDescendantOpen: boolean
}
```

## Error Handling

### Tree Context Validation

- Validate that nodeId exists in the provided tree
- Warn when tree options conflict between different interactions
- Provide helpful error messages for common misconfigurations

### Graceful Degradation

- Fall back to non-tree behavior if tree context becomes invalid
- Handle tree disposal gracefully
- Maintain interaction functionality even if tree coordination fails

### Development Warnings

```typescript
// Development-only warnings for common issues
if (__DEV__) {
  if (treeContext && !treeContext.tree.findNodeById(treeContext.nodeId)) {
    console.warn(`Tree node "${treeContext.nodeId}" not found in tree`)
  }

  if (conflictingOptions.length > 0) {
    console.warn("Conflicting tree options detected:", conflictingOptions)
  }
}
```

## Testing Strategy

### Unit Testing

- Test each interaction composable with and without tree context
- Test tree option resolution and precedence
- Test error handling and edge cases
- Mock tree context for isolated testing

### Integration Testing

- Test coordination between multiple interaction types
- Test complex tree hierarchies with multiple levels
- Test tree state changes and side effects
- Test performance with large trees

### Regression Testing

- Ensure backward compatibility with existing code
- Test that non-tree usage remains unchanged
- Verify that tree-aware features don't impact performance when not used

### Test Structure

```typescript
describe("useClick with tree integration", () => {
  describe("without tree context", () => {
    // Tests for backward compatibility
  })

  describe("with tree context", () => {
    describe("sibling coordination", () => {
      // Tests for sibling closure behavior
    })

    describe("descendant coordination", () => {
      // Tests for descendant closure behavior
    })

    describe("option resolution", () => {
      // Tests for tree option precedence and resolution
    })
  })
})
```

### Performance Testing

- Benchmark tree coordination overhead
- Test memory usage with large trees
- Measure impact on interaction responsiveness
- Profile tree traversal operations

## Migration Strategy

### Phase 1: Foundation (Backward Compatible)

1. Add tree context provider system
2. Enhance FloatingContext interface (optional fields)
3. Create tree-aware context factory
4. Add tree option interfaces

### Phase 2: Interaction Enhancement (Backward Compatible)

1. Enhance useClick with tree detection
2. Enhance useHover with tree coordination
3. Enhance useFocus with tree awareness
4. Enhance useDismiss with tree logic

### Phase 3: Advanced Features (Backward Compatible)

1. Add advanced tree options (hover coordination, focus navigation)
2. Implement performance optimizations
3. Add comprehensive TypeScript support
4. Create migration utilities for existing tree-aware code

### Phase 4: Deprecation (Breaking Changes)

1. Mark old tree composables as deprecated
2. Provide migration guide and tooling
3. Remove deprecated composables in next major version

## Implementation Notes

### Tree Detection Priority

1. Explicit tree options in interaction composable
2. Tree context from provider
3. No tree behavior (backward compatibility)

### Option Resolution Order

1. Interaction-specific tree options (highest priority)
2. Tree context default options
3. Built-in defaults (lowest priority)

### Performance Considerations

- Lazy tree context detection (only when needed)
- Memoized tree option resolution
- Efficient tree traversal for coordination
- Minimal overhead when tree features aren't used

### TypeScript Support

- Full type safety for tree options
- Conditional types based on tree context presence
- IntelliSense support for tree-aware features
- Compile-time validation of tree configurations
