<template>
  <div class="demo-preview">
    <div class="cursor-demo">
      <div class="demo-controls">
        <label class="control-item">
          <input v-model="isEnabled" type="checkbox" />
          Enable cursor following
        </label>
        <label class="control-item">
          <span>Follow mode:</span>
          <select v-model="followMode" class="mode-select">
            <option value="smooth">Smooth following</option>
            <option value="instant">Instant tracking</option>
            <option value="axis-x">X-axis only</option>
            <option value="axis-y">Y-axis only</option>
          </select>
        </label>
      </div>

      <div ref="trackingArea" class="tracking-area" :class="{ active: isEnabled }">
        <div class="tracking-content">
          <h3>Cursor Tracking Area</h3>
          <p>Move your mouse around to see the tooltip follow your cursor</p>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon">🎯</div>
              <div class="feature-text">Precise positioning</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🔄</div>
              <div class="feature-text">Real-time tracking</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <div class="feature-text">High performance</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🎨</div>
              <div class="feature-text">Smooth animations</div>
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
            class="cursor-tooltip floating-element"
          >
            <div v-show="cursorContext.isPositioned.value" class="tooltip-content">
              <div class="coordinate-display">
                <span class="coord-label">Position:</span>
                <span class="coord-value">
                  {{ Math.round(coordinates.x || 0) }}, {{ Math.round(coordinates.y || 0) }}
                </span>
              </div>
              <div class="mode-display">
                <span class="mode-label">Mode:</span>
                <span class="mode-value">{{ followMode }}</span>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <div class="demo-info">
        <div class="info-section">
          <h4>useClientPoint Features</h4>
          <ul class="feature-list">
            <li><strong>Axis constraints:</strong> Limit tracking to X or Y axis</li>
            <li><strong>Virtual elements:</strong> No need for DOM reference elements</li>
            <li><strong>Performance optimized:</strong> Efficient event handling</li>
            <li><strong>Middleware compatible:</strong> Works with flip, shift, etc.</li>
          </ul>
        </div>
        <div class="info-section">
          <h4>Implementation</h4>
          <div class="code-sample">
            <pre><code>const { coordinates } = useClientPoint(
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
import { computed, ref, useTemplateRef } from "vue"
import { useFloating, useClientPoint, useHover } from "v-float"

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

<style scoped>
.demo-preview {
  position: relative;
}

.cursor-demo {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.demo-controls {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.mode-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

.tracking-area {
  background: var(--vp-c-bg-elv);
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 2rem;
  min-height: 350px;
  transition: all 0.3s ease;
}

.tracking-area.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.tracking-content {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
}

.tracking-content h3 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 1.25rem;
}

.tracking-content p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
}

.feature-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  transition: all 0.2s ease;
}

.feature-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.feature-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.feature-text {
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.floating-element {
  z-index: 1000;
  pointer-events: none;
}

.cursor-tooltip {
  max-width: 200px;
}

.tooltip-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
}

.coordinate-display,
.mode-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.coordinate-display:last-child,
.mode-display:last-child {
  margin-bottom: 0;
}

.coord-label,
.mode-label {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.coord-value {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.mode-value {
  color: var(--vp-c-text-1);
  font-weight: 500;
  text-transform: capitalize;
}

.demo-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.info-section {
  padding: 1rem;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.info-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}

.feature-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.feature-list li {
  margin-bottom: 0.5rem;
}

.feature-list strong {
  color: var(--vp-c-text-1);
}

.code-sample {
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  padding: 0.75rem;
  overflow-x: auto;
}

.code-sample pre {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
}

.code-sample code {
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

@media (max-width: 768px) {
  .demo-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .tracking-area {
    padding: 1rem;
    min-height: 250px;
  }

  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .demo-info {
    grid-template-columns: 1fr;
  }
}
</style>
