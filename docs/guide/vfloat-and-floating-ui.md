# VFloat and Floating UI

VFloat is heavily inspired by Floating UI, but it is not a fork and should not be understood as a one-to-one port with renamed exports.

That distinction matters because it affects how you read the docs, how you reason about behavior, and how much prior knowledge you should assume carries over.

## What Carries Over

Some core ideas are familiar if you have used Floating UI before:

- placement-based positioning
- middleware-driven refinement
- virtual elements
- collision handling concepts

## What Does Not Carry Over Cleanly

VFloat has its own public vocabulary and its own grouping model.

In particular:

- the public root is centered around `useFloating(anchorEl, floatingEl, options)`
- the return value is grouped into `refs`, `state`, and `position`
- interaction composables are designed around that grouped root

So while some concepts may feel familiar, the library should still be learned on its own terms.

## Next Step

- Read [Floating Context](/guide/floating-context) to understand the core VFloat model.
- Read [Middleware Pipeline](/guide/middleware-pipeline) if you want to compare the positioning flow conceptually without assuming identical APIs.
