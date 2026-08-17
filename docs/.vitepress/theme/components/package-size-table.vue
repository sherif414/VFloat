<script setup lang="ts">
import { data as packageSize } from "../../data/package-size.data";

interface Props {
  showDetails?: boolean;
}

withDefaults(defineProps<Props>(), {
  showDetails: true,
});
</script>

<template>
  <div class="package-size-container">
    <div class="package-size-grid">
      <div class="package-size-card">
        <div class="card-label">Minified Bundle</div>
        <div class="card-value">{{ packageSize.minifiedFormatted }}</div>
        <div class="card-hint">
          Full ESM entry ({{ packageSize.minifiedBytes.toLocaleString() }} B)
        </div>
      </div>

      <div class="package-size-card highlight">
        <div class="card-label">Minified + Gzip</div>
        <div class="card-value">{{ packageSize.gzipFormatted }}</div>
        <div class="card-hint">
          Standard wire size ({{ packageSize.gzipBytes.toLocaleString() }} B)
        </div>
      </div>

      <div class="package-size-card">
        <div class="card-label">Minified + Brotli</div>
        <div class="card-value">{{ packageSize.brotliFormatted }}</div>
        <div class="card-hint">
          Modern compression ({{ packageSize.brotliBytes.toLocaleString() }} B)
        </div>
      </div>
    </div>

    <div v-if="showDetails" class="package-size-notes">
      <p>
        <strong>Tree-Shaking:</strong> VFloat is fully modular and tree-shakable. When you import
        only the composables you need (e.g. <code>useFloatingContext</code>,
        <code>usePosition</code>, and <code>useHover</code>), unused primitives and middlewares are
        stripped by your bundler at build time.
      </p>
    </div>
  </div>
</template>

<style scoped>
.package-size-container {
  margin: 1.5rem 0;
}

.package-size-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.package-size-card {
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, rgba(60, 60, 67, 0.12));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition:
    border-color 0.25s,
    transform 0.25s;
}

.package-size-card.highlight {
  border-color: var(--vp-c-brand, #3eaf7c);
  background-color: var(--vp-c-bg-soft-up, #f0fdf4);
}

:root.dark .package-size-card.highlight {
  background-color: rgba(62, 175, 124, 0.08);
}

.card-label {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2, #6b7280);
  margin-bottom: 0.25rem;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1, #1f2937);
  font-family: var(--vp-font-family-mono, monospace);
  line-height: 1.2;
}

.package-size-card.highlight .card-value {
  color: var(--vp-c-brand, #3eaf7c);
}

.card-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3, #9ca3af);
  margin-top: 0.35rem;
}

.package-size-notes {
  font-size: 0.9rem;
  color: var(--vp-c-text-2, #4b5563);
  line-height: 1.5;
}

.package-size-notes p {
  margin: 0;
}
</style>
