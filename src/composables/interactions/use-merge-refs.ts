import { type Ref, type UnwrapRef, isRef, ref } from "vue";

type PossibleRef<T> = Ref<T> | ((el: T) => void) | null | undefined;

/**
 * Merges multiple refs into a single ref function
 * @param refs Array of refs to merge
 * @returns A merged ref function that can be used as a ref
 */
export function useMergeRefs<T>(refs: PossibleRef<T>[]): (instance: T) => void {
  return (instance: T) => {
    for (const ref of refs) {
      if (ref === null || ref === undefined) return;

      if (typeof ref === "function") {
        ref(instance);
      } else if (isRef(ref)) {
        (ref as Ref<UnwrapRef<T>>).value = instance as UnwrapRef<T>;
      }
    }
  };
}

/**
 * Creates a ref that can be merged with other refs
 * @returns A tuple containing a ref and a function to set its value
 */
export function createCallbackRef<T>(): [Ref<T | null>, (node: T | null) => void] {
  const refValue = ref<T | null>(null) as Ref<T | null>;

  const setRef = (node: T | null) => {
    refValue.value = node;
  };

  return [refValue, setRef];
}
