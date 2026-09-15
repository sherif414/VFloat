<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { highlightShowcaseCode } from "./highlighter";
import type { PresetType } from "./types";

interface Props {
  code: string;
  activePreset: PresetType;
}

const props = defineProps<Props>();

const copied = ref(false);
const highlightedHtml = ref<string>("");
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let currentHighlightId = 0;

async function copySnippet() {
  if (copied.value || typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
  } catch {
    copied.value = false;
  }

  if (copyTimer !== undefined) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
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
  if (copyTimer !== undefined) clearTimeout(copyTimer);
});
</script>

<template>
  <div class="showcase-code-view">
    <button
      type="button"
      class="code-copy-btn"
      :class="{ 'is-copied': copied }"
      :disabled="copied"
      :title="copied ? 'Copied!' : 'Copy code'"
      :aria-label="copied ? 'Copied!' : 'Copy code'"
      @click="copySnippet"
    >
      <svg
        v-if="copied"
        class="copy-icon is-check"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
      <svg
        v-else
        class="copy-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
        <path d="M3.5 10.5V3.5A1.5 1.5 0 0 1 5 2h5.5" />
      </svg>
    </button>

    <div
      v-if="highlightedHtml"
      class="showcase-code-view__content is-highlighted"
      v-html="highlightedHtml"
    />
    <pre v-else class="showcase-code-view__content"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.showcase-code-view {
  position: relative;
  height: 380px;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  transition: background-color 0.2s ease;
}

.code-copy-btn {
  position: absolute;
  top: 0.85rem;
  right: 1.5rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  box-shadow: var(--vp-shadow-1, 0 1px 3px rgba(0, 0, 0, 0.08));
  transition: all 0.15s ease;
}

.code-copy-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.code-copy-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.code-copy-btn.is-copied,
.code-copy-btn:disabled {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  cursor: default;
  pointer-events: none;
}

.copy-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.copy-icon.is-check {
  color: var(--vp-c-brand-1);
  stroke: var(--vp-c-brand-1);
}

.showcase-code-view__content {
  margin: 0;
  padding: 1rem 4.5rem 1rem 1.25rem;
  height: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--vp-c-text-1);
}

.showcase-code-view__content code {
  display: block;
  width: fit-content;
  min-width: 100%;
  background: transparent;
  padding: 0;
}

.showcase-code-view__content.is-highlighted {
  padding: 0;
}

/* ============================================================================
   Shiki Syntax Highlighting & Token Theming
   ============================================================================ */
.showcase-code-view :deep(pre.shiki) {
  margin: 0;
  padding: 1rem 4.5rem 1rem 1.25rem;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
  background: transparent !important;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--shiki-light, var(--vp-c-text-1));
}

.showcase-code-view :deep(pre.shiki code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  background: transparent;
  padding: 0;
}

.showcase-code-view :deep(.shiki-themes),
.showcase-code-view :deep(.shiki-themes span) {
  color: var(--shiki-light);
  font-style: var(--shiki-light-font-style, inherit);
  font-weight: var(--shiki-light-font-weight, inherit);
  text-decoration: var(--shiki-light-text-decoration, inherit);
}

:root.dark .showcase-code-view :deep(pre.shiki),
html.dark .showcase-code-view :deep(pre.shiki) {
  color: var(--shiki-dark, var(--vp-c-text-1));
}

:root.dark .showcase-code-view :deep(.shiki-themes),
:root.dark .showcase-code-view :deep(.shiki-themes span),
html.dark .showcase-code-view :deep(.shiki-themes),
html.dark .showcase-code-view :deep(.shiki-themes span) {
  color: var(--shiki-dark);
  font-style: var(--shiki-dark-font-style, inherit);
  font-weight: var(--shiki-dark-font-weight, inherit);
  text-decoration: var(--shiki-dark-text-decoration, inherit);
}

@media (max-width: 640px) {
  .showcase-code-view {
    height: 320px;
  }

  .code-copy-btn {
    top: 0.65rem;
    right: 1.15rem;
    width: 28px;
    height: 28px;
  }

  .copy-icon {
    width: 13px;
    height: 13px;
  }

  .showcase-code-view__content {
    padding: 0.75rem 3.5rem 0.75rem 0.85rem;
    font-size: 0.76rem;
    -webkit-overflow-scrolling: touch;
  }

  .showcase-code-view :deep(pre.shiki) {
    padding: 0.75rem 3.5rem 0.75rem 0.85rem;
    font-size: 0.76rem;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
