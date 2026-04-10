# Virtual Anchor Gotchas

Virtual anchors are powerful because they let you position against geometry instead of a real element. They are also easier to misuse because the anchor is synthetic.

## The First Trap: Choosing The Wrong Tracking Mode

If the surface should stay at the opening point, use static tracking. If it should follow the cursor, use follow mode.

Most jumpy menu bugs come from using a moving anchor for a UI that should have stayed still.

## The Second Trap: Forgetting The Anchor Is Not A Real Trigger

A virtual anchor has geometry, but it does not carry all the semantics of a real button or input.

That means you still need to think carefully about focus ownership, ARIA relationships, and who actually triggers open and close.

## Next Step

- Read [Use Virtual Anchors](/guide/use-virtual-anchors) for the main workflows.
- Read [Placement and Positioning](/guide/placement-and-positioning) if you want the geometry model behind virtual anchors.
