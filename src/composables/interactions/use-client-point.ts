import { type MaybeRefOrGetter, type Ref, computed, onScopeDispose, toValue } from "vue";
import type { UseFloatingReturn } from "../use-floating";

export interface UseClientPointOptions {
  /**
   * Whether client point positioning is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * The axis to position along
   * @default null (both axes)
   */
  axis?: MaybeRefOrGetter<"x" | "y" | null>;

  /**
   * Initial or controlled x-coordinate
   */
  x?: MaybeRefOrGetter<number | null>;

  /**
   * Initial or controlled y-coordinate
   */
  y?: MaybeRefOrGetter<number | null>;
}

export interface UseClientPointReturn {
  /**
   * Reference element props for client point positioning
   */
  getReferenceProps: () => {
    onPointerMove?: (event: PointerEvent) => void;
    onPointerDown?: (event: PointerEvent) => void;
    onClick?: (event: MouseEvent) => void;
  };
}

/**
 * Positions the floating element at a specified client point (mouse/touch position)
 */
export function useClientPoint(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const {
    open,
    onOpenChange,
    refs,
    elements: { floating, reference },
  } = context;

  const { enabled = true, axis = null, x: externalX, y: externalY } = options;

  const isEnabled = computed(() => toValue(enabled));

  // Function to update the virtual reference position
  const setReference = (x: number, y: number) => {
    if (!refs.reference.value) return;

    // Create a virtual reference element
    const virtualReference = refs.reference.value as any;

    if (virtualReference.getBoundingClientRect) {
      const rect = virtualReference.getBoundingClientRect();

      const newX = toValue(axis) === "y" ? rect.x : x;
      const newY = toValue(axis) === "x" ? rect.y : y;

      virtualReference.getBoundingClientRect = () => ({
        ...rect,
        x: newX,
        y: newY,
        top: newY,
        right: newX,
        bottom: newY,
        left: newX,
      });
    } else {
      virtualReference.getBoundingClientRect = () => ({
        x,
        y,
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
      });
    }
  };

  // Update position from external coordinates
  if (externalX !== undefined && externalY !== undefined) {
    const x = toValue(externalX);
    const y = toValue(externalY);

    if (x !== null && y !== null) {
      setReference(x, y);
    }
  }

  // Handle pointer move for tracking
  const handlePointerMove = (event: PointerEvent) => {
    if (!isEnabled.value) return;

    setReference(event.clientX, event.clientY);
  };

  // Handle pointer down for showing the floating element
  const handlePointerDown = (event: PointerEvent) => {
    if (!isEnabled.value) return;

    setReference(event.clientX, event.clientY);
    onOpenChange(true);
  };

  // Handle click for showing the floating element
  const handleClick = (event: MouseEvent) => {
    if (!isEnabled.value) return;

    setReference(event.clientX, event.clientY);
    onOpenChange(!open.value);
  };

  return {
    getReferenceProps: () => ({
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onClick: handleClick,
    }),
  };
}
