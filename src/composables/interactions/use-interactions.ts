import { useMergeRefs } from "./use-merge-refs";

export interface UseInteractionsReturn {
  /**
   * A function that returns merged props for the reference element
   */
  getReferenceProps: (additionalProps?: Record<string, any>) => Record<string, any>;

  /**
   * A function that returns merged props for the floating element
   */
  getFloatingProps: (additionalProps?: Record<string, any>) => Record<string, any>;

  /**
   * A function that returns merged props for list items
   */
  getItemProps: (props: Record<string, any>) => Record<string, any>;
}

/**
 * Merges the props from multiple interaction composables
 * @param interactionProps - Array of interaction props returned from composables
 * @returns Combined props
 */
export function useInteractions(
  interactionProps: Array<
    | {
        getReferenceProps?: () => Record<string, any>;
        getFloatingProps?: () => Record<string, any>;
        getItemProps?: (props: Record<string, any>) => Record<string, any>;
      }
    | null
    | undefined
  >
): UseInteractionsReturn {
  // Filter out null or undefined interaction props
  const validInteractionProps = interactionProps.filter(
    (props): props is NonNullable<typeof props> => Boolean(props)
  );

  // Return merged interaction props
  return {
    getReferenceProps: (additionalProps = {}) => {
      const mergedProps = { ...additionalProps };
      const propGetters = validInteractionProps
        .map((interaction) => interaction.getReferenceProps)
        .filter(Boolean) as Array<() => Record<string, any>>;

      const allProps = propGetters.map((getter) => getter());

      // Merge all props
      for (const props of allProps) {
        Object.assign(mergedProps, props);
      }

      // Special handling for event handlers (merge them)
      const eventHandlerKeys = allProps
        .flatMap((props) => Object.keys(props))
        .filter((key) => key.startsWith("on"))
        .filter((eventKey) => allProps.some((props) => typeof props[eventKey] === "function"));

      // Create merged event handlers
      for (const eventKey of eventHandlerKeys) {
        const handlers = allProps
          .map((props) => props[eventKey])
          .filter((handler): handler is Function => typeof handler === "function");

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
        mergedProps.ref = useMergeRefs(...refs, additionalProps.ref);
      }

      return mergedProps;
    },

    getFloatingProps: (additionalProps = {}) => {
      const mergedProps = { ...additionalProps };
      const propGetters = validInteractionProps
        .map((interaction) => interaction.getFloatingProps)
        .filter(Boolean) as Array<() => Record<string, any>>;

      const allProps = propGetters.map((getter) => getter());

      // Merge all props
      for (const props of allProps) {
        Object.assign(mergedProps, props);
      }

      // Special handling for event handlers (merge them)
      const eventHandlerKeys = allProps
        .flatMap((props) => Object.keys(props))
        .filter((key) => key.startsWith("on"))
        .filter((eventKey) => allProps.some((props) => typeof props[eventKey] === "function"));

      // Create merged event handlers
      for (const eventKey of eventHandlerKeys) {
        const handlers = allProps
          .map((props) => props[eventKey])
          .filter((handler): handler is Function => typeof handler === "function");

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
        mergedProps.ref = useMergeRefs(...refs, additionalProps.ref);
      }

      return mergedProps;
    },

    getItemProps: (userProps) => {
      const mergedProps = { ...userProps };
      const propGetters = validInteractionProps
        .map((interaction) => interaction.getItemProps)
        .filter(Boolean) as Array<(props: Record<string, any>) => Record<string, any>>;

      if (propGetters.length === 0) {
        return mergedProps;
      }

      const allProps = propGetters.map((getter) => getter(userProps));

      // Merge all props
      for (const props of allProps) {
        Object.assign(mergedProps, props);
      }

      // Special handling for event handlers (merge them)
      const eventHandlerKeys = allProps
        .flatMap((props) => Object.keys(props))
        .filter((key) => key.startsWith("on"))
        .filter((eventKey) => allProps.some((props) => typeof props[eventKey] === "function"));

      // Create merged event handlers
      for (const eventKey of eventHandlerKeys) {
        const handlers = allProps
          .map((props) => props[eventKey])
          .filter((handler): handler is Function => typeof handler === "function");

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
    },
  };
}
