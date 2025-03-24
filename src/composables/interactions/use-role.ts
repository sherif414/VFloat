import { type MaybeRefOrGetter, type Ref, computed, toValue } from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages the accessibility roles of floating elements
 *
 * This composable provides ARIA attributes and roles to ensure proper accessibility
 * for different types of floating elements like tooltips, dialogs, menus, etc.
 *
 * @param context - The floating context with open state
 * @param options - Configuration options for roles and accessibility attributes
 * @returns Props for reference and floating elements to enable proper accessibility
 *
 * @example
 * ```ts
 * const { getReferenceProps, getFloatingProps } = useRole({
 *   open: floating.open,
 *   role: 'dialog'
 * })
 * ```
 */
export function useRole(
  context: FloatingContext & {
    open: Ref<boolean>
  },
  options: UseRoleOptions = {}
): UseRoleReturn {
  const { open } = context

  const { enabled = true, role = "dialog" } = options

  const isEnabled = computed(() => toValue(enabled))

  // Generate unique ID for the floating element
  const floatingId = `floating-${generateId()}`

  return {
    getReferenceProps: () => {
      const roleValue = toValue(role)

      if (!isEnabled.value || !roleValue) {
        return {}
      }

      const referenceProps: Record<string, any> = {}

      if (roleValue === "tooltip" || roleValue === "dialog" || roleValue === "alertdialog") {
        referenceProps["aria-describedby"] = open.value ? floatingId : undefined
      } else {
        referenceProps["aria-controls"] = open.value ? floatingId : undefined
        referenceProps["aria-expanded"] = open.value
      }

      if (roleValue !== "tooltip") {
        if (
          roleValue === "listbox" ||
          roleValue === "menu" ||
          roleValue === "grid" ||
          roleValue === "tree"
        ) {
          referenceProps["aria-haspopup"] = roleValue
        } else if (roleValue === "dialog" || roleValue === "alertdialog") {
          referenceProps["aria-haspopup"] = "dialog"
        }
      }

      return referenceProps
    },

    getFloatingProps: () => {
      const roleValue = toValue(role)

      if (!isEnabled.value || !roleValue) {
        return {}
      }

      return {
        id: floatingId,
        role: roleValue,
      }
    },

    getItemProps: ({ index, role = "option" }) => {
      const itemRole = toValue(role)

      return {
        role: itemRole,
        ...(index != null ? { id: `${floatingId}-${index}` } : {}),
      }
    },
  }
}

/**
 * Generate a unique ID
 */
let count = 0
function generateId() {
  return ++count
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring accessibility roles
 */
export interface UseRoleOptions {
  /**
   * Whether the role is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The role of the floating element
   * @default 'dialog'
   */
  role?: MaybeRefOrGetter<
    "tooltip" | "dialog" | "alertdialog" | "menu" | "listbox" | "grid" | "tree" | null
  >
}

/**
 * Return value of the useRole composable
 */
export interface UseRoleReturn {
  /**
   * Reference element props that enable role functionality
   */
  getReferenceProps: () => {
    "aria-haspopup"?: "dialog" | "menu" | "listbox" | "grid" | "tree"
    "aria-expanded"?: boolean
    "aria-controls"?: string
    "aria-describedby"?: string
    role?: string
  }

  /**
   * Floating element props that enable role functionality
   */
  getFloatingProps: () => {
    id?: string
    role?: "tooltip" | "dialog" | "alertdialog" | "menu" | "listbox" | "grid" | "tree" | null
  }

  /**
   * Get props for a list item
   */
  getItemProps: (options: {
    index?: number
    role?: MaybeRefOrGetter<string>
  }) => Record<string, any>
}
