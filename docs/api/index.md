# API Reference

This page lists the public composables and middleware exported by VFloat.
Use it for signatures, options, and return values. For walkthroughs, see the [Guide](/guide/).

## Positioning

These APIs place one element relative to another element.

- [`useFloating`](./use-floating.md) - Positions a floating element relative to an anchor element
- [`useArrow`](./use-arrow.md) - Positions an arrow element relative to a floating element
- [`useClientPoint`](./use-client-point.md) - Positions a floating element relative to a pointer coordinate

## Interactions

These APIs react to user input.

- [`useClick`](./use-click.md) - Opens and closes floating content on click
- [`useHover`](./use-hover.md) - Opens and closes floating content on hover
- [`useFocus`](./use-focus.md) - Opens and closes floating content on focus
- [`useFocusTrap`](./use-focus-trap.md) - Keeps keyboard focus inside the floating content
- [`useEscapeKey`](./use-escape-key.md) - Closes floating content when Escape is pressed
- [`useListNavigation`](./use-list-navigation.md) - Moves between items with the keyboard

## Middleware

These middleware refine the final placement.

- [`arrow`](./arrow.md) - Aligns an arrow with the reference element
- [`autoPlacement`](./autoplacement.md) - Picks a placement that fits available space
- [`flip`](./flip.md) - Switches to another placement when space is limited
- [`hide`](./hide.md) - Marks the element as hidden when the reference is out of view
- [`offset`](./offset.md) - Adds distance between the reference and floating element
- [`shift`](./shift.md) - Keeps the floating element within view
- [`size`](./size.md) - Adjusts to the available space
