/** Per-document stack operations shared by interaction managers. */
interface StackManager<TEntry, TManager extends { stack: TEntry[] }> {
  /** Adds an entry at the top of its document stack and synchronizes listeners. */
  push(doc: Document, entry: TEntry): void;
  /** Removes an entry and releases the manager when its stack becomes empty. */
  remove(doc: Document, entry: TEntry): void;
  /** Synchronizes listeners without changing stack order. */
  resync(doc: Document): void;
  /** Returns the existing manager for a document, if one exists. */
  get(doc: Document): TManager | undefined;
}

/**
 * Creates an isolated WeakMap-backed stack manager for one stack policy.
 * @param createManager - Creates the initial per-document manager state.
 * @param onSync - Synchronizes listeners after any stack change.
 */
export function createStackManager<TEntry, TManager extends { stack: TEntry[] }>(
  createManager: () => TManager,
  onSync: (doc: Document, manager: TManager) => void,
): StackManager<TEntry, TManager> {
  const managers = new WeakMap<Document, TManager>();

  return {
    push(doc, entry) {
      let manager = managers.get(doc);
      if (!manager) {
        manager = createManager();
        managers.set(doc, manager);
      }
      const existing = manager.stack.indexOf(entry);
      if (existing !== -1) manager.stack.splice(existing, 1);
      manager.stack.push(entry);
      onSync(doc, manager);
    },
    remove(doc, entry) {
      const manager = managers.get(doc);
      if (!manager) return;
      const index = manager.stack.indexOf(entry);
      if (index !== -1) manager.stack.splice(index, 1);
      onSync(doc, manager);
      if (manager.stack.length === 0) managers.delete(doc);
    },
    // Unlike push, resync preserves LIFO order for reactive listener options.
    resync(doc) {
      const manager = managers.get(doc);
      if (manager) onSync(doc, manager);
    },
    get(doc) {
      return managers.get(doc);
    },
  };
}
