<script setup>
import { computed, ref } from "vue"
import { useClientPoint, useFloating, useClick } from "@/composables"
import { flip } from "@floating-ui/dom"

const showTooltip = ref(false)
const reference = ref(null)
const floating = ref(null)

// Control options
const axis = ref("both") // 'x', 'y', or 'both'
const placement = ref("bottom")
const visualizationType = ref("tooltip") // 'tooltip', 'indicator', 'heatmap'
const isTrackingActive = ref(true)
const trackingMode = ref("follow") // 'follow', 'static'
const useExternalCoords = ref(false)
const externalX = ref(200)
const externalY = ref(150)

// Context menu state
const showContextMenu = ref(false)
const contextReference = ref(null)
const contextFloating = ref(null)

// Available placements
const placements = [
  "top",
  "top-start",
  "top-end",
  "right",
  "right-start",
  "right-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
]

// Floating context with reactive placement
const context = useFloating(ref(null), floating, {
  open: showTooltip,
  placement,
  middlewares: [flip()],
})

// Context menu floating context
const contextMenuContext = useFloating(contextReference, contextFloating, {
  open: showContextMenu,
  placement: "bottom-start",
  middlewares: [flip()],
})

// Client point with reactive axis constraint and tracking mode
const { coordinates } = useClientPoint(reference, context, {
  axis: axis,
  trackingMode: trackingMode,
  x: computed(() => (useExternalCoords.value ? externalX.value : null)),
  y: computed(() => (useExternalCoords.value ? externalY.value : null)),
})

// Context menu client point with static tracking
const { coordinates: contextCoords } = useClientPoint(contextReference, contextMenuContext, {
  trackingMode: "static",
})

// Click handling for context menu outside clicks
useClick(contextMenuContext, {
  outsideClick: true,
})

// Format coordinates based on axis mode
function formatCoordinates(coords, mode) {
  if (!coords.x && !coords.y) return "N/A"
  if (mode === "x") return `X: ${Math.round(coords.x)}`
  if (mode === "y") return `Y: ${Math.round(coords.y)}`
  return `(${Math.round(coords.x)}, ${Math.round(coords.y)})`
}

// Toggle tracking
function toggleTracking() {
  isTrackingActive.value = !isTrackingActive.value
  if (!isTrackingActive.value) {
    showTooltip.value = false
  }
}

// Handle mouse events
function onMouseEnter() {
  if (isTrackingActive.value) {
    showTooltip.value = true
  }
}

function onMouseLeave() {
  showTooltip.value = false
}

// Context menu handlers
function onContextMenu(event) {
  event.preventDefault()
  contextReference.value = event.target
  showContextMenu.value = true
}

function closeContextMenu() {
  showContextMenu.value = false
}

function executeContextAction(action) {
  console.log(`Context action: ${action}`)
  closeContextMenu()
}

// Tooltip color based on visualization type
const tooltipColor = computed(() => {
  switch (visualizationType.value) {
    case "indicator":
      return "bg-teal-600 border-teal-800"
    case "heatmap":
      return "bg-purple-600 border-purple-800"
    default:
      return "bg-indigo-600 border-indigo-800"
  }
})
</script>

<template>
  <div class="flex flex-col items-center bg-gray-100 p-6 min-h-screen">
    <!-- Header -->
    <header class="w-full max-w-4xl mb-6">
      <h1 class="text-3xl font-bold text-indigo-800 mb-2">useClientPoint Demo</h1>
      <p class="text-gray-600">
        This demo showcases the
        <code class="bg-gray-200 px-1 rounded">useClientPoint</code> composable, which tracks the
        mouse cursor's position relative to reference elements.
      </p>
    </header>

    <!-- Combined Demo -->
    <div class="w-full max-w-4xl">
      <!-- Control Panel -->
      <section class="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div class="bg-indigo-800 text-white p-3">
          <h2 class="font-bold">Demo Controls</h2>
        </div>
        <div class="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Axis Selection -->
          <div>
            <h3 class="font-semibold text-sm text-gray-700 mb-2">Axis Constraint</h3>
            <div class="flex flex-col gap-2">
              <label class="inline-flex items-center">
                <input
                  v-model="axis"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="both"
                />
                <span class="ml-2 text-sm">Both X/Y</span>
              </label>
              <label class="inline-flex items-center">
                <input v-model="axis" class="form-radio text-indigo-600" type="radio" value="x" />
                <span class="ml-2 text-sm">X axis only</span>
              </label>
              <label class="inline-flex items-center">
                <input v-model="axis" class="form-radio text-indigo-600" type="radio" value="y" />
                <span class="ml-2 text-sm">Y axis only</span>
              </label>
            </div>
          </div>

          <!-- Tracking Mode Selection -->
          <div>
            <h3 class="font-semibold text-sm text-gray-700 mb-2">Tracking Mode</h3>
            <div class="flex flex-col gap-2">
              <label class="inline-flex items-center">
                <input
                  v-model="trackingMode"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="follow"
                />
                <span class="ml-2 text-sm">Follow Cursor</span>
              </label>
              <label class="inline-flex items-center">
                <input
                  v-model="trackingMode"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="static"
                  :disabled="useExternalCoords"
                />
                <span class="ml-2 text-sm">Static Position</span>
              </label>
              <label class="inline-flex items-center">
                <input
                  v-model="useExternalCoords"
                  class="form-checkbox text-indigo-600"
                  type="checkbox"
                />
                <span class="ml-2 text-sm">External Coordinates</span>
              </label>
              <div v-if="useExternalCoords" class="mt-2 space-y-1">
                <label class="block text-xs text-gray-600">
                  X:
                  <input
                    v-model.number="externalX"
                    class="border rounded px-1 text-xs w-16"
                    type="number"
                  />
                </label>
                <label class="block text-xs text-gray-600">
                  Y:
                  <input
                    v-model.number="externalY"
                    class="border rounded px-1 text-xs w-16"
                    type="number"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Placement Selection -->
          <div>
            <h3 class="font-semibold text-sm text-gray-700 mb-2">Placement</h3>
            <select v-model="placement" class="border rounded p-1 text-sm w-full mb-2">
              <option v-for="p in placements" :key="p" :value="p">{{ p }}</option>
            </select>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Using middleware:</span>
              <span class="text-xs bg-gray-100 px-2 py-1 rounded">flip()</span>
            </div>
          </div>

          <!-- Visualization Type -->
          <div>
            <h3 class="font-semibold text-sm text-gray-700 mb-2">Visualization</h3>
            <div class="flex flex-col gap-2">
              <label class="inline-flex items-center">
                <input
                  v-model="visualizationType"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="tooltip"
                />
                <span class="ml-2 text-sm">Tooltip</span>
              </label>
              <label class="inline-flex items-center">
                <input
                  v-model="visualizationType"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="indicator"
                />
                <span class="ml-2 text-sm">Axis Indicator</span>
              </label>
              <label class="inline-flex items-center">
                <input
                  v-model="visualizationType"
                  class="form-radio text-indigo-600"
                  type="radio"
                  value="heatmap"
                />
                <span class="ml-2 text-sm">Heatmap</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Status and Toggle -->
        <div class="bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
          <div class="text-sm">
            <span class="font-mono">{{ formatCoordinates(coordinates, axis) }}</span>
            <span class="ml-4 text-gray-500"
              >Status:
              <span :class="isTrackingActive ? 'text-green-600' : 'text-red-500'">
                {{ isTrackingActive ? "Active" : "Disabled" }}
              </span>
            </span>
          </div>
          <button
            :class="
              isTrackingActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            "
            class="px-3 py-1 text-sm rounded"
            @click="toggleTracking"
          >
            {{ isTrackingActive ? "Disable" : "Enable" }} Tracking
          </button>
        </div>
      </section>

      <!-- Interactive Demo Area -->
      <section class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div class="bg-indigo-700 text-white p-3 flex justify-between items-center">
          <h2 class="font-bold">Interactive Demonstration</h2>
          <div class="text-xs text-indigo-200">
            {{
              axis === "both"
                ? "Tracking both axes"
                : axis === "x"
                  ? "Tracking X axis only"
                  : "Tracking Y axis only"
            }}
          </div>
        </div>

        <!-- Interactive Area -->
        <div class="p-6">
          <div
            ref="reference"
            class="relative w-full h-80 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center select-none"
            @mouseenter="onMouseEnter"
            @mouseleave="onMouseLeave"
            @contextmenu="onContextMenu"
          >
            <!-- Grid Lines for Visual Context -->
            <template v-if="axis === 'x' || axis === 'both'">
              <div class="absolute w-full h-0.5 bg-gray-200 top-1/4 left-0"></div>
              <div class="absolute w-full h-0.5 bg-gray-200 top-1/2 left-0"></div>
              <div class="absolute w-full h-0.5 bg-gray-200 top-3/4 left-0"></div>
            </template>
            <template v-if="axis === 'y' || axis === 'both'">
              <div class="absolute h-full w-0.5 bg-gray-200 left-1/4 top-0"></div>
              <div class="absolute h-full w-0.5 bg-gray-200 left-1/2 top-0"></div>
              <div class="absolute h-full w-0.5 bg-gray-200 left-3/4 top-0"></div>
            </template>

            <!-- Instructions -->
            <div class="text-center z-10">
              <div class="text-gray-700 font-medium mb-2">
                {{
                  isTrackingActive
                    ? trackingMode === "static"
                      ? "Move cursor around, then hover to see static positioning"
                      : "Move cursor to see tracking in action"
                    : "Tracking disabled"
                }}
              </div>
              <div class="text-xs text-gray-500 mb-1">
                Using placement: <span class="font-mono">{{ placement }}</span>
              </div>
              <div class="text-xs text-gray-500 mb-1">
                Tracking mode:
                <span class="font-mono">{{
                  useExternalCoords ? "external-coords" : trackingMode
                }}</span>
              </div>
              <div
                v-if="trackingMode === 'static' && !useExternalCoords"
                class="text-xs text-blue-600 mb-1"
              >
                Static mode: Position captured when tooltip opens, not on first mouse event
              </div>
              <div class="text-xs text-orange-600">Right-click anywhere for context menu demo</div>
            </div>

            <!-- Floating Element - Position and style depends on visualization type -->
            <div
              v-if="showTooltip"
              ref="floating"
              :class="{
                'transform -translate-x-1/2 -translate-y-1/2': visualizationType === 'heatmap',
              }"
              :style="
                visualizationType === 'heatmap'
                  ? { left: `${coordinates.x}px`, top: `${coordinates.y}px` }
                  : context.floatingStyles.value
              "
              class="absolute z-20 pointer-events-none"
            >
              <!-- Tooltip Visualization -->
              <div
                v-if="visualizationType === 'tooltip'"
                :class="`${tooltipColor} text-white px-3 py-1 rounded-md shadow-lg text-xs border font-mono`"
              >
                {{ formatCoordinates(coordinates, axis) }}
              </div>

              <!-- Axis Indicator Visualization -->
              <template v-else-if="visualizationType === 'indicator'">
                <div v-if="axis === 'x'" class="h-8 w-0.5 bg-teal-500 rounded-full shadow-md"></div>
                <div
                  v-else-if="axis === 'y'"
                  class="w-8 h-0.5 bg-teal-500 rounded-full shadow-md"
                ></div>
                <div v-else class="relative">
                  <div class="w-8 h-0.5 bg-teal-500 rounded-full shadow-md"></div>
                  <div
                    class="h-8 w-0.5 bg-teal-500 rounded-full shadow-md absolute top-0 left-1/2 -translate-x-1/2"
                  ></div>
                  <div
                    class="absolute -top-6 -left-4 bg-teal-600 text-white px-2 py-0.5 rounded text-xs"
                  >
                    {{ formatCoordinates(coordinates, axis) }}
                  </div>
                </div>
              </template>

              <!-- Heatmap Visualization -->
              <template v-else-if="visualizationType === 'heatmap'">
                <div
                  :style="{
                    background: `radial-gradient(circle, rgba(124, 58, 237, 0.8) 0%, rgba(124, 58, 237, 0.1) 70%, transparent 100%)`,
                  }"
                  class="rounded-full w-16 h-16 flex items-center justify-center"
                >
                  <div class="text-white text-xs font-mono">
                    {{ Math.round(coordinates.x) }},{{ Math.round(coordinates.y) }}
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Context Menu -->
          <Teleport to="body">
            <div
              v-if="showContextMenu"
              ref="contextFloating"
              :style="contextMenuContext.floatingStyles.value"
              class="absolute z-30 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-32"
              @click="closeContextMenu"
            >
              <div class="px-3 py-1 text-xs text-gray-500 border-b border-gray-200 mb-1">
                Static Position Demo
              </div>
              <button
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                @click="executeContextAction('copy')"
              >
                📋 Copy
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                @click="executeContextAction('paste')"
              >
                📥 Paste
              </button>
              <div class="border-t border-gray-200 my-1"></div>
              <button
                class="w-full text-left px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                @click="executeContextAction('delete')"
              >
                🗑️ Delete
              </button>
            </div>
          </Teleport>
        </div>
      </section>

      <!-- Information Panel -->
      <section class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="bg-indigo-700 text-white p-3">
          <h2 class="font-bold">How It Works</h2>
        </div>
        <div class="p-4">
          <div class="prose prose-sm max-w-none">
            <p>
              The <code>useClientPoint</code> composable lets you track mouse cursor coordinates
              relative to a reference element. This is useful for building tooltips, popovers, and
              other interactive UI elements.
            </p>
            <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto">
const { coordinates } = useClientPoint(
  referenceElement,
  floatingContext,
  { 
    axis: "both" | "x" | "y",
    trackingMode: "follow" | "static"
    useExternalCoords?: boolean
  }
)</pre
            >
            <p>Key features demonstrated here:</p>
            <ul class="space-y-1">
              <li>
                • <strong>Axis Constraint</strong> - Limit tracking to X-axis, Y-axis, or both
              </li>
              <li>• <strong>Tracking Modes</strong> - Follow cursor or static position</li>
              <li>
                • <strong>External Coordinates</strong> - Programmatic positioning with custom
                coordinates
              </li>
              <li>
                • <strong>Placement Options</strong> - Position tooltips relative to the cursor
              </li>
              <li>
                • <strong>Dynamic Visualization</strong> - Different ways to visualize the tracking
              </li>
              <li>
                • <strong>Context Menu Pattern</strong> - Right-click to see static positioning in
                action
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
