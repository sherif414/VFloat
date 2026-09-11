---
description: Choose between controlled and uncontrolled open state patterns.
---

# Controlled vs uncontrolled

VFloat supports both controlled and uncontrolled open state. That is a technical fact, but the more useful question is when each one leads to a better component design.

This page is about that design choice.

## Uncontrolled: the surface owns itself

In the uncontrolled model, the floating surface owns its own open state through the `context`.

To start an uncontrolled surface open, pass `defaultOpen`. It is a plain initial value, not a reactive input.

This is ideal when:

- the surface is local
- the behavior is simple
- the parent does not care about the open lifecycle

## Controlled: the parent owns the truth

In the controlled model, the parent owns an `open` ref and gives it to [`useFloatingNode`](/api/use-floating-node). Add `onOpenChange` when the parent needs to react to changes with side effects; VFloat keeps the `open` ref itself in sync.

This is ideal when:

- the floating surface is part of a larger flow
- the parent needs to coordinate several pieces of UI
- close and open behavior depend on outside business rules

## The practical rule

Start uncontrolled unless the parent has a real reason to own the state.

That is usually the right default because it keeps the component honest. If no outside system needs the state, lifting it often adds code without adding clarity.

## Where to go next

- Read [Control Open State](/guide/control-open-state) for the implementation shape.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) for a common controlled-state use case.
