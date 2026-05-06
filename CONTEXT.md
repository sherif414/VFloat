# VFloat

VFloat is a Vue floating-surface library. Its language separates positioning, interaction behavior, semantic roles, and tree coordination so consumers can compose accessible floating UI without adopting a monolithic component model.

## Language

**Floating surface**:
A positioned element that appears relative to an anchor and may contain plain content, commands, options, or a nested branch.
_Avoid_: Popup as a catch-all when the surface role matters.

**Anchor**:
The element or virtual element that a floating surface is positioned from and usually controlled by.
_Avoid_: Reference, target.

**Role management**:
The semantic layer that synchronizes ARIA roles, relationships, and item state with the current floating context.
_Avoid_: Treating `role` attributes as static template decoration.

**List navigation**:
The interaction layer that moves focus or active-descendant state through ordered floating items.
_Avoid_: Role management, menu semantics.

**Command menu**:
A desktop-style composite widget whose items act as commands and therefore require managed focus, keyboard navigation, and synchronized ARIA menu semantics.
_Avoid_: Dropdown, site navigation menu.

**Disclosure navigation**:
A navigation pattern where buttons reveal ordinary links while preserving normal page-navigation expectations.
_Avoid_: ARIA menu.

**Floating tree**:
A relationship model that coordinates related floating surfaces so nested branches open, close, and restore focus predictably.
_Avoid_: Menu-only registry.

## Relationships

- A **Floating surface** belongs to one **Anchor** through a `FloatingContext`.
- **Role management** can describe a **Floating surface** as a **Command menu**, dialog, tooltip, listbox, tree, grid, or menubar.
- **List navigation** supplies the focus behavior that a **Command menu** promises.
- A **Floating tree** coordinates one root **Floating surface** and zero or more nested branch surfaces.
- **Disclosure navigation** is not a **Command menu** and should not use ARIA menu semantics.

## Example Dialogue

> **Dev:** "This dropdown has links. Should it use `role="menu"`?"
> **Domain expert:** "Only if it is a **Command menu** with full composite keyboard behavior. If it is ordinary site navigation, use **Disclosure navigation** instead."

> **Dev:** "Should `useListNavigation` set all the menu roles?"
> **Domain expert:** "No. **List navigation** moves through items; **Role management** owns the ARIA contract."

## Flagged Ambiguities

- "menu" can mean a **Command menu** or ordinary **Disclosure navigation**; resolved: VFloat docs should say **Command menu** when ARIA menu semantics are intended.
