<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="flex flex-col gap-6">
      <div
        class="flex gap-6 items-center p-4 bg-gray-50 rounded-lg border border-gray-200 flex-wrap md:flex-row md:items-center md:gap-6 flex-col items-start gap-4"
      >
        <label class="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <input v-model="isEnabled" type="checkbox" />
          Enable cursor following {{ cursorContext.open.value }}
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <span>Follow mode:</span>
          <select
            v-model="followMode"
            class="px-2 py-1 border border-gray-300 rounded bg-white text-gray-800 text-sm ml-2"
          >
            <option value="smooth">Smooth following</option>
            <option value="instant">Instant tracking</option>
            <option value="axis-x">X-axis only</option>
            <option value="axis-y">Y-axis only</option>
          </select>
        </label>
      </div>

      <div
        ref="trackingArea"
        class="bg-gray-100 border-2 border-gray-200 rounded-xl p-8 min-h-[350px] transition-all duration-300 md:p-8 md:min-h-[350px] p-4 min-h-[250px]"
        :class="{ 'border-blue-500 bg-gray-50': isEnabled }"
      >
        <div class="text-center h-full flex flex-col justify-center gap-6">
          <h3 class="m-0 text-gray-900 text-xl">Cursor Tracking Area</h3>
          <p class="m-0 text-gray-600 text-sm">
            Move your mouse around to see the tooltip follow your cursor
          </p>
          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4 max-w-[500px] mx-auto md:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] grid-cols-2"
          >
            <div
              class="bg-white border border-gray-200 rounded-lg p-4 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
            >
              <div class="text-2xl mb-2">🎯</div>
              <div class="text-xs text-gray-900 font-medium">Precise positioning</div>
            </div>
            <div
              class="bg-white border border-gray-200 rounded-lg p-4 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
            >
              <div class="text-2xl mb-2">🔄</div>
              <div class="text-xs text-gray-900 font-medium">Real-time tracking</div>
            </div>
            <div
              class="bg-white border border-gray-200 rounded-lg p-4 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
            >
              <div class="text-2xl mb-2">⚡</div>
              <div class="text-xs text-gray-900 font-medium">High performance</div>
            </div>
            <div
              class="bg-white border border-gray-200 rounded-lg p-4 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
            >
              <div class="text-2xl mb-2">🎨</div>
              <div class="text-xs text-gray-900 font-medium">Smooth animations</div>
            </div>
          </div>
        </div>

        <Teleport to="body">
          <div
            v-if="cursorContext.open.value"
            ref="cursorTooltip"
            :style="[
              cursorContext.floatingStyles.value,
              { transition: followMode === 'smooth' ? 'transform 0.1s ease-out' : 'none' },
            ]"
            class="z-1000 pointer-events-none max-w-[200px]"
          >
            <div
              v-show="cursorContext.isPositioned.value"
              class="bg-white border border-gray-200 rounded-md p-3 shadow-lg text-xs"
            >
              <div class="flex justify-between mb-2">
                <span class="text-gray-600 font-medium">Position:</span>
                <span class="font-mono text-blue-600 font-semibold">
                  {{ Math.round(coordinates.x || 0) }}, {{ Math.round(coordinates.y || 0) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Mode:</span>
                <span class="text-gray-900 font-medium capitalize">{{ followMode }}</span>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <div class="grid grid-cols-2 gap-6 md:grid-cols-2 grid-cols-1">
        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 class="m-0 mb-3 text-gray-900 text-base">useClientPoint Features</h4>
          <ul class="m-0 pl-5 text-sm text-gray-600 leading-relaxed">
            <li class="mb-2">
              <strong class="text-gray-900">Axis constraints:</strong> Limit tracking to X or Y axis
            </li>
            <li class="mb-2">
              <strong class="text-gray-900">Virtual elements:</strong> No need for DOM reference
              elements
            </li>
            <li class="mb-2">
              <strong class="text-gray-900">Performance optimized:</strong> Efficient event handling
            </li>
            <li class="mb-2">
              <strong class="text-gray-900">Middleware compatible:</strong> Works with flip, shift,
              etc.
            </li>
          </ul>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 class="m-0 mb-3 text-gray-900 text-base">Implementation</h4>
          <div class="bg-gray-100 rounded-md p-3 overflow-x-auto">
            <pre
              class="m-0 text-xs leading-snug"
            ><code class="text-gray-900 font-mono">const { coordinates } = useClientPoint(
  trackingArea, 
  context,
  { axis: "{{ axisMode }}" }
)</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watchPostEffect } from "vue"
import { useFloating, useClientPoint, useHover } from "@/composables"

const trackingArea = useTemplateRef("trackingArea")
const cursorTooltip = useTemplateRef("cursorTooltip")

const isEnabled = ref(true)
const followMode = ref("smooth")

const cursorContext = useFloating(ref(null), cursorTooltip, {
  placement: "bottom-start",
})

useHover(cursorContext, {
  enabled: isEnabled,
})

const axisMode = computed(() => {
  switch (followMode.value) {
    case "axis-x":
      return "x"
    case "axis-y":
      return "y"
    default:
      return "both"
  }
})

const { coordinates } = useClientPoint(trackingArea, cursorContext, {
  axis: axisMode,
  enabled: isEnabled,
})
</script>
