# PRD: Tree Controller for Floating Coordination

Status: needs-triage

## Problem Statement

Nested floating elements in VFloat currently require coordination across multiple independent contexts (menus, submenus, nested dialogs, tooltips inside lists). Without a strong logical tree contract, interactions like outside click, Escape, hover leave, blur, and branch closing can conflict. This causes false dismissals, broken keyboard handoff, inconsistent close ordering, and fragile behavior when `Teleport` breaks DOM ancestry.

## Solution

Introduce a tree-controller coordination model that keeps `useFloating()` unchanged while providing explicit logical hierarchy between related floating contexts. The tree owns topology, active-branch state, containment checks, and reason-aware close orchestration. Nodes remain thin registration wrappers. Interaction composables stay independent, but route tree-aware behavior through a shared interaction adapter when tree membership exists.

## User Stories

1. As a menu user, I want clicking inside a child submenu to keep the parent menu open, so that I can continue navigating nested actions.
2. As a keyboard user, I want Escape to close the deepest open layer first, so that I can back out one level at a time.
3. As a keyboard user, I want ArrowRight to enter a submenu and ArrowLeft to return to the opener item, so that nested menus feel predictable.
4. As a pointer user, I want moving from a parent panel into a child panel to avoid closing the parent, so that submenu traversal is stable.
5. As a focus user, I want focus moving into a child floating element to be treated as still in-branch, so that blur does not prematurely dismiss ancestors.
6. As a user opening sibling branches, I want opening one sibling submenu to close other sibling submenus, so that only the active branch remains open.
7. As a user dismissing a parent, I want all descendants to close before the parent completes teardown, so that no orphaned child surfaces remain.
8. As a user of nested modal flows, I want a child modal trap to work without collapsing its parent branch, so that nested confirmations and wizards remain usable.
9. As a library consumer, I want unrelated floating families to remain isolated, so that one tree's interactions never close another tree's nodes.
10. As a library consumer, I want tree coordination to stay opt-in, so that standalone floating usage behaves exactly as before.
11. As a library consumer, I want close reasons preserved through tree-driven cascades, so that reason-dependent effects (like custom dismissal behavior) remain correct.
12. As a library consumer, I want explicit parent/tree linking, so that tree topology is deterministic and easy to reason about.
13. As a maintainer, I want tree responsibilities centralized in a deep module, so that orchestration changes do not require fragile multi-file behavior edits.
14. As a maintainer, I want nodes to stay thin and structural, so that policy decisions are not duplicated across every node instance.
15. As a maintainer, I want testable close plans and containment rules, so that regressions in nested behavior are caught early.
16. As a designer of rich overlays, I want nested tooltips/popovers/dialogs to cooperate under one logical branch model, so that advanced compositions are practical.
17. As a QA engineer, I want clear acceptance scenarios for nested menus, popover+dialog, and list+tooltip cases, so that behavior is validated against real-world workflows.
18. As a contributor, I want public composable naming to stay consistent with VFloat conventions, so that API ergonomics remain coherent.

## Implementation Decisions

- Build and standardize a tree controller module as the single orchestration seam for registration, active branch tracking, containment queries, and close planning.
- Keep `useFloatingTree()` as the public manager composable that exposes tree state and tree actions.
- Keep `useFloatingTreeNode()` as the public node composable, but limit it to explicit linkage, lifecycle registration, structural state exposure, and thin action forwarding.
- Require explicit topology in practical usage: roots are linked to a tree and children are linked to a parent (or equivalent explicit tree context).
- Keep policy ownership at the tree level (sibling collapse, cascade close defaults), not as node-level policy flags.
- Preserve close semantics by propagating the initiating open-change reason through tree-driven close paths.
- Keep focus restoration out of the tree core; composables that initiate close flows own any focus-return behavior they require.
- Keep list-navigation handoff metadata private to interaction bridging rather than promoting it to tree core API.
- Preserve standalone behavior when no tree is present by allowing interaction composables to fall back to local context behavior.
- Maintain strict logical-tree behavior independent of DOM hierarchy to support `Teleport` usage.

## Testing Decisions

- Good tests validate externally observable behavior only: open/close outcomes, containment decisions, ordering semantics, and keyboard/pointer/focus interaction results.
- Avoid testing internal implementation details such as private maps, intermediary counters, or internal traversal helpers directly.
- Test tree controller behavior for registration lifecycle, active branch transitions, sibling closing, descendant leaf-first close order, and reason propagation.
- Test node behavior for explicit linkage, lifecycle cleanup, and structural state consistency.
- Test interaction integrations for outside click, Escape layering, hover transitions, blur transitions, focus trap interplay, and list-navigation handoff behavior.
- Use existing interaction and tree test suites as prior art, especially tree-aware interaction tests and list-navigation nested-flow tests already present in the codebase.

## Out of Scope

- Redesigning `useFloating()` public call shape or grouped return shape.
- Converting the feature into a global registry spanning unrelated overlay families.
- Introducing a menu-only helper that bypasses the general tree abstraction.
- Broad docs IA refactors beyond tree-coordination feature documentation needs.
- Non-coordination visual/UX redesign work.

## Further Notes

- This PRD intentionally aligns with VFloat's pre-1.0 evolution model and allows targeted breaking cleanup when it simplifies architecture.
- The deepest-value outcome is a deep, stable coordination module with thin node adapters and predictable interaction integration points.
- Triage should prioritize risks around semantic close reason preservation and focus behavior ownership boundaries, as those are the most regression-prone seams.
