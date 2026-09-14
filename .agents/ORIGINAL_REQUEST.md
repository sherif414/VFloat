# Original User Request

## 2026-09-14T11:02:47Z

This is a single self-contained fix; keep it small and focused. Implement RFC 0002 (Unified Composite Node Architecture) across VFloat with a clean break (no backward compatibility needed): replace the separate FloatingTree coordinator entirely with the unified composite FloatingNode pattern, refactor dependent composables to uniform spatial/topological queries, and remove obsolete tree types and options.

Working directory: C:/Users/shareef/.gemini/antigravity/worktrees/VFloat/implement_unified_composite_node
Working branch: implement_unified_composite_node
Integrity mode: development
Reference document: c:/projects/VFloat/RFC/0002-unified-composite-node.md

## Requirements

### R1. Composite Floating Node Core Contract & Topology
Implement the unified `FloatingNode` composite pattern in `src/composables/floating-tree/use-floating-node.ts`:
- Support standalone surfaces ($N = 0$) and nested composite hierarchies ($N > 0$) uniformly via explicit `parent?: MaybeRefOrGetter<FloatingNode | null>`.
- Expose read-only hierarchy topology properties (`parent`, `children`) and atomic hierarchical mutators (`appendChild`, `removeChild`) with cycle/self-parenting detection and automatic cleanup on scope disposal (`onScopeDispose`).
- Implement unified spatial and topological queries on the node:
  - `contains(target)`: checks local physical DOM containment first, then recurses into open children.
  - `getDeepestOpenDescendant()`: returns the leaf open descendant node.
  - `getFloatingElements()`: returns all floating DOM elements across open descendants.
  - `closeDescendants(reason?)`: invokes `setOpen(false)` across all active descendants.
- Note: Keep Section 8 exploratory questions (async gating, shared dispatchers, cascade bypass, middleware pipelining) out of scope for this pass.

### R2. Refactor Dependent Composables to Uniform Node Queries
Eliminate all `if (tree)` branching, legacy tree options, and dual-path code across interaction composables:
- `useDismiss` / `useOutsideClick`: Use `node.contains(target)` to determine outside interaction boundaries.
- `useDismiss` / `useEscapeKey`: Implement the leaf-first Escape key protocol (ancestor nodes with open children ignore Escape and allow the event to pass through; only the deepest open leaf node consumes Escape and calls `setOpen(false)`).
- `useHover`: Leverage `node.contains(event.relatedTarget)` to detect pointer movements into child submenus and nested floating elements.
- `useRovingFocus` / `keyboard-navigation`: Coordinate submenu collapse and item navigation with `node.parent` and `node.closeDescendants()`.

### R3. Clean Removal of Legacy Tree APIs (No Backward Compatibility)
- Fully remove the obsolete `FloatingTree` class, `useFloatingTree()`, and `use-floating-tree.ts`.
- Remove legacy `tree` options and types from all composables and public export barrels (`src/index.ts`). No deprecated shims or backward-compatibility baggage.

## Acceptance Criteria

### Automated Test Suite & Regressions
- [ ] Vitest test suite (`pnpm run test:run`) passes completely with zero regressions.
- [ ] New unit and render-based regression tests cover:
  - Standalone composite node ($N = 0$).
  - Single-component flat script nested surfaces (`parent: root`).
  - Multi-component prop-driven nested submenus (`:parent="root"`).
  - Leaf-first Escape key dismissal across a 3-level deep hierarchy ($Root \to Sub \to SubSub$).
  - Teardown and unmount cleanup preventing memory retention.
- [ ] Legacy tree tests are deleted or updated to the new composite node API.

### Code Quality & Standards
- [ ] Oxlint checks pass with zero errors (`pnpm lint`).
- [ ] TypeScript typechecking and compilation build succeed with zero errors (`pnpm build`).
- [ ] SSR test suite passes without DOM access errors or SSR leaks (`pnpm run test:ssr`).
- [ ] Module encapsulation rules from AGENTS.md are respected (internals kept unexported; no speculative exports).
