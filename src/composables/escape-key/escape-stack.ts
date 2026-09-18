import type { FloatingNode } from "@/composables/floating-node";
import { isNode } from "@/shared/dom";

export interface EscapeEntry {
  node: FloatingNode;
}

//=======================================================================================
// 📌 Main
//=======================================================================================

const documentStacks = new WeakMap<Document, EscapeEntry[]>();

/**
 * Retrieves or initializes the LIFO escape stack for a specific document.
 */
function getDocumentStack(doc: Document): EscapeEntry[] {
  let stack = documentStacks.get(doc);
  if (!stack) {
    stack = [];
    documentStacks.set(doc, stack);
  }
  return stack;
}

/**
 * Pushes an open, escape-enabled floating node onto the document's escape stack.
 */
export function pushEscapeEntry(doc: Document, entry: EscapeEntry): void {
  const stack = getDocumentStack(doc);
  const existingIdx = stack.indexOf(entry);
  if (existingIdx !== -1) {
    stack.splice(existingIdx, 1);
  }
  stack.push(entry);
}

/**
 * Removes a floating node from the document's escape stack.
 */
export function removeEscapeEntry(doc: Document, entry: EscapeEntry): void {
  const stack = documentStacks.get(doc);
  if (!stack) return;
  const idx = stack.indexOf(entry);
  if (idx !== -1) {
    stack.splice(idx, 1);
  }
}

/**
 * Resolves which floating node should handle the Escape key for a given event target.
 *
 * 1. If target is contained within a registered open hierarchy, resolves to that hierarchy's
 *    deepest open descendant.
 * 2. If target is outside all open hierarchies (e.g. document body or headless tests),
 *    resolves to the topmost open entry on the LIFO stack.
 */
export function resolveActiveEscapeEntry(
  doc: Document,
  target: EventTarget | null,
): FloatingNode | null {
  const stack = documentStacks.get(doc);
  if (!stack || stack.length === 0) return null;

  const targetNode = isNode(target) ? target : null;

  if (targetNode) {
    // Check from topmost (latest opened) entry downward to find target's hierarchy
    for (let i = stack.length - 1; i >= 0; i--) {
      const { node } = stack[i];
      let root = node;
      while (root.parent?.value) {
        root = root.parent.value;
      }

      if (typeof root.contains === "function" && root.contains(targetNode)) {
        const owner = findTargetOwner(root, targetNode);
        return findDeepestOpenDescendant(owner) ?? owner;
      }
    }
  }

  // Fallback when target is outside all known hierarchies (or document/body):
  // Resolve using the topmost open entry in the stack.
  for (let i = stack.length - 1; i >= 0; i--) {
    const candidate = stack[i].node;
    if (candidate.open.value) {
      let topRoot = candidate;
      while (topRoot.parent?.value) {
        topRoot = topRoot.parent.value;
      }
      return findDeepestOpenDescendant(topRoot) ?? candidate;
    }
  }

  return null;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function findDeepestOpenDescendant(root: FloatingNode): FloatingNode | null {
  if (!root.open.value) return null;

  let deepest: FloatingNode = root;
  let maxDepth = 0;

  if (typeof root.traverse === "function") {
    root.traverse((current, depth) => {
      if (!current.open.value) return "skip";
      if (depth >= maxDepth) {
        maxDepth = depth;
        deepest = current;
      }
    });
  }

  return deepest;
}

function findTargetOwner(current: FloatingNode, targetNode: Node): FloatingNode {
  if (current.children?.value) {
    for (const child of Array.from(current.children.value)) {
      if (child.open.value && typeof child.contains === "function" && child.contains(targetNode)) {
        return findTargetOwner(child, targetNode);
      }
    }
  }
  return current;
}
