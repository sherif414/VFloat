# VFloat Interaction Composables API Documentation

## Documentation Structure

This design outlines a comprehensive API documentation system for VFloat interaction composables, organized as separate page files with sidebar navigation.

## File Structure

```
docs/
├── interactions/
│   ├── index.md                    # Overview & Getting Started
│   ├── use-click.md                # Click interaction composable
│   ├── use-hover.md                # Hover interaction composable
│   ├── use-focus.md                # Focus interaction composable
│   ├── use-client-point.md         # Client point positioning
│   ├── use-outside-click.md        # Outside click detection
│   ├── use-escape-key.md           # Escape key handling
│   └── integration-patterns.md     # Common usage patterns
```

## Sidebar Navigation Structure

```yaml
sidebar:
  - text: "Interactions"
    items:
      - text: "Overview"
        link: "/interactions/"
      - text: "useClick"
        link: "/interactions/use-click"
      - text: "useHover"
        link: "/interactions/use-hover"
      - text: "useFocus"
        link: "/interactions/use-focus"
      - text: "useClientPoint"
        link: "/interactions/use-client-point"
      - text: "useOutsideClick"
        link: "/interactions/use-outside-click"
      - text: "useEscapeKey"
        link: "/interactions/use-escape-key"
      - text: "Integration Patterns"
        link: "/interactions/integration-patterns"
```

---

## Page Content Specifications

### 1. Overview Page (`/interactions/index.md`)

````markdown
# Interaction Composables

## What are Interaction Composables?

VFloat provides a comprehensive set of interaction composables for managing floating element behaviors.

## Core Concepts

### FloatingContext

All interaction composables require a FloatingContext object:

```ts
interface FloatingContext {
  open: Ref<boolean>
  setOpen: (open: boolean) => void
  refs: {
    anchorEl: Ref<HTMLElement | VirtualElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
}
```
````

### Reactive Parameters

Most options accept MaybeRefOrGetter<T> types:

- Static values: `true`, `"click"`
- Reactive refs: `ref(true)`, `computed(() => condition)`
- Getter functions: `() => someCondition`

## Available Composables

| Composable                                         | Purpose                 | Key Features                         |
| -------------------------------------------------- | ----------------------- | ------------------------------------ |
| [useClick](/interactions/use-click)                | Click interactions      | Toggle on click, keyboard support    |
| [useHover](/interactions/use-hover)                | Hover interactions      | Delays, safe polygon, rest detection |
| [useFocus](/interactions/use-focus)                | Focus interactions      | Keyboard navigation, focus-visible   |
| [useClientPoint](/interactions/use-client-point)   | Mouse positioning       | Virtual elements, axis locking       |
| [useOutsideClick](/interactions/use-outside-click) | Outside click detection | Custom handlers, event capture       |
| [useEscapeKey](/interactions/use-escape-key)       | Escape key handling     | Composition support                  |

## Quick Start

```ts
import { useFloating, useClick, useHover, useFocus } from "vfloat"

const context = useFloating(anchorEl, floatingEl)

// Add interactions
useClick(context)
useHover(context, { delay: 100 })
useFocus(context)
```

````

### 2. Individual Composable Pages

#### useClick Page (`/interactions/use-click.md`)

```markdown
# useClick

Enables showing/hiding the floating element when clicking the reference element.

## Import

```ts
import { useClick } from 'vfloat'
````

## Function Signature

```ts
function useClick(context: FloatingContext, options?: UseClickOptions): void
```

## Parameters

| Parameter | Type              | Required | Description                                             |
| --------- | ----------------- | -------- | ------------------------------------------------------- |
| `context` | `FloatingContext` | ✅       | The floating context with open state and change handler |
| `options` | `UseClickOptions` | ❌       | Configuration options for click behavior                |

## Options

```ts
interface UseClickOptions {
  enabled?: MaybeRefOrGetter<boolean>
  event?: MaybeRefOrGetter<"click" | "mousedown">
  toggle?: MaybeRefOrGetter<boolean>
  ignoreMouse?: MaybeRefOrGetter<boolean>
  keyboardHandlers?: MaybeRefOrGetter<boolean>
}
```

| Option             | Type                                       | Default   | Description                                           |
| ------------------ | ------------------------------------------ | --------- | ----------------------------------------------------- |
| `enabled`          | `MaybeRefOrGetter<boolean>`                | `true`    | Whether the click handler is enabled                  |
| `event`            | `MaybeRefOrGetter<"click" \| "mousedown">` | `"click"` | The mouse event type to listen for                    |
| `toggle`           | `MaybeRefOrGetter<boolean>`                | `true`    | Whether to toggle the open state with repeated clicks |
| `ignoreMouse`      | `MaybeRefOrGetter<boolean>`                | `false`   | Whether to ignore mouse input events                  |
| `keyboardHandlers` | `MaybeRefOrGetter<boolean>`                | `true`    | Whether to add keyboard handlers (Enter and Space)    |

## Behavior

### Mouse Events

- Handles click or mousedown events based on configuration
- Distinguishes between mouse, pen, and touch interactions
- Ignores non-primary mouse buttons

### Keyboard Events

- Supports Enter key for activation
- Supports Space key for activation (except in typeable elements)
- Prevents default scrolling behavior when appropriate

### Focus Management

- Prevents focus stealing when floating element is already open
- Handles focus correctly when clicking scrollbars or non-target elements

## Examples

### Basic Usage

```ts
const context = useFloating(anchorEl, floatingEl)
useClick(context)
```

### Mousedown Event

```ts
useClick(context, {
  event: "mousedown",
})
```

### One-way Opening

```ts
useClick(context, {
  toggle: false, // Only opens, doesn't close on repeat clicks
})
```

### Conditional Enabling

```ts
const isClickEnabled = ref(true)
useClick(context, {
  enabled: isClickEnabled,
})
```

## Accessibility

- ✅ **Keyboard Support**: Enter and Space keys work automatically
- ✅ **Focus Management**: Prevents unintended focus changes
- ✅ **Screen Readers**: Works with assistive technologies
- ✅ **Touch Support**: Handles touch interactions appropriately

## Related

- [useFocus](/interactions/use-focus) - For keyboard-only interactions
- [useHover](/interactions/use-hover) - For hover-based interactions
- [Integration Patterns](/interactions/integration-patterns) - Combining multiple interactions

````

#### useHover Page (`/interactions/use-hover.md`)

```markdown
# useHover

Enables showing/hiding the floating element when hovering over the reference element.

## Import

```ts
import { useHover } from 'vfloat'
````

## Function Signature

```ts
function useHover(context: FloatingContext, options?: UseHoverOptions): void
```

## Parameters

| Parameter | Type              | Required | Description                                             |
| --------- | ----------------- | -------- | ------------------------------------------------------- |
| `context` | `FloatingContext` | ✅       | The floating context with open state and change handler |
| `options` | `UseHoverOptions` | ❌       | Configuration options for hover behavior                |

## Options

```ts
interface UseHoverOptions {
  enabled?: MaybeRef<boolean>
  delay?: MaybeRef<number | { open?: number; close?: number }>
  restMs?: MaybeRef<number>
  mouseOnly?: MaybeRef<boolean>
  safePolygon?: MaybeRef<boolean | SafePolygonOptions>
}
```

| Option        | Type                                      | Default | Description                                                |
| ------------- | ----------------------------------------- | ------- | ---------------------------------------------------------- |
| `enabled`     | `MaybeRef<boolean>`                       | `true`  | Whether hover event listeners are enabled                  |
| `delay`       | `MaybeRef<number \| DelayObject>`         | `0`     | Delay in milliseconds before showing/hiding                |
| `restMs`      | `MaybeRef<number>`                        | `0`     | Time pointer must rest before opening (when no open delay) |
| `mouseOnly`   | `MaybeRef<boolean>`                       | `false` | Whether to only trigger for mouse-like pointers            |
| `safePolygon` | `MaybeRef<boolean \| SafePolygonOptions>` | `false` | Enable safe polygon traversal algorithm                    |

### Delay Configuration

```ts
type DelayValue =
  | number
  | {
      open?: number // Delay before opening
      close?: number // Delay before closing
    }
```

### Safe Polygon Options

```ts
interface SafePolygonOptions {
  buffer?: number // Buffer area around polygon
  blockPointerEvents?: boolean // Block pointer events during traversal
}
```

## Examples

### Basic Usage

```ts
const context = useFloating(anchorEl, floatingEl)
useHover(context)
```

### With Delays

```ts
useHover(context, {
  delay: { open: 100, close: 300 },
})
```

### Mouse-only with Safe Polygon

```ts
useHover(context, {
  mouseOnly: true,
  safePolygon: true,
})
```

## Accessibility

- ⚠️ **Touch Devices**: Consider disabling on touch-only devices
- ✅ **Keyboard Users**: Should be paired with `useFocus` for accessibility
- ⚠️ **Screen Readers**: Hover-only interactions may not be accessible

## Related

- [useFocus](/interactions/use-focus) - Essential for keyboard accessibility
- [useClick](/interactions/use-click) - Alternative interaction method

````

#### useFocus Page (`/interactions/use-focus.md`)

```markdown
# useFocus

Enables showing/hiding the floating element when focusing the reference element.

## Import

```ts
import { useFocus } from 'vfloat'
````

## Function Signature

```ts
function useFocus(context: FloatingContext, options?: UseFocusOptions): UseFocusReturn
```

## Parameters

| Parameter | Type              | Required | Description                                             |
| --------- | ----------------- | -------- | ------------------------------------------------------- |
| `context` | `FloatingContext` | ✅       | The floating context with open state and change handler |
| `options` | `UseFocusOptions` | ❌       | Configuration options for focus behavior                |

## Options

```ts
interface UseFocusOptions {
  enabled?: MaybeRefOrGetter<boolean>
  requireFocusVisible?: MaybeRefOrGetter<boolean>
}
```

| Option                | Type                        | Default | Description                                                   |
| --------------------- | --------------------------- | ------- | ------------------------------------------------------------- |
| `enabled`             | `MaybeRefOrGetter<boolean>` | `true`  | Whether focus event listeners are enabled                     |
| `requireFocusVisible` | `MaybeRefOrGetter<boolean>` | `true`  | Whether to only open when focus is visible (`:focus-visible`) |

## Examples

### Basic Usage

```ts
const context = useFloating(anchorEl, floatingEl)
useFocus(context)
```

### Allow Any Focus Source

```ts
useFocus(context, {
  requireFocusVisible: false, // Opens on any focus, not just keyboard
})
```

## Accessibility

- ✅ **Keyboard Navigation**: Primary purpose - enables keyboard access
- ✅ **Screen Readers**: Works seamlessly with assistive technologies
- ✅ **WCAG Compliance**: Follows focus visibility best practices

## Related

- [useClick](/interactions/use-click) - For click-based interactions
- [useHover](/interactions/use-hover) - For hover-based interactions

````

#### useClientPoint Page (`/interactions/use-client-point.md`)

```markdown
# useClientPoint

Positions the floating element relative to a client point (mouse position).

## Import

```ts
import { useClientPoint } from 'vfloat'
````

## Function Signature

```ts
function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: UseClientPointOptions
): UseClientPointReturn
```

## Parameters

| Parameter       | Type                       | Required | Description                                     |
| --------------- | -------------------------- | -------- | ----------------------------------------------- |
| `pointerTarget` | `Ref<HTMLElement \| null>` | ✅       | DOM element for pointer event listeners         |
| `context`       | `FloatingContext`          | ✅       | The floating context with position reference    |
| `options`       | `UseClientPointOptions`    | ❌       | Configuration options for client point behavior |

## Options

```ts
interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>
  axis?: MaybeRefOrGetter<"x" | "y" | "both">
  x?: MaybeRefOrGetter<number | null>
  y?: MaybeRefOrGetter<number | null>
}
```

| Option    | Type                                     | Default  | Description                         |
| --------- | ---------------------------------------- | -------- | ----------------------------------- |
| `enabled` | `MaybeRefOrGetter<boolean>`              | `true`   | Whether the composable is enabled   |
| `axis`    | `MaybeRefOrGetter<"x" \| "y" \| "both">` | `"both"` | Which axis to track for positioning |
| `x`       | `MaybeRefOrGetter<number \| null>`       | `null`   | Controlled x coordinate             |
| `y`       | `MaybeRefOrGetter<number \| null>`       | `null`   | Controlled y coordinate             |

## Return Value

```ts
interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
}
```

## Examples

### Context Menu

```ts
const target = ref<HTMLElement | null>(null)
const context = useFloating()
const { coordinates } = useClientPoint(target, context)

// Right-click context menu
target.value?.addEventListener("contextmenu", (e) => {
  e.preventDefault()
  context.setOpen(true)
})
```

### Controlled Positioning

```ts
const x = ref(100)
const y = ref(200)
useClientPoint(target, context, { x, y })
```

````

#### useOutsideClick Page (`/interactions/use-outside-click.md`)

```markdown
# useOutsideClick

Adds an outside-click listener that closes the floating element when clicking outside.

## Import

```ts
import { useOutsideClick } from 'vfloat'
````

## Function Signature

```ts
function useOutsideClick(context: FloatingContext, options?: UseOutsideClickProps): void
```

## Options

```ts
interface UseOutsideClickProps {
  enabled?: MaybeRefOrGetter<boolean>
  capture?: boolean
  eventName?: "pointerdown" | "mousedown" | "click"
  onOutsideClick?: (event: MouseEvent, context: FloatingContext) => void
}
```

| Option           | Default         | Description                                 |
| ---------------- | --------------- | ------------------------------------------- |
| `enabled`        | `true`          | Whether outside click listeners are enabled |
| `capture`        | `true`          | Whether to use capture phase                |
| `eventName`      | `"pointerdown"` | Event type to listen for                    |
| `onOutsideClick` | `undefined`     | Custom handler function                     |

## Examples

```ts
// Basic usage
useOutsideClick(context)

// Custom handler
useOutsideClick(context, {
  onOutsideClick: (event, context) => {
    console.log("Clicked outside!")
    context.setOpen(false)
  },
})
```

````

#### useEscapeKey Page (`/interactions/use-escape-key.md`)

```markdown
# useEscapeKey

Handles escape key press events with composition support.

## Import

```ts
import { useEscapeKey } from 'vfloat'
````

## Function Signature

```ts
function useEscapeKey(options: UseEscapeKeyOptions): void
```

## Options

```ts
interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>
  capture?: boolean
  onEscape: (event: KeyboardEvent) => void
}
```

| Option     | Default    | Description                        |
| ---------- | ---------- | ---------------------------------- |
| `enabled`  | `true`     | Whether escape listener is enabled |
| `capture`  | `false`    | Whether to use capture phase       |
| `onEscape` | _required_ | Callback when escape is pressed    |

## Examples

```ts
// Basic usage
useEscapeKey({
  onEscape: () => context.setOpen(false),
})

// With condition
const isModalOpen = ref(true)
useEscapeKey({
  enabled: isModalOpen,
  onEscape: () => context.setOpen(false),
})
```

````

### 3. Integration Patterns Page (`/interactions/integration-patterns.md`)

```markdown
# Integration Patterns

Common patterns for combining multiple interaction composables.

## Complete Tooltip

```ts
const context = useFloating(anchorEl, floatingEl)

// Hover for mouse users
useHover(context, {
  delay: { open: 100, close: 300 },
  mouseOnly: true
})

// Focus for keyboard users
useFocus(context)

// Close on escape
useEscapeKey({
  enabled: context.open,
  onEscape: () => context.setOpen(false)
})
````

## Dropdown Menu

```ts
const context = useFloating(anchorEl, floatingEl)

// Click to toggle
useClick(context)

// Close on outside click
useOutsideClick(context)

// Close on escape
useEscapeKey({
  onEscape: () => context.setOpen(false),
})
```

## Context Menu

```ts
const target = ref<HTMLElement | null>(null)
const context = useFloating()

// Position at mouse location
useClientPoint(target, context)

// Close interactions
useOutsideClick(context)
useEscapeKey({
  onEscape: () => context.setOpen(false),
})
```

## Mobile-Responsive

```ts
const isMobile = ref(false)
const context = useFloating(anchorEl, floatingEl)

// Hover only on desktop
useHover(context, {
  enabled: computed(() => !isMobile.value),
})

// Click always available
useClick(context)

// Focus for accessibility
useFocus(context)
```

```

## Implementation Guidelines

### Page Template Structure
Each composable page should follow this consistent structure:

1. **Title & Brief Description**
2. **Import Statement**
3. **Function Signature**
4. **Parameters Table**
5. **Options Interface & Details**
6. **Return Value (if applicable)**
7. **Behavior Section**
8. **Examples Section**
9. **Accessibility Notes**
10. **Related Links**

### Navigation Features

- **Breadcrumbs**: Show current location within interactions section
- **Next/Previous**: Link between related composables
- **Quick Reference**: Sidebar with function signatures
- **Search**: Enable search across all interaction docs

### Content Guidelines

- **Code Examples**: Always include practical, runnable examples
- **Accessibility**: Highlight accessibility considerations for each composable
- **TypeScript**: Full type information with proper syntax highlighting
- **Cross-References**: Link to related composables and patterns

### Responsive Design

- **Mobile Navigation**: Collapsible sidebar for mobile devices
- **Code Blocks**: Horizontal scroll for long code examples
- **Table Layout**: Responsive tables for options and parameters

## Cross-Reference Matrix

| Use Case | Primary | Secondary | Accessibility |
|----------|---------|-----------|---------------|
| Tooltip | `useHover` | `useFocus` | Essential |
| Dropdown | `useClick` | `useOutsideClick`, `useEscapeKey` | Recommended |
| Context Menu | `useClientPoint` | `useOutsideClick`, `useEscapeKey` | Important |
| Modal | `useClick` | `useOutsideClick`, `useEscapeKey` | Critical |
| Popover | `useClick`, `useHover` | `useFocus`, `useOutsideClick` | Essential |
}
```

### Option Details

| Option                | Type                        | Default | Description                                                   |
| --------------------- | --------------------------- | ------- | ------------------------------------------------------------- |
| `enabled`             | `MaybeRefOrGetter<boolean>` | `true`  | Whether focus event listeners are enabled                     |
| `requireFocusVisible` | `MaybeRefOrGetter<boolean>` | `true`  | Whether to only open when focus is visible (`:focus-visible`) |

### Return Value

```ts
type UseFocusReturn = undefined
```

### Behavior

- **Keyboard Navigation**: Designed specifically for keyboard-only interactions
- **Focus Visible**: Respects `:focus-visible` CSS selector behavior
- **Safari Compatibility**: Includes Safari-specific focus-visible polyfill
- **Floating Element Focus**: Keeps open when focus moves to floating element
- **Edge Case Handling**: Manages tab switching and window blur scenarios

### Usage Examples

```ts
// Basic focus interaction
const context = useFloating(...)
useFocus(context)

// Allow focus from any source (not just keyboard)
useFocus(context, {
  requireFocusVisible: false
})

// Conditionally enable focus
const keyboardOnly = ref(true)
useFocus(context, {
  enabled: keyboardOnly
})
```

---

## useClientPoint

Positions the floating element relative to a client point (mouse position).

### Function Signature

```ts
function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: UseClientPointOptions
): UseClientPointReturn
```

### Parameters

| Parameter       | Type                       | Description                                     |
| --------------- | -------------------------- | ----------------------------------------------- |
| `pointerTarget` | `Ref<HTMLElement \| null>` | DOM element for pointer event listeners         |
| `context`       | `FloatingContext`          | The floating context with position reference    |
| `options`       | `UseClientPointOptions`    | Configuration options for client point behavior |

### Options Interface

```ts
interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>
  axis?: MaybeRefOrGetter<"x" | "y" | "both">
  x?: MaybeRefOrGetter<number | null>
  y?: MaybeRefOrGetter<number | null>
}
```

### Option Details

| Option    | Type                                     | Default  | Description                         |
| --------- | ---------------------------------------- | -------- | ----------------------------------- |
| `enabled` | `MaybeRefOrGetter<boolean>`              | `true`   | Whether the composable is enabled   |
| `axis`    | `MaybeRefOrGetter<"x" \| "y" \| "both">` | `"both"` | Which axis to track for positioning |
| `x`       | `MaybeRefOrGetter<number \| null>`       | `null`   | Controlled x coordinate             |
| `y`       | `MaybeRefOrGetter<number \| null>`       | `null`   | Controlled y coordinate             |

### Return Value

```ts
interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
}
```

### Behavior

- **Virtual Element**: Creates a virtual reference element at mouse position
- **Axis Locking**: Can restrict tracking to specific axes
- **Controlled Mode**: Allows external coordinate control
- **Pointer Tracking**: Follows mouse movements when floating element is open

### Usage Examples

```ts
// Track mouse position on both axes
const target = ref<HTMLElement | null>(null)
const context = useFloating(...)
const { coordinates, updatePosition } = useClientPoint(target, context)

// Lock to horizontal axis only
useClientPoint(target, context, {
  axis: "x"
})

// Controlled coordinates
const x = ref(100)
const y = ref(200)
useClientPoint(target, context, { x, y })

// Manual position update
updatePosition(150, 250)
```

---

## useOutsideClick

Adds an outside-click listener that closes the floating element when clicking outside.

### Function Signature

```ts
function useOutsideClick(context: FloatingContext, options?: UseOutsideClickProps): void
```

### Parameters

| Parameter | Type                   | Description                                      |
| --------- | ---------------------- | ------------------------------------------------ |
| `context` | `FloatingContext`      | The floating context containing refs and state   |
| `options` | `UseOutsideClickProps` | Configuration options for outside click behavior |

### Options Interface

```ts
interface UseOutsideClickProps {
  enabled?: MaybeRefOrGetter<boolean>
  capture?: boolean
  eventName?: "pointerdown" | "mousedown" | "click"
  onOutsideClick?: (event: MouseEvent, context: FloatingContext) => void
}
```

### Option Details

| Option           | Type                                      | Default         | Description                                        |
| ---------------- | ----------------------------------------- | --------------- | -------------------------------------------------- |
| `enabled`        | `MaybeRefOrGetter<boolean>`               | `true`          | Whether outside press listeners are enabled        |
| `capture`        | `boolean`                                 | `true`          | Whether to use capture phase for document listener |
| `eventName`      | `"pointerdown" \| "mousedown" \| "click"` | `"pointerdown"` | The event type to listen for                       |
| `onOutsideClick` | `Function`                                | `undefined`     | Custom handler instead of default close behavior   |

### Behavior

- **Document Listener**: Attaches global event listener to detect outside clicks
- **Element Detection**: Ignores clicks within anchor or floating elements
- **Scrollbar Handling**: Ignores clicks on scrollbars
- **Custom Handling**: Allows custom outside click behavior
- **Event Capture**: Supports both capture and bubble phases

### Usage Examples

```ts
// Basic outside click to close
const context = useFloating(...)
useOutsideClick(context)

// Custom outside click handler
useOutsideClick(context, {
  onOutsideClick: (event, context) => {
    console.log('Clicked outside!')
    context.setOpen(false)
  }
})

// Use click event instead of pointerdown
useOutsideClick(context, {
  eventName: "click"
})
```

---

## useEscapeKey

Handles escape key press events with composition support.

### Function Signature

```ts
function useEscapeKey(options: UseEscapeKeyOptions): void
```

### Parameters

| Parameter | Type                  | Description                                   |
| --------- | --------------------- | --------------------------------------------- |
| `options` | `UseEscapeKeyOptions` | Configuration options for escape key behavior |

### Options Interface

```ts
interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>
  capture?: boolean
  onEscape: (event: KeyboardEvent) => void
}
```

### Option Details

| Option     | Type                        | Default    | Description                                         |
| ---------- | --------------------------- | ---------- | --------------------------------------------------- |
| `enabled`  | `MaybeRefOrGetter<boolean>` | `true`     | Whether the escape key listener is enabled          |
| `capture`  | `boolean`                   | `false`    | Whether to use capture phase for document listeners |
| `onEscape` | `Function`                  | _required_ | Callback function executed when escape is pressed   |

### Behavior

- **Composition Support**: Ignores escape during text composition (IME input)
- **Document Listener**: Global escape key detection
- **Event Capture**: Configurable capture phase support

### Usage Examples

```ts
// Basic escape key handling
const context = useFloating(...)
useEscapeKey({
  onEscape: () => context.setOpen(false)
})

// With conditional enabling
const isModalOpen = ref(true)
useEscapeKey({
  enabled: isModalOpen,
  onEscape: (event) => {
    event.preventDefault()
    context.setOpen(false)
  }
})

// With capture phase
useEscapeKey({
  capture: true,
  onEscape: () => context.setOpen(false)
})
```

---

## Integration Patterns

### Complete Interaction Setup

```ts
// Comprehensive floating element with all interactions
const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
})

// Click to toggle
useClick(context)

// Hover with delay
useHover(context, {
  delay: { open: 100, close: 300 },
})

// Focus for keyboard users
useFocus(context)

// Close on outside click
useOutsideClick(context)

// Close on escape
useEscapeKey({
  onEscape: () => context.setOpen(false),
})
```

### Conditional Interactions

```ts
// Enable different interactions based on device/context
const isMobile = ref(false)
const isTouch = ref(false)

// Only hover on non-touch devices
useHover(context, {
  enabled: computed(() => !isTouch.value),
  mouseOnly: true,
})

// Always enable click
useClick(context)

// Focus for accessibility
useFocus(context, {
  enabled: true,
})
```

### Menu/Dropdown Pattern

```ts
// Context menu that follows mouse
const target = ref<HTMLElement | null>(null)
const context = useFloating(...)

// Position at right-click location
useClientPoint(target, context)

// Close on outside click or escape
useOutsideClick(context)
useEscapeKey({
  onEscape: () => context.setOpen(false)
})
```

## Type Definitions Summary

### Core Types

```ts
type MaybeRefOrGetter<T> = T | Ref<T> | ComputedRef<T> | (() => T)
type MaybeRef<T> = T | Ref<T>

interface FloatingContext {
  open: Ref<boolean>
  setOpen: (open: boolean) => void
  refs: {
    anchorEl: Ref<HTMLElement | VirtualElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
}
```

### Delay Configuration

```ts
type DelayValue =
  | number
  | {
      open?: number
      close?: number
    }
```

### Safe Polygon Options

```ts
interface SafePolygonOptions {
  buffer?: number
  blockPointerEvents?: boolean
}
```

## Browser Compatibility

All interaction composables are designed to work across modern browsers with the following considerations:

- **Pointer Events**: Uses modern pointer events API with fallbacks
- **Focus Visible**: Includes Safari polyfill for `:focus-visible` behavior
- **Composition Events**: Properly handles IME input during text composition
- **Touch Support**: Distinguishes between touch, mouse, and pen inputs
- **Accessibility**: Full keyboard navigation and screen reader support

## Performance Considerations

- **Event Cleanup**: All event listeners are automatically cleaned up on component unmount
- **Reactive Updates**: Efficiently responds to reactive option changes
- **Memory Management**: Prevents memory leaks through proper cleanup patterns
- **Debouncing**: Built-in delay and rest detection for hover interactions
- **Minimal Bundle**: Tree-shakable exports allow importing only needed composables
