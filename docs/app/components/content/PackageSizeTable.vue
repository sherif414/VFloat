<script setup lang="ts">
interface Props {
  showDetails?: boolean;
}

withDefaults(defineProps<Props>(), {
  showDetails: false,
});

const config = useRuntimeConfig();
const packageSize = (config.public.packageSize ?? {
  version: "0.14.0",
  rawFormatted: "N/A",
  minifiedFormatted: "N/A",
  gzipFormatted: "~14.7 kB",
  brotliFormatted: "~13.2 kB",
}) as {
  version: string;
  rawFormatted: string;
  minifiedFormatted: string;
  gzipFormatted: string;
  brotliFormatted: string;
};
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

<style>
.package-size-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1.25rem 0;
}

.package-size-badges .size-badge {
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

.package-size-badges .badge-label {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.package-size-badges .badge-value {
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.package-size-badges .size-badge.is-highlight {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.package-size-badges .size-badge.is-highlight .badge-label {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.package-size-badges .size-badge.is-highlight .badge-value {
  color: var(--vp-c-brand-1);
}

.package-size-badges .badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
}
</style>
