<template>
  <div class="demo-preview">
    <div class="cursor-demo">

      <div ref="trackingArea" class="tracking-area">
        <div class="tracking-content">
          <h3>Cursor Tracking Area</h3>
          <p>Move your mouse around to see the tooltip follow your cursor</p>
        </div>

        <Teleport to="body">
          <div
            v-if="cursorContext.open.value"
            ref="cursorTooltip"
            :style="[
              cursorContext.floatingStyles.value,
              { transition: 'transform 0.1s ease-out' },
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
            </div>
          </div>
        </Teleport>
      </div>

      <div class="demo-info">
        <div class="info-section">
          <h4>useClientPoint Features</h4>
          <ul class="feature-list">
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
  context
)</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue"
import { useFloating, useClientPoint, useHover, flip, shift } from "v-float"

const trackingArea = useTemplateRef("trackingArea")
const cursorTooltip = useTemplateRef("cursorTooltip")


const cursorContext = useFloating(ref(null), cursorTooltip, {
  placement: "top-end",
  middlewares: [flip(), shift({ padding: 8 })],
})

useHover(cursorContext)


const { coordinates } = useClientPoint(trackingArea, cursorContext)
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


.tracking-area {
  background: var(--vp-c-bg-elv);
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 3rem;
  min-height: 400px;
  transition: border-color 0.3s ease;
}

.tracking-content {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2rem;
}

.tracking-content h3 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 1.5rem;
  font-weight: 600;
}

.tracking-content p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
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

.coordinate-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.coord-label {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.coord-value {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  font-weight: 600;
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
  .tracking-area {
    padding: 2rem;
    min-height: 300px;
  }
  
  .demo-info {
    grid-template-columns: 1fr;
  }
}
</style>
