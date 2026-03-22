# API Reference

These pages document the public composables and middleware exported by VFloat. Use them for signatures, options, and return values; use the guide pages for workflows and combinations.

## Positioning

- [`useFloating`](/api/use-floating) - Positions a floating element relative to an anchor element
- [`useArrow`](/api/use-arrow) - Connects an arrow element to a floating context
- [`useClientPoint`](/api/use-client-point) - Positions a floating element relative to pointer coordinates

## Interactions

- [`useClick`](/api/use-click) - Opens and closes floating content on click
- [`useHover`](/api/use-hover) - Opens and closes floating content on hover
- [`useFocus`](/api/use-focus) - Opens and closes floating content on focus
- [`useFocusTrap`](/api/use-focus-trap) - Keeps keyboard focus inside floating content
- [`useEscapeKey`](/api/use-escape-key) - Closes floating content when Escape is pressed
- [`useListNavigation`](/api/use-list-navigation) - Moves between items with the keyboard

## Middleware

- [`arrow`](/api/arrow) - Aligns an arrow with the reference element
- [`autoPlacement`](/api/autoplacement) - Chooses a placement that fits available space
- [`flip`](/api/flip) - Switches to another placement when space is limited
- [`hide`](/api/hide) - Exposes visibility state for clipped references and escaped floating elements
- [`offset`](/api/offset) - Adds distance between the reference and floating element
- [`shift`](/api/shift) - Keeps the floating element within view
- [`size`](/api/size) - Measures available space for sizing the floating element
