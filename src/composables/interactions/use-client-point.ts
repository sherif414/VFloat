import { type MaybeRefOrGetter, type Ref, computed, onScopeDispose, toValue } from "vue"
import type { FloatingContext } from "../use-floating"
import { useEventListener } from "@vueuse/core"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Positions the floating element at a specified client point (mouse/touch position)
 *
 * This composable allows positioning a floating element at the cursor position,
 * useful for context menus, tooltips that follow the cursor, and other pointer-based UIs.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for client point positioning
 * @returns Event handler props for the reference element
 *
 * @example
 * ```ts
 * const { getReferenceProps } = useClientPoint(context, {
 *   enabled: true,
 *   axis: "x",
 * })
 * ```
 */
export function useClientPoint(
  context: FloatingContext,
  options: UseClientPointOptions = {}
): UseClientPointReturn {
  const { open, onOpenChange, refs } = context

  const { enabled = true, axis = null, x: externalX, y: externalY } = options

  const isEnabled = computed(() => toValue(enabled))

  // Function to update the virtual reference position
  const setReference = (x: number, y: number) => {
    if (!refs.reference.value) return

    // Create a virtual reference element
    const virtualReference = refs.reference.value as any

    if (virtualReference.getBoundingClientRect) {
      const rect = virtualReference.getBoundingClientRect()

      const newX = toValue(axis) === "y" ? rect.x : x
      const newY = toValue(axis) === "x" ? rect.y : y

      virtualReference.getBoundingClientRect = () => ({
        ...rect,
        x: newX,
        y: newY,
        top: newY,
        right: newX,
        bottom: newY,
        left: newX,
      })
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
      })
    }
  }

  // Update position from external coordinates
  if (externalX !== undefined && externalY !== undefined) {
    const x = toValue(externalX)
    const y = toValue(externalY)

    if (x !== null && y !== null) {
      setReference(x, y)
    }
  }

  // Handle pointer move for tracking
  const handlePointerMove = (event: PointerEvent) => {
    if (!isEnabled.value) return

    setReference(event.clientX, event.clientY)
  }

  // Handle pointer down for showing the floating element
  const handlePointerDown = (event: PointerEvent) => {
    if (!isEnabled.value) return

    setReference(event.clientX, event.clientY)
    onOpenChange(true)
  }

  // Handle click for showing the floating element
  const handleClick = (event: MouseEvent) => {
    if (!isEnabled.value) return

    setReference(event.clientX, event.clientY)
    onOpenChange(!open.value)
  }

  useEventListener("pointermove", handlePointerMove)
  useEventListener("pointerdown", handlePointerDown)
  useEventListener("click", handleClick)

  return {
    setReference,
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring client point positioning
 */
export interface UseClientPointOptions {
  /**
   * Whether client point positioning is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The axis to position along
   * @default null (both axes)
   */
  axis?: MaybeRefOrGetter<"x" | "y" | null>

  /**
   * Initial or controlled x-coordinate
   */
  x?: MaybeRefOrGetter<number | null>

  /**
   * Initial or controlled y-coordinate
   */
  y?: MaybeRefOrGetter<number | null>
}

/**
 * Return value of the useClientPoint composable
 */
export interface UseClientPointReturn {
  /**
   * Function to manually set the reference point coordinates for positioning the floating element
   * @param x - The x-coordinate to set
   * @param y - The y-coordinate to set
   */
  setReference: (x: number, y: number) => void
}
