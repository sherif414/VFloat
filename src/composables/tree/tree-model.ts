export interface TreeModelOptions<T> {
  getItemId: (item: T) => string;
  isItemDisabled?: (item: T) => boolean;
  getItemChildren?: (item: T) => T[] | null | undefined;
}

/**
 * A standard, framework-agnostic data model for hierarchical trees.
 * Computes all O(1) index maps in a single predictable traversal pass.
 */
export class TreeModel<T> {
  public readonly itemMap = new Map<string, T>();
  public readonly parentMap = new Map<string, string>();
  public readonly childrenItemsMap = new Map<string | null, T[]>();
  public readonly branchParents = new Set<string>();
  public readonly depthMap = new Map<string, number>();
  public readonly disabledValues = new Set<string>();

  constructor(
    items: T[],
    private readonly options: TreeModelOptions<T>,
  ) {
    const { getItemId, isItemDisabled: isItemDisabledOpt, getItemChildren } = options;
    this.childrenItemsMap.set(null, items);

    const visitedIds = new Set<string>();

    const traverse = (itemList: T[], parentVal: string | null, depth: number) => {
      for (const item of itemList) {
        const val = getItemId(item);

        // 1. Cycle detection (active ancestor in path)
        if (visitedIds.has(val)) {
          throw new Error(`[VFloat] Cyclic tree dependency detected at item: "${val}"`);
        }

        // 2. Duplicate ID check (non-ancestor duplicate in tree)
        if (this.itemMap.has(val)) {
          throw new Error(`[VFloat] Duplicate item ID detected: "${val}"`);
        }

        this.itemMap.set(val, item);
        this.depthMap.set(val, depth);
        if (parentVal !== null) {
          this.parentMap.set(val, parentVal);
        }
        if (isItemDisabledOpt?.(item)) {
          this.disabledValues.add(val);
        }

        if (getItemChildren) {
          const children = getItemChildren(item);
          if (children && children.length > 0) {
            this.branchParents.add(val);
            this.childrenItemsMap.set(val, children);
            visitedIds.add(val);
            traverse(children, val, depth + 1);
            visitedIds.delete(val);
          }
        }
      }
    };

    traverse(items, null, 0);
  }

  getItem(value: string): T | null {
    return this.itemMap.get(value) ?? null;
  }

  getParentValue(value: string): string | null {
    return this.parentMap.get(value) ?? null;
  }

  getDepth(value: string): number {
    return this.depthMap.get(value) ?? -1;
  }

  hasChildren(value: string): boolean {
    return this.branchParents.has(value);
  }

  isItemDisabled(value: string): boolean {
    return this.disabledValues.has(value);
  }

  getFlattenedItems(expandedValues: Set<string> | ReadonlySet<string>): T[] {
    const result: T[] = [];
    const getItemId = this.options.getItemId;

    const traverse = (itemList: T[]) => {
      for (const item of itemList) {
        result.push(item);
        const val = getItemId(item);
        if (expandedValues.has(val)) {
          const children = this.childrenItemsMap.get(val);
          if (children && children.length > 0) {
            traverse(children);
          }
        }
      }
    };

    const rootItems = this.childrenItemsMap.get(null) ?? [];
    traverse(rootItems);
    return result;
  }

  getAncestorValues(value: string): string[] {
    const ancestors: string[] = [];
    let current = this.parentMap.get(value);
    while (current !== undefined) {
      ancestors.push(current);
      current = this.parentMap.get(current);
    }
    return ancestors;
  }

  getSiblingValues(value: string): string[] {
    const parentVal = this.parentMap.get(value) ?? null;
    const siblings = this.childrenItemsMap.get(parentVal) ?? [];
    const getItemId = this.options.getItemId;
    return siblings.map((item) => getItemId(item)).filter((v) => v !== value);
  }

  getFirstEnabledDescendantValue(value: string): string | null {
    const item = this.itemMap.get(value);
    if (!item) return null;
    return this.findFirstEnabledDescendant(value);
  }

  private findFirstEnabledDescendant(value: string): string | null {
    const children = this.childrenItemsMap.get(value);
    if (!children || children.length === 0) return null;

    for (const child of children) {
      const childVal = this.options.getItemId(child);
      if (!this.disabledValues.has(childVal)) {
        return childVal;
      }
      const descendant = this.findFirstEnabledDescendant(childVal);
      if (descendant !== null) {
        return descendant;
      }
    }
    return null;
  }
}
