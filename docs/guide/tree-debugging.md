# Tree Debugging

When nested floating UI behaves strangely, the visual problem is often downstream of a tree registration or branch-coordination problem.

## Start With The Basic Questions

Ask these first:

- Is every branch registered as a tree node?
- Does the child node point at the correct parent?
- Does the parent list return the correct child node from `getChildNode`?
- Is the child list configured as nested when it should be?

If any of those answers is no, the branch behavior will usually feel wrong before the positioning does.

## Next Step

- Read [Build Nested Menus](/guide/build-nested-menus) for the intended structure.
- Read [Tree Coordination Explained](/guide/tree-coordination-explained) for the model behind branch-aware behavior.
