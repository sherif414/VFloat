# Floating Tree: Introduction

Welcome to the Floating Tree documentation! This guide will help you understand the core concepts behind the Floating Tree, why it's a powerful solution for complex UI problems, and how it can simplify your development process.

## The Core Problem: State Management Chaos

Imagine building an application with nested menus, popovers that open dialogs, or tooltips that can themselves trigger new floating elements. Without a centralized management system, you quickly run into significant challenges:

- **State Management Chaos**: Keeping track of which floating element is open, which is focused, and which should close when another opens becomes a nightmare. You end up with a tangled web of `v-if`s, `v-show`s, and `ref`s that are hard to debug and maintain.
- **Interaction Conflicts (Escape key, focus)**: How do you ensure the Escape key only closes the _topmost_ open element, not all of them? How do you manage focus correctly so it returns to the triggering element when a floating element closes, even if a nested one was just dismissed?
- **Event Handling Complexity ("click outside")**: Implementing a reliable "click outside to dismiss" for deeply nested elements is notoriously difficult. A click outside a child element might still be "inside" its parent, leading to unexpected behavior.

These challenges lead to brittle code, a poor user experience, and a lot of developer frustration.

## The Solution: A Hierarchical Approach

The Floating Tree provides a robust, hierarchical solution to manage all your floating elements. It organizes them into a tree-like structure, mirroring their visual and logical relationships. This allows you to orchestrate complex interactions with elegant, declarative code.

### Core Concepts Explained Simply

- **Tree**: The central manager (`useFloatingTree`). It maintains the overall structure and state of all floating elements in your application.
- **Node**: Each individual floating element (like a menu, popover, or tooltip) becomes a "node" in the tree. Each node holds its own state and context.
- **Hierarchy**: Nodes are organized with parent-child relationships. A submenu is a child of its parent menu; a dialog opened from a popover is a child of that popover.

## When Should I Use the Floating Tree?

The Floating Tree shines in scenarios where you have:

- **Nested Menus**: Like a "File" menu with "Export" and "Save As" submenus.
- **Popovers Opening Dialogs**: A popover that, when clicked, opens a modal dialog.
- **Tooltips Triggering Other Elements**: A tooltip that contains interactive elements which themselves open new floating UI.
- **Complex Context Menus**: Context menus with multiple levels of nested options.
- **Any UI Where Elements Logically Parent Other Elements**.

## Next Steps

Ready to harness the power of the Floating Tree?

- **Ready to start building?** → [Go to the Getting Started Guide](./getting-started.md)
- **Want to see advanced examples?** → [Explore our Cookbook](./cookbook.md)
- **Looking for technical details?** → [Jump to the API Reference](./api-reference.md)
