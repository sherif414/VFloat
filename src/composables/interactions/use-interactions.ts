import { mergeProps } from "vue";

/**
 * Shared interface for prop getter functions
 */
export type PropGetter<T extends Record<string, any> = Record<string, any>> = (
  props?: T
) => Record<string, any>;

export interface UseInteractionsReturn extends Required<Interaction> {}

/**
 * Merges the props from multiple interaction composables
 * @param interactionProps - Array of interaction props returned from composables
 * @returns Combined props
 */
/**
 * Interface for interaction props
 */
export interface Interaction {
  /**
   * A function that returns merged props for the reference element
   */
  getReferenceProps?: PropGetter;

  /**
   * A function that returns merged props for the floating element
   */
  getFloatingProps?: PropGetter;

  /**
   * A function that returns merged props for list items
   */
  getItemProps?: PropGetter;
}

/**
 * Merges the props from multiple interaction composables
 * @param interactions - Array of interaction props returned from composables
 * @returns Combined props
 */
export function useInteractions(interactions: Interaction[]): UseInteractionsReturn {
  const initialInteractions: UseInteractionsReturn = {
    getReferenceProps: (props = {}) => props,
    getFloatingProps: (props = {}) => props,
    getItemProps: (props = {}) => props,
  };

  return interactions.reduce<UseInteractionsReturn>((acc, curr) => {
    const mergedGetReferenceProps = (props = {}) =>
      mergeProps(acc.getReferenceProps(props), curr.getReferenceProps?.(props) ?? {});

    const mergedGetFloatingProps = (props = {}) =>
      mergeProps(acc.getFloatingProps(props), curr.getFloatingProps?.(props) ?? {});

    const mergedGetItemProps = (props = {}) =>
      mergeProps(acc.getItemProps(props), curr.getItemProps?.(props) ?? {});

    return {
      getReferenceProps: mergedGetReferenceProps,
      getFloatingProps: mergedGetFloatingProps,
      getItemProps: mergedGetItemProps,
    };
  }, initialInteractions);
}
