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

    const traverse = (itemList: T[], parentVal: string | null, depth: number) => {
      for (const item of itemList) {
        const val = getItemId(item);
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
            traverse(children, val, depth + 1);
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

  getFlattenedItems(expandedValues: Set<string>): T[] {
    const result: T[] = [];
    const { getItemId, getItemChildren } = this.options;

    const traverse = (itemList: T[]) => {
      for (const item of itemList) {
        result.push(item);
        const val = getItemId(item);
        if (expandedValues.has(val)) {
          const children = getItemChildren?.(item);
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
    if (!item || !this.options.getItemChildren) return null;
    return this.findFirstEnabledDescendant(item);
  }

  private findFirstEnabledDescendant(item: T): string | null {
    const { getItemId, getItemChildren } = this.options;
    const children = getItemChildren?.(item);
    if (!children || children.length === 0) return null;

    for (const child of children) {
      const childVal = getItemId(child);
      if (!this.disabledValues.has(childVal)) {
        return childVal;
      }
      const descendant = this.findFirstEnabledDescendant(child);
      if (descendant !== null) {
        return descendant;
      }
    }
    return null;
  }
}
