<script setup lang="ts">
import { ref } from "vue";
import type { PresetType } from "./types";

interface Props {
  code: string;
  activePreset: PresetType;
}

const props = defineProps<Props>();

const copyButtonText = ref("Copy code");
let copyTimer: ReturnType<typeof setTimeout> | undefined;

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
</script>

<template>
  <div class="code-view">
    <div class="code-view__bar">
      <span class="code-view__tag">{{ activePreset.toUpperCase() }} COMPONENT</span>
      <button type="button" class="code-copy-btn" @click="copySnippet">
        {{ copyButtonText }}
      </button>
    </div>
    <pre class="code-view__content"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code-view {
  position: relative;
  height: 380px;
  display: flex;
  flex-direction: column;
  background: #161618;
}

.code-view__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: #121214;
}

.code-view__tag {
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: rgba(255, 255, 255, 0.45);
}

.code-copy-btn {
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.12s ease;
}

.code-copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.code-view__content {
  margin: 0;
  padding: 0.85rem 1rem;
  height: 100%;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.5;
  color: #d1d5db;
}

.code-view__content code {
  color: inherit;
  background: transparent;
  padding: 0;
}
</style>
