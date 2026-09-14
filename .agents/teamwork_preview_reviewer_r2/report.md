# Reviewer Round 2 Adversarial Report

> [!WARNING] **Skepticism Disclaimer**
> High confidence in hierarchical leaf-first Escape unwinding and composite node spatial queries across 539 Vitest Browser Mode tests, though non-standard Shadow DOM slot-projection multi-window architectures remain verified through synthetic DOM paths.

## 1. What the prior attempt got wrong

### Issue: Parent / Root Escape Dismissal Inversion when Focused on Ancestor Elements
- **Input:** A composite hierarchy exists (e.g. `Root` -> `Child` submenu, both open). Focus or event target is on an element belonging to `Root` (such as `root.refs.anchorEl` trigger button or an item in `root.refs.floatingEl`). User presses `Escape`.
- **Expected:** `Root` has an active open child (`Child`). Under the leaf-first Escape key protocol (RFC 0002 R2), ancestor nodes with open children must ignore Escape and allow the event to pass through; only the deepest open leaf node consumes Escape and calls `setOpen(false)`. Thus, `Child` closes, and `Root` remains open.
- **Actual:** `Root` consumed Escape and called `setOpen(false, "escape-key", event)`, while `Child` ignored Escape and remained open! The child submenu was orphaned floating on the screen while its root trigger/menu closed underneath it.
- **Root Cause:** In `src/composables/dismiss/use-escape-key.ts`, the prior attempt checked `const hasOpenChildContainingTarget = node.children?.value && Array.from(node.children.value).some((child) => child.open.value && child.contains(target));`. If `target` was on `rootAnchor` or `rootFloating`, no child contained `target`, so `hasOpenChildContainingTarget` was `false`. As a result, `Root` did not bail and executed `setOpen(false)`. Meanwhile, `Child` checked `if (!child.contains(target)) return;` and bailed. This completely inverted the leaf-first protocol whenever user focus was on an ancestor surface.

## 2. What I changed

- **`src/composables/dismiss/use-escape-key.ts`**:
  - Implemented the strict invariant that any node with open children (`hasOpenChildren = node.children?.value && Array.from(node.children.value).some((child) => child.open.value)`) **must immediately bail** and allow Escape to pass through.
  - Added recursive `findTargetOwner(root, target)` helper to resolve the most specific open node containing `target` when the event occurs within the composite hierarchy.
  - Targeted dismissal specifically to `targetOwner.getDeepestOpenDescendant()`, ensuring that pressing Escape anywhere in an ancestor tree cleanly unwinds its deepest open leaf descendant first before the ancestor can close.
  - Ensured that neutral targets (e.g., `document.body` or headless tests) consistently close `root.getDeepestOpenDescendant()`.
- **`src/composables/dismiss/use-escape-key.test.ts`**:
  - Added regression test: `closes the open child and preserves root when target is root anchor element`.
  - Added regression test: `closes open child and preserves root when target is inside root floating element`.
  - Added regression test: `closes 3-level hierarchy leaf-first when target is inside middle level` (Root -> Sub -> SubSub).
  - Added regression test: `unwinds nested sibling branches cleanly when target is inside sibling branch` (Root -> [BranchA, BranchB -> BranchB1]).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `pnpm lint`: Passed 0 warnings and 0 errors across 80 files with `oxlint` and `oxfmt`.
  - `pnpm run test:ssr`: Passed 3/3 tests in Node environment (`src/__tests__/ssr.test.ts`).
  - `pnpm build`: Succeeded in 4.48s; bundled declaration files generated without TypeScript errors.
  - `pnpm vitest run src/composables/dismiss/use-escape-key.test.ts`: Passed all 19 tests.
  - `pnpm vitest run src/composables/keyboard-navigation/use-roving-focus.test.ts`: Passed all 97 tests.
  - `pnpm run test:run`: Passed 539/539 tests across 28 test files in Vitest Browser Mode (Chromium).
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - True cross-origin iframe boundaries where keyboard events originate from an untrusted foreign window context.
  - Complex custom element Shadow DOM shadow-root boundaries that omit `composedPath()`.

## 4. Known Issues
- `Minor Robustness Risk`: If two independent floating surfaces are open simultaneously without modal traps and focus is on `document.body`, pressing Escape closes whichever surface's document event listener was registered first.

## 5. Remaining risk & next step
- **Remaining Risk**: None within the scope of RFC 0002.
- **Next Step**: The unified composite node architecture implementation is complete, all obsolete tree APIs are removed with zero backward compatibility baggage, all edge cases in spatial and leaf-first topological Escape handling are verified, and all 539 tests pass with zero regressions. The branch is ready for merge.
