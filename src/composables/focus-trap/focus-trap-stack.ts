//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A registered modal trap. Only what the stack needs to route Tab/focus to the
 * newest modal; everything else stays private to `useFocusTrap`.
 */
export interface FocusTrapEntry {
  id: symbol;
  getFamilyElements: () => HTMLElement[];
}

/**
 * Per-document stack of active modal traps. The last entry owns document-level
 * Tab wrapping so overlapping modals never fight for the same keydown.
 */
const documentTrapStacks = new WeakMap<Document, FocusTrapEntry[]>();

function getTrapStack(doc: Document): FocusTrapEntry[] {
  let stack = documentTrapStacks.get(doc);
  if (!stack) {
    stack = [];
    documentTrapStacks.set(doc, stack);
  }
  return stack;
}

/**
 * Pushes a modal trap onto its document stack, moving it to the top if it was
 * already registered.
 */
export function pushTrapEntry(doc: Document, entry: FocusTrapEntry): void {
  const stack = getTrapStack(doc);
  const existing = stack.indexOf(entry);
  if (existing !== -1) {
    stack.splice(existing, 1);
  }
  stack.push(entry);
}

/**
 * Removes a modal trap from its document stack.
 */
export function removeTrapEntry(doc: Document, entry: FocusTrapEntry): void {
  const stack = documentTrapStacks.get(doc);
  if (!stack) return;
  const index = stack.indexOf(entry);
  if (index !== -1) {
    stack.splice(index, 1);
  }
  if (stack.length === 0) {
    documentTrapStacks.delete(doc);
  }
}

/**
 * Returns true when the entry is the topmost active modal trap for its document.
 * Lower traps keep DOM isolation but yield Tab/focus routing to the newest modal.
 */
export function isTopModalTrap(doc: Document, entry: FocusTrapEntry): boolean {
  const stack = documentTrapStacks.get(doc);
  if (!stack || stack.length === 0) return true;
  return stack[stack.length - 1] === entry;
}
