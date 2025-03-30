import { mergeProps } from "vue"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Shared interface for prop getter functions
 */
export type PropGetter<T extends Record<string, any> = Record<string, any>> = (
  props?: T
) => Record<string, any>

/**
 * Interface for interaction props returned by interaction composables
 */
export interface Interaction {
  /**
   * A function that returns merged props for the reference element
   */
  getReferenceProps?: PropGetter

  /**
   * A function that returns merged props for the floating element
   */
  getFloatingProps?: PropGetter

  /**
   * A function that returns merged props for list items
   */
  getItemProps?: PropGetter
}

/**
 * Return value of the useInteractions composable
 */
export interface UseInteractionsReturn extends Required<Interaction> {}

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================

/**
 * Merges the props from multiple interaction composables
 *
 * This composable combines the props from various interaction composables
 * (like useClick, useHover, etc.) into a single set of getters for reference
 * and floating elements.
 *
 * @param interactions - Array of interaction props returned from composables
 * @returns Combined props for reference, floating, and item elements
 *
 * @example
 * ```ts
 * const interactions = useInteractions([
 *   useClick({ open, onOpenChange }),
 *   useHover({ open, onOpenChange }),
 *   useRole({ open })
 * ])
 * ```
 */
export function useInteractions(interactions: Interaction[]): UseInteractionsReturn {
  const initialInteractions: UseInteractionsReturn = {
    getReferenceProps: (props = {}) => props,
    getFloatingProps: (props = {}) => props,
    getItemProps: (props = {}) => props,
  }

  return interactions.reduce<UseInteractionsReturn>((acc, curr) => {
    const mergedGetReferenceProps = (props = {}) =>
      mergeProps(acc.getReferenceProps(props), curr.getReferenceProps?.(props) ?? {})

    const mergedGetFloatingProps = (props = {}) =>
      mergeProps(acc.getFloatingProps(props), curr.getFloatingProps?.(props) ?? {})

    const mergedGetItemProps = (props = {}) =>
      mergeProps(acc.getItemProps(props), curr.getItemProps?.(props) ?? {})

    return {
      getReferenceProps: mergedGetReferenceProps,
      getFloatingProps: mergedGetFloatingProps,
      getItemProps: mergedGetItemProps,
    }
  }, initialInteractions)
}
