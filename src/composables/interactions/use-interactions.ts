import type { AnyFn } from "@/types";
import { useMergeRefs } from "./use-merge-refs";
import { isFunction } from "@/utils";

/**
 * Shared interface for prop getter functions
 */
export type PropGetter<T extends Record<string, any> = Record<string, any>> = (
  props?: T
) => Record<string, any>;

export interface UseInteractionsReturn {
  /**
   * A function that returns merged props for the reference element
   */
  getReferenceProps: PropGetter;

  /**
   * A function that returns merged props for the floating element
   */
  getFloatingProps: PropGetter;

  /**
   * A function that returns merged props for list items
   */
  getItemProps: PropGetter;
}

/**
 * Merges the props from multiple interaction composables
 * @param interactionProps - Array of interaction props returned from composables
 * @returns Combined props
 */
/**
 * Interface for interaction props
 */
export interface InteractionProps {
  getReferenceProps?: PropGetter;
  getFloatingProps?: PropGetter;
  getItemProps?: PropGetter<Record<string, any>>;
}

/**
 * Merges the props from multiple interaction composables
 * @param interactionProps - Array of interaction props returned from composables
 * @returns Combined props
 */
export function useInteractions(
  interactionProps: Array<InteractionProps | null | undefined>
): UseInteractionsReturn {
  // Filter out null or undefined interaction props
  const validInteractionProps = interactionProps.filter(
    (props): props is NonNullable<typeof props> => Boolean(props)
  );

  /**
   * Creates a merged prop getter function
   * @param propType - The type of prop getter to create ('reference', 'floating', or 'item')
   * @returns A prop getter function
   */
  const createPropGetter = (propType: "reference" | "floating" | "item"): PropGetter => {
    return (userProps = {}) => {
      const mergedProps = { ...userProps };

      // Get the appropriate prop getters based on the type
      const propGetters = validInteractionProps
        .map((interaction) => {
          if (propType === "reference") return interaction.getReferenceProps;
          if (propType === "floating") return interaction.getFloatingProps;
          return interaction.getItemProps;
        })
        .filter(Boolean) as Array<PropGetter>;

      if (propGetters.length === 0) {
        return mergedProps;
      }

      // Get all props by calling each getter
      const allProps = propGetters.map((getter) => getter(userProps));

      // Merge all props
      for (const props of allProps) {
        Object.assign(mergedProps, props);
      }

      // Special handling for event handlers (merge them)
      const eventHandlerKeys = allProps
        .flatMap((props) => Object.keys(props))
        .filter((key) => key.startsWith("on"))
        .filter((eventKey) => allProps.some((props) => isFunction(props[eventKey])));
      // Create merged event handlers
      for (const eventKey of eventHandlerKeys) {
        const handlers = allProps.map((props) => props[eventKey]).filter(isFunction);

        if (handlers.length > 1) {
          mergedProps[eventKey] = (event: any) => {
            for (const handler of handlers) {
              handler(event);
            }
          };
        } else if (handlers.length === 1) {
          mergedProps[eventKey] = handlers[0];
        }
      }

      // Handle refs separately
      const refs = allProps.map((props) => props.ref).filter(Boolean);

      if (refs.length > 0) {
        mergedProps.ref = useMergeRefs(...refs, userProps.ref);
      }

      return mergedProps;
    };
  };

  // Return merged interaction props
  return {
    getReferenceProps: createPropGetter("reference"),
    getFloatingProps: createPropGetter("floating"),
    getItemProps: createPropGetter("item"),
  };
}
