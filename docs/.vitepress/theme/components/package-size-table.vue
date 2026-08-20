<script setup lang="ts">
import { data as packageSize } from "../../data/package-size.data";

interface Props {
  showDetails?: boolean;
}

withDefaults(defineProps<Props>(), {
  showDetails: false,
});
</script>

<template>
  <div class="package-size-badges">
    <span class="size-badge">
      <span class="badge-label">Minified</span>
      <span class="badge-value">{{ packageSize.minifiedFormatted }}</span>
    </span>

    <span class="size-badge is-highlight">
      <span class="badge-dot" />
      <span class="badge-label">Gzip</span>
      <span class="badge-value">{{ packageSize.gzipFormatted }}</span>
    </span>

    <span class="size-badge">
      <span class="badge-label">Brotli</span>
      <span class="badge-value">{{ packageSize.brotliFormatted }}</span>
    </span>
  </div>
</template>

<style scoped>
.package-size-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1.25rem 0;
}

.size-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.8125rem;
  line-height: 1.2;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.badge-label {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.badge-value {
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.size-badge.is-highlight {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.size-badge.is-highlight .badge-label {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.size-badge.is-highlight .badge-value {
  color: var(--vp-c-brand-1);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
}
</style>
