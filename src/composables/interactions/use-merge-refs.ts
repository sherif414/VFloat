import { type Ref, type UnwrapRef, isRef, ref } from "vue"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Merges multiple refs into a single ref function
 *
 * This utility allows combining multiple refs (template refs, callback refs, etc.)
 * into a single ref function that updates all provided refs.
 *
 * @param refs - Array of refs to merge
 * @returns A merged ref function that can be used as a ref
 *
 * @example
 * ```ts
 * const localRef = ref(null)
 * const mergedRef = useMergeRefs([localRef, props.externalRef])
 * ```
 */
export function useMergeRefs<T>(refs: PossibleRef<T>[]): (instance: T) => void {
  return (instance: T) => {
    for (const ref of refs) {
      if (ref === null || ref === undefined) return

      if (typeof ref === "function") {
        ref(instance)
      } else if (isRef(ref)) {
        ;(ref as Ref<UnwrapRef<T>>).value = instance as UnwrapRef<T>
      }
    }
  }
}

/**
 * Creates a ref that can be merged with other refs
 *
 * Returns a tuple containing a ref and a function to set its value,
 * useful for cases where you need both a reactive ref and a callback setter.
 *
 * @returns A tuple containing a ref and a function to set its value
 *
 * @example
 * ```ts
 * const [nodeRef, setNodeRef] = createCallbackRef()
 * ```
 */
export function createCallbackRef<T>(): [Ref<T | null>, (node: T | null) => void] {
  const refValue = ref<T | null>(null) as Ref<T | null>

  const setRef = (node: T | null) => {
    refValue.value = node
  }

  return [refValue, setRef]
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Type representing possible ref values that can be merged
 */
type PossibleRef<T> = Ref<T> | ((el: T) => void) | null | undefined
