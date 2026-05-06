# RFC: Tree Controller for Floating Coordination

Status: proposed

VFloat already has tree-aware coordination, but responsibility is split across the tree registry, each node, and interaction helpers. Structural work like registration, active-path tracking, and branch traversal is mixed with policy like sibling collapse and cascade close, while focus restoration and list-navigation handoff also leak into the tree layer. This RFC keeps `useFloating()` unchanged and refines tree coordination around an internal controller: the tree owns topology and semantic close orchestration, nodes become thin structural wrappers, and focus behavior stays with the interaction composables that know why a close happened.

## Decision

- Keep the public composables `useFloatingTree()` and `useFloatingTreeNode()`.
- Treat tree membership as explicit. Root nodes pass `tree`. Child nodes pass `parent`, or `tree` plus `parent`. Do not rely on `provide` / `inject` or implicit fallback tree creation in the core path.
- Move tree behavior behind an internal controller that owns registration, parent/child links, active node tracking, active path derivation, branch hit-testing, sibling lookup, and leaf-first branch close plans.
- Make tree policies tree-owned defaults.
- Preserve `OpenChangeReason` through every tree-driven close.
- Keep focus restoration and list-item return targeting out of the tree core.

## Goals

- Support teleported nested floats through a logical tree rather than DOM ancestry.
- Keep unrelated floating families isolated.
- Allow tree-aware outside-click, hover, blur, Escape, and submenu handoff.
- Close descendants before ancestors.
- Keep standalone `useFloating()` behavior unchanged when no tree is used.

## Non-goals

- A global app-wide floating registry.
- A menu-only abstraction.
- Promoting focus targets or list indices into the tree contract.
- Replacing the existing interaction composables with one monolithic tree composable.

## Public API

```ts
interface UseFloatingTreeOptions {
  id?: MaybeRefOrGetter<string | undefined>;
  closeSiblingsOnOpen?: boolean;
  closeChildrenOnClose?: boolean;
}

interface UseFloatingTreeNodeOptions {
  tree?: FloatingTree;
  parent?: MaybeRefOrGetter<FloatingTreeNode | null | undefined>;
  id?: MaybeRefOrGetter<string | undefined>;
}
```

`useFloatingTree()` returns the public tree surface: node lookup, active branch state, containment checks, and convenience close helpers. `useFloatingTreeNode()` returns structural state for a registered node: `id`, `parentId`, `childIds`, `isRoot`, `isLeaf`, `isActive`, and tree-aware close/query helpers.

The public API stays opt-in and keeps the `use...` naming convention. Because VFloat is still pre-1.0, removing inject-driven tree discovery is an acceptable breaking cleanup.

## Internal Architecture

Introduce an internal tree controller used by `useFloatingTree()`:

- Registry: register/unregister nodes and maintain parent/child links.
- Activity: mark opened/closed nodes and derive `activeId` and `activePath`.
- Queries: `getNode()`, `isWithinNode()`, `isWithinBranch()`, and `isWithinTree()`.
- Orchestration: `closeNode`, `closeBranch`, `closeChildren`, and `closeSiblings`.
- Policy resolution: tree defaults only.

All orchestration methods accept `{ reason, event }`. Public convenience methods may still default to `"programmatic"`, but internal callers such as `resolveTreeInteraction()` must call the reason-aware controller methods directly so semantic reasons are never lost during sibling or descendant closes.

## Responsibilities

### `useFloatingTree()`

- Create the controller and expose the public read/query surface.
- Store tree-level defaults for sibling collapse and cascade close.
- Own active-branch bookkeeping and branch traversal order.
- Own reason-aware close orchestration.

### `useFloatingTreeNode()`

- Resolve explicit topology from `tree` or `parent`.
- Register the context with the controller and unregister on scope dispose.
- Expose structural state and thin close/query helpers.
- Forward open/close state changes to the controller.

It should not own focus restoration, list-navigation return behavior, or policy decisions.

### Interaction composables

- `useClick`, `useHover`, `useFocus`, and `useFocusTrap` use branch containment and semantic close routing through `resolveTreeInteraction()`.
- `useEscapeKey` closes the active open node first, then its ancestors on repeated Escape.
- `useListNavigation` remains responsible for submenu return index and keyboard handoff metadata. That metadata stays in the internal bridge rather than the tree core.

## Focus and Keyboard Policy

The tree core never focuses anything. It only routes `setOpen(false, reason, event)` to the right nodes in the right order.

This avoids a leaf-first cascade where multiple nodes compete to restore focus. The composable that initiates the close is responsible for any return target it needs:

- `useEscapeKey` may restore to the closing node's anchor or opener item.
- `useFocusTrap` may restore to its own opener.
- `useListNavigation` owns return-to-parent-item behavior for submenu flows.

## Consequences

- The current `provideFloatingTree()` / `useCurrentFloatingTree()` path is removed from the core feature shape.
- `internal/tree-interaction.ts` becomes a thin adapter for containment and semantic close routing, not a focus/navigation helper.
- `use-floating-tree-node.ts` gets smaller and less policy-heavy.
- Tree-driven closes become more predictable because the initiating reason survives sibling and descendant cascades.

## Rejected Alternatives

- Keep policy on each node: rejected because structural registration and UI policy stay coupled.
- Let the tree restore focus: rejected because focus semantics depend on the initiating interaction, not just topology.
- Use a global registry: rejected because unrelated floating families should not interfere with each other.

## Acceptance Criteria

- Clicking or focusing inside a descendant branch is treated as inside the ancestor branch.
- Escape closes the deepest open node first.
- Opening one sibling branch closes the others at the same level.
- Closing a parent closes descendants leaf-first.
- Tree-driven sibling and descendant closes preserve the initiating `OpenChangeReason`.
- `useListNavigation` can still open child branches and return to the correct parent item.
- Standalone non-tree floating contexts behave exactly as they do today.
