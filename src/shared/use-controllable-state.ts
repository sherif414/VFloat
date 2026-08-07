import { computed, ref, type Ref, type WritableComputedRef } from "vue";

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

  const internalValue = ref<T>(initialValue);
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
 */
export interface UseControllableStateOptions<T> {
  /**
   * Optional external value. When provided, the value is controlled externally and
   * writes made through the returned ref are reported through `onChange`.
   */
  value?: Readonly<Ref<T>>;

  /**
   * Seed value for the internal state used when no external value is provided.
   */
  initialValue: T;

  /**
   * Invoked with the next value whenever a write through the returned ref would change the
   * current value. When `value` is provided, the external source is expected to apply
   * the change.
   */
  onChange?: (value: T) => void;
}

/**
 * Return value of `useControllableState`.
 */
/**
 * The controllable state value. Assignments update internal state when uncontrolled and
 * are reported through `onChange` when controlled.
 */
export type UseControllableStateReturn<T> = WritableComputedRef<T>;
