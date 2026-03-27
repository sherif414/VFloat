import type { Middleware as FloatingMiddleware } from "@floating-ui/dom"
import type { ComputedRef, MaybeRefOrGetter } from "vue"

export interface FloatingMiddlewareRegistry {
  middlewares: ComputedRef<FloatingMiddleware[]>
  register: (middleware: MaybeRefOrGetter<FloatingMiddleware | null | undefined>) => () => void
}

export interface FloatingInternals {
  middlewareRegistry: FloatingMiddlewareRegistry
}

const floatingInternals = new WeakMap<object, FloatingInternals>()

export function setFloatingInternals(target: object, internals: FloatingInternals) {
  floatingInternals.set(target, internals)
}

export function getFloatingInternals(target: object) {
  return floatingInternals.get(target)
}
