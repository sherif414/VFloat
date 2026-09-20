//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A registered modal trap entry. The stack routes document-level keydown and
 * focusin capture events to the topmost entry so only one shared listener per
 * event type exists per document, regardless of how many modal traps are stacked.
 */
export interface FocusTrapEntry {
  id: symbol;
  /** Called by the shared document keydown capture listener for modal Tab wrapping. */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Called by the shared document focusin capture listener for modal focus containment. */
  onFocusIn: (event: FocusEvent) => void;
}

interface DocumentTrapManager {
  stack: FocusTrapEntry[];
  keydownListener: ((event: KeyboardEvent) => void) | null;
  focusinListener: ((event: FocusEvent) => void) | null;
}

/**
 * Per-document managers. Each manager owns the stack of active modal traps and
 * the shared capture listeners that dispatch to the topmost entry.
 */
const documentManagers = new WeakMap<Document, DocumentTrapManager>();

function getManager(doc: Document): DocumentTrapManager {
  let manager = documentManagers.get(doc);
  if (!manager) {
    manager = {
      stack: [],
      keydownListener: null,
      focusinListener: null,
    };
    documentManagers.set(doc, manager);
  }
  return manager;
}

/**
 * Attaches or detaches shared document capture listeners based on whether the
 * stack has entries. One keydown and one focusin listener per document,
 * regardless of how many modal traps are stacked.
 */
function syncDocumentListeners(doc: Document, manager: DocumentTrapManager): void {
  const needsListeners = manager.stack.length > 0;

  if (needsListeners && !manager.keydownListener) {
    const listener = (event: KeyboardEvent) => {
      const top = manager.stack[manager.stack.length - 1];
      if (top) top.onKeyDown(event);
    };
    manager.keydownListener = listener;
    doc.addEventListener("keydown", listener, true);
  } else if (!needsListeners && manager.keydownListener) {
    doc.removeEventListener("keydown", manager.keydownListener, true);
    manager.keydownListener = null;
  }

  if (needsListeners && !manager.focusinListener) {
    const listener = (event: FocusEvent) => {
      const top = manager.stack[manager.stack.length - 1];
      if (top) top.onFocusIn(event);
    };
    manager.focusinListener = listener;
    doc.addEventListener("focusin", listener, true);
  } else if (!needsListeners && manager.focusinListener) {
    doc.removeEventListener("focusin", manager.focusinListener, true);
    manager.focusinListener = null;
  }
}

/**
 * Pushes a modal trap onto its document stack, moving it to the top if it was
 * already registered. Attaches shared document listeners when the first entry
 * is added.
 */
export function pushTrapEntry(doc: Document, entry: FocusTrapEntry): void {
  const manager = getManager(doc);
  const existing = manager.stack.indexOf(entry);
  if (existing !== -1) {
    manager.stack.splice(existing, 1);
  }
  manager.stack.push(entry);
  syncDocumentListeners(doc, manager);
}

/**
 * Removes a modal trap from its document stack. Detaches shared document
 * listeners when the last entry is removed.
 */
export function removeTrapEntry(doc: Document, entry: FocusTrapEntry): void {
  const manager = documentManagers.get(doc);
  if (!manager) return;
  const index = manager.stack.indexOf(entry);
  if (index !== -1) {
    manager.stack.splice(index, 1);
  }
  syncDocumentListeners(doc, manager);
  if (manager.stack.length === 0) {
    documentManagers.delete(doc);
  }
}

/**
 * Returns true when the entry is the topmost active modal trap for its document.
 * Lower traps keep DOM isolation but yield Tab/focus routing to the newest modal.
 */
export function isTopModalTrap(doc: Document, entry: FocusTrapEntry): boolean {
  const manager = documentManagers.get(doc);
  if (!manager || manager.stack.length === 0) return true;
  return manager.stack[manager.stack.length - 1] === entry;
}
