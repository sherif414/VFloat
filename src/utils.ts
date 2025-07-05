import type { AnyFn } from "@/types"

let idCounter = 0
/**
 * Generates a unique ID.
 * The ID is incremented with each call.
 * @returns A unique string ID.
 */
export function useId(): string {
  return `vfloat-id-${idCounter++}`
}

/**
 * Checks if a value is a function
 * @param value - The value to check
 * @returns True if the value is a function, false otherwise
 */
export function isFunction(value: unknown): value is AnyFn {
  return typeof value === "function"
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof value === "object" && value instanceof HTMLElement
}