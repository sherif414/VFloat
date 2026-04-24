<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots } from "vue";

const slots = useSlots();
const activeTab = ref<"demo" | "code">("demo");
const codePanelEl = ref<HTMLElement | null>(null);
const copyLabel = ref("Copy");
let copyTimer: number | undefined;
const hasTypescript = computed(() => Boolean(slots["md:typescript"]));
const hasJavascript = computed(() => Boolean(slots["md:javascript"]));
const hasCode = computed(() => hasTypescript.value || hasJavascript.value);

function resetCopyLabel() {
  if (copyTimer !== undefined) {
    window.clearTimeout(copyTimer);
  }

  copyTimer = window.setTimeout(() => {
    copyLabel.value = "Copy";
  }, 1500);
}

async function copyCode() {
  const code = codePanelEl.value?.querySelector("code")?.textContent?.trim();

  if (!code) {
    copyLabel.value = "No code";
    resetCopyLabel();
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    copyLabel.value = "Copied";
  } catch {
    copyLabel.value = "Failed";
  }

  resetCopyLabel();
}

onBeforeUnmount(() => {
  if (copyTimer !== undefined) {
    window.clearTimeout(copyTimer);
  }
});
</script>

<template>
  <section class="vf-demo">
    <div v-if="hasCode" class="vf-demo__tabs" role="tablist" aria-label="Demo tabs">
      <button
        class="vf-demo__tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'demo'"
        :class="{ 'is-active': activeTab === 'demo' }"
        @click="activeTab = 'demo'"
      >
        Demo
      </button>
      <button
        class="vf-demo__tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'code'"
        :class="{ 'is-active': activeTab === 'code' }"
        @click="activeTab = 'code'"
      >
        Code
      </button>
    </div>

    <div class="vf-demo__panel">
      <div v-if="!hasCode || activeTab === 'demo'" class="vf-demo__preview" role="tabpanel">
        <slot />
      </div>

      <div v-else ref="codePanelEl" class="vf-demo__code" role="tabpanel">
        <button class="vf-demo__copy" type="button" @click="copyCode">
          {{ copyLabel }}
        </button>
        <slot v-if="hasTypescript" name="md:typescript" />
        <slot v-else name="md:javascript" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.vf-demo {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.vf-demo__tabs {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
}

.vf-demo__tab {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.vf-demo__tab:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.vf-demo__tab.is-active {
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.vf-demo__tab:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.vf-demo__panel {
  height: clamp(18rem, 55vh, 24rem);
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.vf-demo__preview {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 1rem;
  background: var(--vp-c-bg);
}

.vf-demo__code {
  position: relative;
  isolation: isolate;
  height: 100%;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.vf-demo__copy {
  position: absolute;
  top: 0.65rem;
  right: 1.5rem;
  z-index: 3;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background-color: var(--vp-c-bg-elv);
  background-image: none;
  opacity: 1;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.vf-demo__copy:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
}

.vf-demo__copy:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.vf-demo__code :deep(div[class*="language-"]) {
  position: relative;
  z-index: 0;
  margin: 0;
  border-radius: 0;
  background: transparent;
  height: 100%;
}

.vf-demo__code :deep(pre) {
  position: relative;
  z-index: 0;
  height: 100%;
  overflow: auto;
  max-height: none;
}
</style>
