import type { Ref } from "vue"
import type { VirtualElement } from "@/types"

export type AnchorDomElement = HTMLElement | VirtualElement | null
export type FloatingDomElement = HTMLElement | null

export function resolveAnchorElement(anchor: AnchorDomElement): HTMLElement | null {
  if (!anchor) {
    return null
  }

  if (anchor instanceof HTMLElement) {
    return anchor
  }

  return anchor.contextElement instanceof HTMLElement ? anchor.contextElement : null
}

export function createRefSetter<T>(target: Ref<T>) {
  return (value: T) => {
    target.value = value
  }
}
