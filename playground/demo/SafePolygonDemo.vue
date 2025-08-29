<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue"
import { offset, flip, shift } from "@floating-ui/dom"
import { useFloating, useHover, useFloatingTree, useClick } from "../../src/composables"

// State for demo controls
const selectedPlacement = ref<"top" | "right" | "bottom" | "left">("right")
const bufferSize = ref(8)
const showPolygon = ref(true)
const requireIntent = ref(true)

// Elements for basic demo
const basicAnchorEl = ref<HTMLElement | null>(null)
const basicFloatingEl = ref<HTMLElement | null>(null)
const basicPolygonPoints = ref<Array<[number, number]>>([])
const isPolygonActive = ref(false)

// Elements for menu demo
const menuAnchorEl = ref<HTMLElement | null>(null)
const menuFloatingEl = ref<HTMLElement | null>(null)
const menuPolygonPoints = ref<Array<[number, number]>>([])

// Elements for tooltip demo
const tooltipAnchorEl = ref<HTMLElement | null>(null)
const tooltipFloatingEl = ref<HTMLElement | null>(null)
const tooltipPolygonPoints = ref<Array<[number, number]>>([])

// Elements for tree-aware demo
const treeRootAnchorEl = ref<HTMLElement | null>(null)
const treeRootFloatingEl = ref<HTMLElement | null>(null)
const treeRootPolygonPoints = ref<Array<[number, number]>>([])

const treeChildAnchorEl = ref<HTMLElement | null>(null)
const treeChildFloatingEl = ref<HTMLElement | null>(null)
const treeChildPolygonPoints = ref<Array<[number, number]>>([])

const treeGrandChildAnchorEl = ref<HTMLElement | null>(null)
const treeGrandChildFloatingEl = ref<HTMLElement | null>(null)
const treeGrandChildPolygonPoints = ref<Array<[number, number]>>([])

// Basic demo context
const basicContext = useFloating(basicAnchorEl, basicFloatingEl, {
  placement: "right",
  middlewares: [offset(10), flip(), shift({ padding: 10 })],
})

// Menu demo context
const menuContext = useFloating(menuAnchorEl, menuFloatingEl, {
  placement: "bottom-start",
  middlewares: [offset(5), flip(), shift({ padding: 10 })],
})

// Tooltip demo context
const tooltipContext = useFloating(tooltipAnchorEl, tooltipFloatingEl, {
  placement: "top",
  middlewares: [offset(8), flip(), shift({ padding: 10 })],
})

// Tree-aware demo contexts using new API
const floatingTree = useFloatingTree(treeRootAnchorEl, treeRootFloatingEl, {
  placement: "bottom-start",
  middlewares: [offset(5), flip(), shift({ padding: 10 })],
})

const childNode = floatingTree.addNode(treeChildAnchorEl, treeChildFloatingEl, {
  placement: "right-start",
  middlewares: [offset(5), flip(), shift({ padding: 10 })],
  parentId: floatingTree.root.id,
})!

const grandChildNode = floatingTree.addNode(treeGrandChildAnchorEl, treeGrandChildFloatingEl, {
  placement: "right-start",
  middlewares: [offset(5), flip(), shift({ padding: 10 })],
  parentId: childNode.id,
})!

onUnmounted(() => {
  floatingTree.dispose()
})

// Setup hover behaviors with safe polygon
useHover(basicContext, {
  safePolygon: computed(() => ({
    buffer: bufferSize.value,
    requireIntent: requireIntent.value,
    onPolygonChange: (points) => {
      console.log("BasicContext onPolygonChange called with points:", points)
      isPolygonActive.value = points.length > 0
      if (showPolygon.value) {
        basicPolygonPoints.value = points
      }
    },
  })),
})

useHover(menuContext, {
  delay: { open: 100, close: 300 },
  safePolygon: {
    buffer: 12,
    onPolygonChange: (points) => {
      console.log("MenuContext onPolygonChange called with points:", points)
      menuPolygonPoints.value = points
    },
  },
})

useHover(tooltipContext, {
  delay: { open: 200, close: 100 },
  safePolygon: {
    buffer: 6,
    requireIntent: true,
    onPolygonChange: (points) => {
      tooltipPolygonPoints.value = points
    },
  },
})

// Tree-aware hover behaviors
useHover(floatingTree.root, {
  delay: { open: 100, close: 200 },
  safePolygon: {
    buffer: 10,
    onPolygonChange: (points) => {
      console.log("Tree root onPolygonChange called with points:", points)
      treeRootPolygonPoints.value = points
    },
  },
})

useClick(floatingTree.root, { outsideClick: true })

useHover(childNode, {
  delay: { open: 50, close: 150 },
  safePolygon: {
    buffer: 8,
    onPolygonChange: (points) => {
      console.log("Tree child onPolygonChange called with points:", points)
      treeChildPolygonPoints.value = points
    },
  },
})

useClick(childNode, { outsideClick: true })

useHover(grandChildNode, {
  delay: { open: 50, close: 100 },
  safePolygon: {
    buffer: 6,
    onPolygonChange: (points) => {
      console.log("Tree grandchild onPolygonChange called with points:", points)
      treeGrandChildPolygonPoints.value = points
    },
  },
})

useClick(grandChildNode, { outsideClick: true })

// Computed SVG points for visualization
const basicSvgPoints = computed(() => {
  return basicPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

const menuSvgPoints = computed(() => {
  return menuPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

const tooltipSvgPoints = computed(() => {
  return tooltipPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

const treeRootSvgPoints = computed(() => {
  return treeRootPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

const treeChildSvgPoints = computed(() => {
  return treeChildPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

const treeGrandChildSvgPoints = computed(() => {
  return treeGrandChildPolygonPoints.value.map((point) => point.join(",")).join(" ")
})

// Clear polygon points when floating elements close
watch(basicContext.open, (isOpen) => {
  if (!isOpen) {
    basicPolygonPoints.value = []
    isPolygonActive.value = false
  }
})

watch(menuContext.open, (isOpen) => {
  if (!isOpen) menuPolygonPoints.value = []
})

watch(tooltipContext.open, (isOpen) => {
  if (!isOpen) tooltipPolygonPoints.value = []
})

watch(treeRootContext.open, (isOpen) => {
  if (!isOpen) treeRootPolygonPoints.value = []
})

watch(treeChildContext.open, (isOpen) => {
  if (!isOpen) treeChildPolygonPoints.value = []
})

watch(treeGrandChildContext.open, (isOpen) => {
  if (!isOpen) treeGrandChildPolygonPoints.value = []
})

// Demo state
const activeDemo = ref<"basic" | "menu" | "tooltip" | "tree">("basic")
</script>

<template>
  <div class="safe-polygon-demo">
    <header class="demo-header">
      <h1>Safe Polygon Hover Demo</h1>
      <p class="description">
        The safe polygon algorithm prevents accidental closure when moving the mouse between
        reference and floating elements. The red highlighted area shows the "safe zone" where the
        floating element remains open.
      </p>
    </header>

    <!-- Demo Selector -->
    <div class="demo-selector">
      <button
        v-for="demo in ['basic', 'menu', 'tooltip', 'tree'] as const"
        :key="demo"
        :class="{ active: activeDemo === demo }"
        @click="activeDemo = demo"
      >
        {{ demo.charAt(0).toUpperCase() + demo.slice(1) }} Demo
      </button>
    </div>

    <!-- Controls Panel -->
    <div v-if="activeDemo === 'basic'" class="controls-panel">
      <h3>Controls</h3>
      <div class="control-group">
        <label>
          Placement:
          <select v-model="selectedPlacement">
            <option value="top">Top</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
          </select>
        </label>
      </div>
      <div class="control-group">
        <label>
          Buffer Size: {{ bufferSize }}px
          <input v-model.number="bufferSize" type="range" min="0" max="20" step="1" />
        </label>
      </div>
      <div class="control-group">
        <label>
          <input v-model="showPolygon" type="checkbox" />
          Show Safe Polygon
        </label>
      </div>
      <div class="control-group">
        <label>
          <input v-model="requireIntent" type="checkbox" />
          Require Intent (cursor speed detection)
        </label>
      </div>
    </div>

    <!-- Basic Demo -->
    <div v-if="activeDemo === 'basic'" class="demo-container">
      <h3>Basic Safe Polygon</h3>

      <!-- Status Indicator -->
      <div class="status-indicator">
        <div class="status-item">
          <span class="status-dot" :class="{ active: basicContext.open.value }"></span>
          Floating Element: {{ basicContext.open.value ? "Open" : "Closed" }}
        </div>
        <div class="status-item">
          <span class="status-dot" :class="{ active: isPolygonActive }"></span>
          Safe Polygon: {{ isPolygonActive ? "Active" : "Inactive" }}
        </div>
      </div>

      <div class="demo-area">
        <button ref="basicAnchorEl" class="reference-button primary">
          Hover me ({{ selectedPlacement }})
        </button>
        <div
          v-if="basicContext.open.value"
          ref="basicFloatingEl"
          class="floating-panel"
          :style="basicContext.floatingStyles.value"
        >
          <h4>Floating Panel</h4>
          <p>This panel stays open when you move your mouse through the safe polygon area.</p>
          <p><strong>Buffer:</strong> {{ bufferSize }}px</p>
          <p><strong>Intent Required:</strong> {{ requireIntent ? "Yes" : "No" }}</p>
        </div>
      </div>
    </div>

    <!-- Menu Demo -->
    <div v-if="activeDemo === 'menu'" class="demo-container">
      <h3>Dropdown Menu with Safe Polygon</h3>
      <div class="demo-area">
        <button ref="menuAnchorEl" class="reference-button menu">Open Menu ▼</button>
        <div
          v-if="menuContext.open.value"
          ref="menuFloatingEl"
          class="floating-menu"
          :style="menuContext.floatingStyles.value"
        >
          <div class="menu-item">📁 New Folder</div>
          <div class="menu-item">📄 New File</div>
          <div class="menu-item">✂️ Cut</div>
          <div class="menu-item">📋 Copy</div>
          <div class="menu-item">📌 Paste</div>
          <div class="menu-separator"></div>
          <div class="menu-item">🗑️ Delete</div>
          <div class="menu-item">✏️ Rename</div>
        </div>
      </div>
    </div>

    <!-- Tooltip Demo -->
    <div v-if="activeDemo === 'tooltip'" class="demo-container">
      <h3>Tooltip with Safe Polygon</h3>
      <div class="demo-area">
        <div class="tooltip-area">
          <p>
            Hover over the
            <span ref="tooltipAnchorEl" class="tooltip-trigger"> highlighted text </span>
            to see a tooltip with safe polygon behavior.
          </p>
        </div>
        <div
          v-if="tooltipContext.open.value"
          ref="tooltipFloatingEl"
          class="floating-tooltip"
          :style="tooltipContext.floatingStyles.value"
        >
          <strong>Safe Polygon Tooltip</strong><br />
          This tooltip uses a smaller buffer and requires cursor intent for a more precise
          interaction.
        </div>
      </div>
    </div>

    <!-- Tree-Aware Demo -->
    <div v-if="activeDemo === 'tree'" class="demo-container">
      <h3>Tree-Aware Safe Polygon Navigation</h3>

      <!-- Tree Status Indicator -->
      <div class="tree-status-indicator">
        <div class="tree-status-item">
          <span class="status-dot" :class="{ active: treeRootContext.open.value }"></span>
          Root Menu: {{ treeRootContext.open.value ? "Open" : "Closed" }}
        </div>
        <div class="tree-status-item">
          <span class="status-dot" :class="{ active: treeChildContext.open.value }"></span>
          Child Menu: {{ treeChildContext.open.value ? "Open" : "Closed" }}
        </div>
        <div class="tree-status-item">
          <span class="status-dot" :class="{ active: treeGrandChildContext.open.value }"></span>
          Grandchild Menu: {{ treeGrandChildContext.open.value ? "Open" : "Closed" }}
        </div>
      </div>

      <div class="demo-area tree-demo">
        <!-- Root Level -->
        <button ref="treeRootAnchorEl" class="reference-button tree-root">🏠 Root Menu</button>

        <div
          v-if="treeRootContext.open.value"
          ref="treeRootFloatingEl"
          class="floating-tree-menu root"
          :style="treeRootContext.floatingStyles.value"
        >
          <div class="tree-menu-header">🏠 Root Menu Panel</div>
          <div class="tree-menu-item">📄 New Document</div>
          <div class="tree-menu-item">📁 New Folder</div>
          <div class="tree-menu-separator"></div>

          <!-- Child Level Trigger -->
          <div ref="treeChildAnchorEl" class="tree-menu-item submenu-trigger">
            📋 Edit Options ▶
          </div>

          <div class="tree-menu-item">⚙️ Settings</div>

          <!-- Child Level Panel -->
          <div
            v-if="treeChildContext.open.value"
            ref="treeChildFloatingEl"
            class="floating-tree-menu child"
            :style="treeChildContext.floatingStyles.value"
          >
            <div class="tree-menu-header">📋 Edit Options</div>
            <div class="tree-menu-item">✂️ Cut</div>
            <div class="tree-menu-item">📋 Copy</div>
            <div class="tree-menu-item">📌 Paste</div>
            <div class="tree-menu-separator"></div>

            <!-- Grandchild Level Trigger -->
            <div ref="treeGrandChildAnchorEl" class="tree-menu-item submenu-trigger">
              🎨 Advanced ▶
            </div>

            <div class="tree-menu-item">🔄 Undo</div>

            <!-- Grandchild Level Panel -->
            <div
              v-if="treeGrandChildContext.open.value"
              ref="treeGrandChildFloatingEl"
              class="floating-tree-menu grandchild"
              :style="treeGrandChildContext.floatingStyles.value"
            >
              <div class="tree-menu-header">🎨 Advanced Tools</div>
              <div class="tree-menu-item">🖼️ Image Editor</div>
              <div class="tree-menu-item">🎭 Transform</div>
              <div class="tree-menu-item">🌈 Color Picker</div>
              <div class="tree-menu-item">📐 Measurements</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tree Navigation Instructions -->
      <div class="tree-instructions">
        <h4>🌳 Tree-Aware Navigation</h4>
        <div class="tree-steps">
          <div class="tree-step">
            <span class="tree-step-number">1</span>
            <strong>Click</strong> the "Root Menu" button to open the main menu
          </div>
          <div class="tree-step">
            <span class="tree-step-number">2</span>
            <strong>Hover</strong> over "Edit Options ▶" to open the child menu
          </div>
          <div class="tree-step">
            <span class="tree-step-number">3</span>
            <strong>Hover</strong> over "Advanced ▶" to open the grandchild menu
          </div>
          <div class="tree-step">
            <span class="tree-step-number">4</span>
            <strong>Navigate</strong> between menus - safe polygons prevent accidental closure
          </div>
          <div class="tree-step">
            <span class="tree-step-number">5</span>
            <strong>Notice</strong> how each level maintains its own safe polygon (different colors)
          </div>
        </div>

        <div class="tree-important-note">
          <strong>🔑 Key Feature:</strong> Each menu level has its own safe polygon that coordinates
          with the tree hierarchy. Moving between parent and child menus doesn't close the parent,
          but moving outside the entire tree structure will close all levels.
        </div>
      </div>
    </div>

    <!-- SVG Overlay for Polygon Visualization -->
    <svg v-if="showPolygon" class="polygon-svg">
      <!-- Basic Demo Polygon -->
      <polygon
        v-if="activeDemo === 'basic' && basicSvgPoints && basicContext.open.value"
        :points="basicSvgPoints"
        class="safe-polygon basic"
      />
      <!-- Menu Demo Polygon -->
      <polygon
        v-if="activeDemo === 'menu' && menuSvgPoints && menuContext.open.value"
        :points="menuSvgPoints"
        class="safe-polygon menu"
      />
      <!-- Tooltip Demo Polygon -->
      <polygon
        v-if="activeDemo === 'tooltip' && tooltipSvgPoints && tooltipContext.open.value"
        :points="tooltipSvgPoints"
        class="safe-polygon tooltip"
      />
      <!-- Tree Demo Polygons -->
      <polygon
        v-if="activeDemo === 'tree' && treeRootSvgPoints && treeRootContext.open.value"
        :points="treeRootSvgPoints"
        class="safe-polygon tree-root"
      />
      <polygon
        v-if="activeDemo === 'tree' && treeChildSvgPoints && treeChildContext.open.value"
        :points="treeChildSvgPoints"
        class="safe-polygon tree-child"
      />
      <polygon
        v-if="activeDemo === 'tree' && treeGrandChildSvgPoints && treeGrandChildContext.open.value"
        :points="treeGrandChildSvgPoints"
        class="safe-polygon tree-grandchild"
      />
    </svg>

    <!-- Instructions -->
    <div class="instructions">
      <h3>How Safe Polygon Works</h3>
      <div class="steps">
        <div class="step">
          <span class="step-number">1</span>
          <strong>Hover</strong> over the reference element to open the floating element
        </div>
        <div class="step">
          <span class="step-number">2</span>
          <strong>Move your mouse away</strong> from the reference element (this triggers safe
          polygon creation)
        </div>
        <div class="step">
          <span class="step-number">3</span>
          <strong>Red lines appear</strong> showing the "safe zone" where the floating element stays
          open
        </div>
        <div class="step">
          <span class="step-number">4</span>
          <strong>Navigate to the floating element</strong> through the red safe zone
        </div>
        <div class="step">
          <span class="step-number">5</span>
          <strong>Move outside the red area</strong> and the floating element closes
        </div>
      </div>

      <div class="important-note">
        <strong>⚠️ Important:</strong> The red polygon only appears when you're <em>leaving</em> the
        reference element. This is when you need protection from accidental closure while navigating
        to the floating element.
      </div>
    </div>

    <!-- Features -->
    <div class="features">
      <h3>Safe Polygon Features</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>🎯 Precise Navigation</h4>
          <p>Prevents accidental closure when moving between elements</p>
        </div>
        <div class="feature-card">
          <h4>⚡ Intent Detection</h4>
          <p>Requires minimum cursor speed to close (when enabled)</p>
        </div>
        <div class="feature-card">
          <h4>🔧 Configurable Buffer</h4>
          <p>Adjustable buffer size for different use cases</p>
        </div>
        <div class="feature-card">
          <h4>🌳 Tree-Aware</h4>
          <p>Coordinates safe polygons across nested floating element hierarchies</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safe-polygon-demo {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.6;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.demo-header h1 {
  color: #1f2937;
  margin-bottom: 1rem;
}

.description {
  color: #6b7280;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Demo Selector */
.demo-selector {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.demo-selector button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.demo-selector button:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.demo-selector button.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

/* Controls Panel */
.controls-panel {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.controls-panel h3 {
  margin-top: 0;
  color: #1f2937;
}

.control-group {
  margin-bottom: 1rem;
}

.control-group label {
  display: block;
  font-weight: 500;
  color: #374151;
}

.control-group select,
.control-group input[type="range"] {
  margin-left: 0.5rem;
  margin-top: 0.25rem;
}

.control-group input[type="range"] {
  width: 200px;
}

/* Demo Container */
.demo-container {
  margin-bottom: 3rem;
}

.demo-container h3 {
  color: #1f2937;
  margin-bottom: 1rem;
}

.demo-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin: 2rem 0;
  position: relative;
  background: #f9fafb;
  border-radius: 1rem;
  padding: 2rem;
}

/* Reference Buttons */
.reference-button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
}

.reference-button.primary {
  background: #3b82f6;
  color: white;
}

.reference-button.primary:hover {
  background: #2563eb;
}

.reference-button.menu {
  background: #10b981;
  color: white;
}

.reference-button.menu:hover {
  background: #059669;
}

/* Floating Elements */
.floating-panel {
  background: #1f2937;
  color: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 280px;
  z-index: 10;
}

.floating-panel h4 {
  margin-top: 0;
  color: #f9fafb;
}

.floating-panel p {
  margin: 0.5rem 0;
  color: #d1d5db;
}

.floating-menu {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  min-width: 180px;
  z-index: 10;
}

.menu-item {
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-separator {
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
}

.tooltip-area {
  text-align: center;
  font-size: 1.1rem;
}

.tooltip-trigger {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: help;
  border-bottom: 2px dotted #d97706;
}

.floating-tooltip {
  background: #374151;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  max-width: 200px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

/* SVG Polygon Overlay */
.polygon-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 5;
}

.safe-polygon {
  stroke-width: 2;
  fill-opacity: 0.15;
  stroke-opacity: 0.6;
}

.safe-polygon.basic {
  fill: #ef4444;
  stroke: #dc2626;
}

.safe-polygon.menu {
  fill: #10b981;
  stroke: #059669;
}

.safe-polygon.tooltip {
  fill: #8b5cf6;
  stroke: #7c3aed;
}

.safe-polygon.tree-root {
  fill: #f59e0b;
  stroke: #d97706;
}

.safe-polygon.tree-child {
  fill: #06b6d4;
  stroke: #0891b2;
}

.safe-polygon.tree-grandchild {
  fill: #ec4899;
  stroke: #db2777;
}

/* Instructions */
.instructions {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 1.5rem;
  margin: 2rem 0;
  border-radius: 0.5rem;
}

.instructions h3 {
  color: #1e40af;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.steps {
  margin-bottom: 1.5rem;
}

.step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.important-note {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #92400e;
}

/* Status Indicator */
.status-indicator {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: background-color 0.2s;
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

/* Features */
.features {
  margin-top: 3rem;
}

.features h3 {
  text-align: center;
  color: #1f2937;
  margin-bottom: 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.feature-card h4 {
  color: #1f2937;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #6b7280;
  margin: 0;
}

/* Tree-Aware Demo Styles */
.tree-demo {
  min-height: 300px;
  align-items: flex-start;
  justify-content: flex-start;
}

.reference-button.tree-root {
  background: #f59e0b;
  color: white;
}

.reference-button.tree-root:hover {
  background: #d97706;
}

.floating-tree-menu {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  min-width: 180px;
  z-index: 10;
}

.floating-tree-menu.root {
  border-left: 3px solid #f59e0b;
}

.floating-tree-menu.child {
  border-left: 3px solid #06b6d4;
}

.floating-tree-menu.grandchild {
  border-left: 3px solid #ec4899;
}

.tree-menu-header {
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: #374151;
}

.tree-menu-item {
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.15s;
  font-size: 0.875rem;
}

.tree-menu-item:hover {
  background: #f3f4f6;
}

.tree-menu-item.submenu-trigger {
  font-weight: 500;
  color: #374151;
}

.tree-menu-item.submenu-trigger:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.tree-menu-separator {
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
}

/* Tree Status Indicator */
.tree-status-indicator {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.tree-status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Tree Instructions */
.tree-instructions {
  background: #fef7ff;
  border-left: 4px solid #a855f7;
  padding: 1.5rem;
  margin: 2rem 0;
  border-radius: 0.5rem;
}

.tree-instructions h4 {
  color: #7c2d12;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.tree-steps {
  margin-bottom: 1.5rem;
}

.tree-step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.tree-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #a855f7;
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.tree-important-note {
  background: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #065f46;
}

/* Responsive Design */
@media (max-width: 768px) {
  .safe-polygon-demo {
    padding: 1rem;
  }

  .demo-selector {
    flex-direction: column;
    align-items: center;
  }

  .demo-area {
    padding: 1rem;
    min-height: 150px;
  }

  .controls-panel {
    padding: 1rem;
  }

  .control-group input[type="range"] {
    width: 150px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
