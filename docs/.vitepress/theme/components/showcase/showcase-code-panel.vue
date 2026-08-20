<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { highlightShowcaseCode } from "./highlighter";
import type { PresetType } from "./types";

interface Props {
  code: string;
  activePreset: PresetType;
}

const props = defineProps<Props>();

const copyButtonText = ref("Copy code");
const highlightedHtml = ref<string>("");
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let currentHighlightId = 0;

async function copySnippet() {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(props.code);
    copyButtonText.value = "Copied!";
  } catch {
    copyButtonText.value = "Failed";
  }

  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyButtonText.value = "Copy code";
  }, 1800);
}

async function updateHighlight(source: string) {
  const highlightId = ++currentHighlightId;
  try {
    const html = await highlightShowcaseCode(source);
    if (highlightId === currentHighlightId) {
      highlightedHtml.value = html;
    }
  } catch {
    if (highlightId === currentHighlightId) {
      highlightedHtml.value = "";
    }
  }
}

watch(
  () => props.code,
  (newCode) => {
    void updateHighlight(newCode);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<template>
  <div class="code-view">
    <div class="code-view__bar">
      <span class="code-view__tag">{{ activePreset.toUpperCase() }} COMPONENT</span>
      <button type="button" class="code-copy-btn" @click="copySnippet">
        {{ copyButtonText }}
      </button>
    </div>
    <div
      v-if="highlightedHtml"
      class="code-view__content is-highlighted"
      v-html="highlightedHtml"
    />
    <pre v-else class="code-view__content"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code-view {
  position: relative;
  height: 380px;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  transition: background-color 0.2s ease;
}

.code-view__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.code-view__tag {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
  text-transform: uppercase;
}

.code-copy-btn {
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.code-copy-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.code-view__content {
  margin: 0;
  padding: 0.85rem 1rem;
  height: 100%;
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--vp-c-text-1);
}

.code-view__content code {
  color: inherit;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
}

.code-view__content.is-highlighted {
  padding: 0;
}

/* ============================================================================
   Shiki Syntax Highlighting & Token Theming
   ============================================================================ */
.code-view :deep(pre.shiki) {
  margin: 0;
  padding: 0.85rem 1rem;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
  background: transparent !important;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--shiki-light, var(--vp-c-text-1));
}

.code-view :deep(pre.shiki code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  background: transparent;
  padding: 0;
}

.code-view :deep(.shiki-themes),
.code-view :deep(.shiki-themes span) {
  color: var(--shiki-light);
  font-style: var(--shiki-light-font-style, inherit);
  font-weight: var(--shiki-light-font-weight, inherit);
  text-decoration: var(--shiki-light-text-decoration, inherit);
}

:root.dark .code-view :deep(pre.shiki),
html.dark .code-view :deep(pre.shiki) {
  color: var(--shiki-dark, var(--vp-c-text-1));
}

:root.dark .code-view :deep(.shiki-themes),
:root.dark .code-view :deep(.shiki-themes span),
html.dark .code-view :deep(.shiki-themes),
html.dark .code-view :deep(.shiki-themes span) {
  color: var(--shiki-dark);
  font-style: var(--shiki-dark-font-style, inherit);
  font-weight: var(--shiki-dark-font-weight, inherit);
  text-decoration: var(--shiki-dark-text-decoration, inherit);
}

@media (max-width: 640px) {
  .code-view {
    height: 320px;
  }

  .code-view__bar {
    padding: 0.4rem 0.65rem;
  }

  .code-view__tag {
    font-size: 0.68rem;
  }

  .code-copy-btn {
    padding: 0.2rem 0.45rem;
    font-size: 0.72rem;
    touch-action: manipulation;
  }

  .code-view__content {
    padding: 0.6rem 0.75rem;
    font-size: 0.76rem;
    -webkit-overflow-scrolling: touch;
  }

  .code-view :deep(pre.shiki) {
    padding: 0.6rem 0.75rem;
    font-size: 0.76rem;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
