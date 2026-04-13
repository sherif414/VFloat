---
description: Choose between controlled and uncontrolled open state patterns.
---

# Controlled vs Uncontrolled

VFloat supports both controlled and uncontrolled open state. That is a technical fact, but the more useful question is when each one leads to a better component design.

This page is about that design choice.

## Uncontrolled: The Surface Owns Itself

In the uncontrolled model, the floating surface owns its own open state through the `context`.

This feels good when:

- the surface is local
- the behavior is simple
- the parent does not care about the open lifecycle

## Controlled: The Parent Owns The Truth

In the controlled model, the parent owns an `open` ref and gives it to [`useFloating`](/api/use-floating), along with `onOpenChange`.

This feels good when:

- the floating surface is part of a larger flow
- the parent needs to coordinate several pieces of UI
- close and open behavior depend on outside business rules

## The Practical Rule

Start uncontrolled unless the parent has a real reason to own the state.

That is usually the right default because it keeps the component honest. If no outside system needs the state, lifting it often adds code without adding clarity.

## Next Step

- Read [Control Open State](/guide/control-open-state) for the implementation shape.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) for a common controlled-state use case.
