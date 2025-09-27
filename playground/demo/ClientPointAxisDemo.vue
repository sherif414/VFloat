<script setup lang="ts">
import { computed, ref } from "vue"
import { flip, shift } from "@floating-ui/dom"
import { useClientPoint, useFloating } from "@/composables"
import type { AxisConstraint } from "@/composables"

const axis = ref<AxisConstraint>("both")
const axisOptions: AxisConstraint[] = ["both", "x", "y"]
const open = ref(true)
const areaRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const floatingContext = useFloating(ref(null), floatingRef, {
  placement: computed(() => (axis.value === "y" ? "right" : "top")),
  middlewares: [shift({ padding: 8 }), flip()],
  open,
})

const { coordinates } = useClientPoint(areaRef, floatingContext, {
  axis,
})

const formattedCoordinates = computed(() => {
  const { x, y } = coordinates.value
  switch (axis.value) {
    case "x":
      return x == null ? "Move across the area" : `X: ${Math.round(x)}px`
    case "y":
      return y == null ? "Move across the area" : `Y: ${Math.round(y)}px`
    default:
      if (x == null || y == null) return "Move across the area"
      return `(${Math.round(x)}, ${Math.round(y)})`
  }
})

const verticalGuideStyle = computed(() => {
  if (axis.value === "y") return undefined
  const x = coordinates.value.x
  const areaEl = areaRef.value
  if (x == null || !areaEl) return undefined
  const { left } = areaEl.getBoundingClientRect()
  return { left: `${x - left}px` }
})

const horizontalGuideStyle = computed(() => {
  if (axis.value === "x") return undefined
  const y = coordinates.value.y
  const areaEl = areaRef.value
  if (y == null || !areaEl) return undefined
  const { top } = areaEl.getBoundingClientRect()
  return { top: `${y - top}px` }
})

const badgeLabel = computed(() => {
  switch (axis.value) {
    case "x":
      return "Axis locked to X"
    case "y":
      return "Axis locked to Y"
    default:
      return "Tracking both axes"
  }
})

const badgeClass = computed(() => {
  switch (axis.value) {
    case "x":
      return "bg-amber-500 border-amber-600"
    case "y":
      return "bg-emerald-500 border-emerald-600"
    default:
      return "bg-indigo-500 border-indigo-600"
  }
})

const selectAxis = (value: AxisConstraint) => {
  axis.value = value
}

const onPointerEnter = () => {
  open.value = true
}

const onPointerLeave = () => {
  open.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-12 px-4">
    <header class="max-w-3xl w-full mb-10 text-center">
      <p class="text-sm uppercase tracking-widest text-indigo-400 font-semibold">
        useClientPoint playground
      </p>
      <h1 class="text-3xl font-bold mt-2 mb-4">Axis Constraint Demonstration</h1>
      <p class="text-slate-300">
        Move your cursor inside the interaction surface to see how axis constraints change the
        behavior of <code>useClientPoint()</code>. Toggle between <code>both</code>, <code>x</code>,
        and <code>y</code> to lock the virtual anchor to different axes.
      </p>
    </header>

    <section class="max-w-3xl w-full">
      <div class="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div class="bg-slate-950/40 border-b border-slate-700 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">Axis controls</h2>
            <p class="text-slate-400 text-sm">
              Choose an axis to constrain the client point. The floating badge will only follow the
              allowed directions.
            </p>
          </div>
          <div class="inline-flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-full p-1">
            <button
              v-for="option in axisOptions"
              :key="option"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-full transition',
                axis === option
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60',
              ]"
              @click="selectAxis(option)"
            >
              {{ option.toUpperCase() }}
            </button>
          </div>
        </div>

        <div class="p-6">
          <div
            ref="areaRef"
            class="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl h-[420px] overflow-hidden"
            @pointerenter="onPointerEnter"
            @pointerleave="onPointerLeave"
          >
            <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-20">
              <div v-for="index in 16" :key="index" class="border border-slate-700/40"></div>
            </div>

            <div
              v-if="verticalGuideStyle"
              :style="verticalGuideStyle"
              class="absolute top-0 bottom-0 w-px bg-amber-400/70"
            ></div>

            <div
              v-if="horizontalGuideStyle"
              :style="horizontalGuideStyle"
              class="absolute left-0 right-0 h-px bg-emerald-400/70"
            ></div>

            <div class="absolute inset-x-0 top-8 flex justify-center">
              <div class="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full px-4 py-1 text-sm font-medium text-slate-200 shadow-md">
                {{ badgeLabel }}
              </div>
            </div>

            <div class="absolute inset-x-0 bottom-8 flex justify-center">
              <div class="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-200 shadow">
                {{ formattedCoordinates }}
              </div>
            </div>

            <div
              v-if="open"
              ref="floatingRef"
              :class="`absolute z-20 pointer-events-none ${badgeClass}`"
              :style="floatingContext.floatingStyles.value"
            >
              <div class="px-4 py-2 rounded-xl border font-semibold tracking-wide uppercase text-xs">
                {{ axis === "both" ? "Free" : `${axis.toUpperCase()} locked` }}
              </div>
            </div>

            <div class="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
              <div class="text-center">
                <p class="text-sm uppercase tracking-widest">Interaction surface</p>
                <p class="text-slate-400 text-xs mt-1">
                  Move your cursor inside to activate the floating anchor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
