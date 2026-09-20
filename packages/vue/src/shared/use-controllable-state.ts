import { computed, type Ref, ref, type WritableComputedRef } from "vue";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a controllable state value backed by an external ref when provided, otherwise
 * by an internal ref seeded with the initial value.
 *
 * The returned `value` supports reads and writes. When an external value is provided,
 * the external source owns the value and is expected to apply changes through
 * `onChange`.
 *
 * @param options - Configuration for the controllable state.
 *
 * @example Controlled by a parent value
 * ```ts
 * const value = useControllableState({
 *   value: toRef(props, "open"),
 *   initialValue: false,
 *   onChange: (open) => props.onOpenChange(open),
 * });
 * ```
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): UseControllableStateReturn<T> {
  const { value: valueOption, initialValue, onChange } = options;
  const isControlled = valueOption !== undefined;

  const internalValue = ref(initialValue);
  const value: WritableComputedRef<T> = computed({
    get: () => (isControlled ? valueOption.value : internalValue.value),
    set: (nextValue) => {
      if (nextValue === value.value) return;

      if (!isControlled) {
        internalValue.value = nextValue;
      } else if (import.meta.env.DEV && !onChange) {
        // A controlled value cannot be written to; without an `onChange` handler
        // the write would be silently dropped, so surface it during development.
        console.warn(
          "[useControllableState] Cannot update controlled state without an `onChange` handler.",
        );
      }

      onChange?.(nextValue);
    },
  });

  return value;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for creating a controllable state.
 *
 * - When `value` is provided (controlled mode), `initialValue` is optional.
 * - When `value` is omitted (uncontrolled mode), `initialValue` is required to seed internal state.
 */
export type UseControllableStateOptions<T> =
  | {
      /**
       * Controlled external value ref.
       */
      value: Readonly<Ref<T>>;

      /**
       * Optional seed value (ignored when controlled).
       */
      initialValue?: T;

      /**
       * Callback invoked when a write through the returned ref occurs.
       */
      onChange?: (value: T) => void;
    }
  | {
      /**
       * Uncontrolled mode has no external ref.
       */
      value?: undefined;

      /**
       * Required seed value for the internal state when uncontrolled.
       */
      initialValue: T;

      /**
       * Callback invoked when the internal state updates.
       */
      onChange?: (value: T) => void;
    };

/**
 * Return value of `useControllableState`.
 */
/**
 * The controllable state value. Assignments update internal state when uncontrolled and
 * are reported through `onChange` when controlled.
 */
export type UseControllableStateReturn<T> = WritableComputedRef<T>;
