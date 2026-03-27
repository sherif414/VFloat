import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom"
import { computePosition, autoUpdate as floatingUIAutoUpdate } from "@floating-ui/dom"
import { computed, type MaybeRefOrGetter, type Ref, ref, shallowRef, toValue, watch } from "vue"
import { tryOnScopeDispose } from "@/core/lifecycle"
import type { AnchorElement, FloatingElement, FloatingStyles } from "../use-floating"
import { createMiddlewareRegistry } from "./middleware-registry"

export interface PositionControllerOptions {
  anchorEl: Ref<AnchorElement>
  floatingEl: Ref<FloatingElement>
  open: Ref<boolean>
  placement?: MaybeRefOrGetter<Placement | undefined>
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  transform?: MaybeRefOrGetter<boolean | undefined>
  middlewares?: MaybeRefOrGetter<Middleware[]>
  autoUpdate?: boolean | AutoUpdateOptions
}

export function createPositionController(options: PositionControllerOptions) {
  const {
    anchorEl,
    floatingEl,
    open,
    transform = true,
    middlewares = [],
    autoUpdate: autoUpdateOptions = true,
  } = options

  const preferredPlacement = computed(() => toValue(options.placement) ?? "bottom")
  const preferredStrategy = computed(() => toValue(options.strategy) ?? "absolute")
  const middlewareRegistry = createMiddlewareRegistry(middlewares)

  const x = ref(0)
  const y = ref(0)
  const placement = ref<Placement>(preferredPlacement.value)
  const strategy = ref<Strategy>(preferredStrategy.value)
  const middlewareData = shallowRef<MiddlewareData>({})
  const isPositioned = ref(false)

  const update = async () => {
    if (!anchorEl.value || !floatingEl.value) {
      return
    }

    try {
      const result = await computePosition(anchorEl.value, floatingEl.value, {
        placement: preferredPlacement.value,
        strategy: preferredStrategy.value,
        middleware: middlewareRegistry.middlewares.value,
      })

      x.value = result.x
      y.value = result.y
      placement.value = result.placement
      strategy.value = result.strategy
      middlewareData.value = result.middlewareData
      isPositioned.value = open.value
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[useFloating] Failed to compute position:", error)
      }
    }
  }

  watch([preferredPlacement, preferredStrategy, middlewareRegistry.middlewares], () => {
    if (open.value) {
      void update()
    }
  })

  watch(
    [anchorEl, floatingEl, open],
    ([currentAnchor, currentFloating, isOpen], _oldValue, onCleanup) => {
      if (!isOpen || !currentAnchor || !currentFloating) {
        return
      }

      void update()

      if (!autoUpdateOptions) {
        return
      }

      const cleanup = floatingUIAutoUpdate(
        currentAnchor,
        currentFloating,
        update,
        typeof autoUpdateOptions === "object" ? autoUpdateOptions : undefined
      )

      onCleanup(cleanup)
    },
    { immediate: true }
  )

  watch(open, (isOpen) => {
    if (!isOpen) {
      isPositioned.value = false
    }
  })

  const styles = computed<FloatingStyles>(() => {
    const floatingElement = floatingEl.value
    const baseStyles = {
      position: strategy.value,
      left: "0",
      top: "0",
    } satisfies FloatingStyles

    if (!floatingElement) {
      return baseStyles
    }

    const resolvedTransform = toValue(transform)
    const roundedX = roundByDPR(floatingElement, x.value)
    const roundedY = roundByDPR(floatingElement, y.value)

    if (!resolvedTransform) {
      return {
        ...baseStyles,
        left: `${roundedX}px`,
        top: `${roundedY}px`,
      }
    }

    return {
      ...baseStyles,
      transform: `translate(${roundedX}px, ${roundedY}px)`,
      ...(getDPR(floatingElement) >= 1.5 ? { "will-change": "transform" } : {}),
    }
  })

  tryOnScopeDispose(() => {
    isPositioned.value = false
  })

  return {
    middlewareRegistry,
    position: {
      x,
      y,
      strategy,
      placement,
      middlewareData,
      isPositioned,
      styles,
      update,
    },
  }
}

function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el)
  return Math.round(value * dpr) / dpr
}

function getDPR(el: HTMLElement) {
  if (typeof window === "undefined") {
    return 1
  }

  const win = el.ownerDocument.defaultView || window
  return win.devicePixelRatio || 1
}
