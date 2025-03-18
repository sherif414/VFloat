import {
  MaybeRefOrGetter,
  Ref,
  computed,
  nextTick,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue";
import type { UseFloatingReturn } from "../use-floating";

export interface UseTransitionOptions {
  /**
   * Whether transitions are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * The duration of the transition in ms
   * @default 250
   */
  duration?: MaybeRefOrGetter<number | { open: number; close: number }>;

  /**
   * The CSS transition-timing-function
   * @default 'ease'
   */
  easing?: MaybeRefOrGetter<string | { open: string; close: string }>;

  /**
   * Function to call when the transition starts
   */
  onStart?: (state: "open" | "close") => void;

  /**
   * Function to call when the transition ends
   */
  onComplete?: (state: "open" | "close") => void;
}

/**
 * Types of transition states
 */
export type TransitionStatus = "unmounted" | "initial" | "open" | "close";

/**
 * Return type for useTransitionStatus
 */
export interface UseTransitionStatusReturn {
  /**
   * Current status of the transition
   */
  status: Ref<TransitionStatus>;

  /**
   * Whether the element is currently mounted in the DOM
   */
  isMounted: Ref<boolean>;
}

/**
 * Return type for useTransitionStyles
 */
export interface UseTransitionStylesReturn {
  /**
   * Whether the element is currently mounted in the DOM
   */
  isMounted: Ref<boolean>;

  /**
   * CSS styles for the transition
   */
  styles: Ref<{
    opacity?: string;
    transform?: string;
    transition?: string;
  }>;
}

/**
 * Default CSS transition styles for each status
 */
const defaultTransitionStyles = {
  unmounted: {},
  initial: { opacity: "0", transform: "scale(0.95)" },
  open: { opacity: "1", transform: "scale(1)" },
  close: { opacity: "0", transform: "scale(0.95)" },
};

/**
 * Provides the current transition status
 */
export function useTransitionStatus(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
  },
  options: UseTransitionOptions = {}
): UseTransitionStatusReturn {
  const { open } = context;
  const { enabled = true, duration = 250 } = options;

  const isEnabled = computed(() => toValue(enabled));
  const status = ref<TransitionStatus>("unmounted");
  const isMounted = ref(false);

  // Get the duration value based on the state
  const getDuration = (state: "open" | "close") => {
    const durationValue = toValue(duration);

    if (typeof durationValue === "number") {
      return durationValue;
    }

    return durationValue[state];
  };

  // Clear any timeouts on unmount
  let timeoutId: number | null = null;
  onScopeDispose(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  });

  // Watch for open state changes
  watch(
    open,
    (isOpen) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!isEnabled.value) {
        status.value = isOpen ? "open" : "unmounted";
        isMounted.value = isOpen;
        return;
      }

      if (isOpen) {
        status.value = "initial";
        isMounted.value = true;

        // Set the status to open immediately
        nextTick(() => {
          status.value = "open";
        });
      } else {
        status.value = "close";

        // Unmount after close animation
        timeoutId = window.setTimeout(() => {
          status.value = "unmounted";
          isMounted.value = false;
        }, getDuration("close"));
      }
    },
    { immediate: true }
  );

  return { status, isMounted };
}

/**
 * Provides styles for transitions
 */
export function useTransitionStyles(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
  },
  options: UseTransitionOptions = {}
): UseTransitionStylesReturn {
  const { open } = context;

  const {
    enabled = true,
    duration = 250,
    easing = "ease",
    onStart,
    onComplete,
  } = options;

  const isEnabled = computed(() => toValue(enabled));
  const styles = ref<{
    opacity?: string;
    transform?: string;
    transition?: string;
  }>({});
  const isMounted = ref(false);
  const currentState = ref<"open" | "close">("close");

  // Get transition property based on state
  const getTransitionProperty = (state: "open" | "close") => {
    const durationValue = toValue(duration);
    const easingValue = toValue(easing);

    // Get duration value
    const durationMs =
      typeof durationValue === "number" ? durationValue : durationValue[state];

    // Get easing value
    const easingFunction =
      typeof easingValue === "string" ? easingValue : easingValue[state];

    return `all ${durationMs}ms ${easingFunction}`;
  };

  // Clear any timeouts on unmount
  let timeoutId: number | null = null;
  onScopeDispose(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  });

  // Function to set styles
  const setStyles = (state: TransitionStatus) => {
    if (!isEnabled.value) {
      styles.value =
        state === "open"
          ? defaultTransitionStyles.open
          : state === "close"
          ? defaultTransitionStyles.close
          : {};
      return;
    }

    const transitionStyles = {
      ...defaultTransitionStyles[state],
      transition:
        state === "initial"
          ? "none"
          : getTransitionProperty(state === "open" ? "open" : "close"),
    };

    styles.value = transitionStyles;
  };

  // Watch for open state changes
  watch(
    open,
    (isOpen) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      currentState.value = isOpen ? "open" : "close";

      if (isOpen) {
        // Opening transition
        if (onStart) onStart("open");
        setStyles("initial");
        isMounted.value = true;

        // Next frame to allow mounting to complete first
        nextTick(() => {
          setStyles("open");

          // Calculate completion time
          const openDuration =
            typeof toValue(duration) === "number"
              ? toValue(duration)
              : toValue(duration).open;

          timeoutId = window.setTimeout(() => {
            if (onComplete) onComplete("open");
          }, openDuration);
        });
      } else {
        // Closing transition
        if (onStart) onStart("close");
        setStyles("close");

        // Calculate completion time
        const closeDuration =
          typeof toValue(duration) === "number"
            ? toValue(duration)
            : toValue(duration).close;

        timeoutId = window.setTimeout(() => {
          if (onComplete) onComplete("close");
          isMounted.value = false;
        }, closeDuration);
      }
    },
    { immediate: true }
  );

  return { isMounted, styles };
}
