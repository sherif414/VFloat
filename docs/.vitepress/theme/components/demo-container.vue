<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots } from "vue";

interface Props {
  title?: string;
  desc?: string;
  src?: string;
  github?: string;
  type?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  desc: "",
  src: "",
  github: "",
  type: "vue",
});

const slots = useSlots();
const activeView = ref<"preview" | "code">("preview");
const codePanelEl = ref<HTMLElement | null>(null);
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const hasTypescript = computed(() => Boolean(slots["md:typescript"]));
const hasJavascript = computed(() => Boolean(slots["md:javascript"]));
const hasCode = computed(() => hasTypescript.value || hasJavascript.value);

async function copyCode() {
  if (copied.value || typeof navigator === "undefined" || !navigator.clipboard) return;

  const code = codePanelEl.value?.querySelector("code")?.textContent?.trim();
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
  } catch {
    copied.value = false;
  }

  if (copyTimer !== undefined) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
  }, 1800);
}

onBeforeUnmount(() => {
  if (copyTimer !== undefined) {
    clearTimeout(copyTimer);
  }
});
</script>

<template>
  <div class="demo-card">
    <!-- 1. Unified Header -->
    <div class="demo-header">
      <div class="demo-header__left">
        <span class="demo-title">{{ props.title || "Interactive Demo" }}</span>
      </div>

      <div class="demo-header__actions">
        <!-- View Switch (Preview / Code) -->
        <div v-if="hasCode" class="view-switch" role="tablist" aria-label="View mode">
          <div class="view-switch-indicator" :class="{ 'is-code': activeView === 'code' }" />
          <button
            type="button"
            role="tab"
            class="view-switch__btn"
            :class="{ 'is-active': activeView === 'preview' }"
            :aria-selected="activeView === 'preview'"
            @click="activeView = 'preview'"
          >
            <svg
              class="view-switch__icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
            <span>Preview</span>
          </button>
          <button
            type="button"
            role="tab"
            class="view-switch__btn"
            :class="{ 'is-active': activeView === 'code' }"
            :aria-selected="activeView === 'code'"
            @click="activeView = 'code'"
          >
            <svg
              class="view-switch__icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="5.5 4.5 2 8 5.5 11.5" />
              <polyline points="10.5 4.5 14 8 10.5 11.5" />
            </svg>
            <span>Code</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Main Workspace -->
    <div class="demo-body">
      <Transition name="view-fade" mode="out-in">
        <!-- Preview Stage (Sandbox) -->
        <div
          v-if="!hasCode || activeView === 'preview'"
          key="preview"
          class="demo-sandbox"
          role="tabpanel"
        >
          <slot />
        </div>

        <!-- Code View Panel with Fixed Top-Right Icon Copy Button -->
        <div
          v-else-if="activeView === 'code'"
          key="code"
          ref="codePanelEl"
          class="code-view"
          role="tabpanel"
        >
          <button
            type="button"
            class="code-copy-btn"
            :class="{ 'is-copied': copied }"
            :disabled="copied"
            :title="copied ? 'Copied!' : 'Copy code'"
            :aria-label="copied ? 'Copied!' : 'Copy code'"
            @click="copyCode"
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

          <div class="code-view__content">
            <slot v-if="hasTypescript" name="md:typescript" />
            <slot v-else-if="hasJavascript" name="md:javascript" />
            <slot v-else />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
.demo-card {
  margin: 1.5rem 0 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-2, 0 4px 20px rgba(0, 0, 0, 0.04));
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.demo-header__left {
  display: inline-flex;
  align-items: center;
}

.demo-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.01em;
}

.demo-header__actions {
  display: inline-flex;
  align-items: center;
}

/* ============================================================================
   View Switch & Micro-Sliding Highlight
   ============================================================================ */
.view-switch {
  position: relative;
  display: flex;
  width: 168px;
  background: var(--vp-c-bg-alt);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}

.view-switch-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(50% - 2px);
  height: calc(100% - 4px);
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-1, 0 1px 3px rgba(0, 0, 0, 0.08));
  pointer-events: none;
  z-index: 1;
  transform: translateX(0);
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-switch-indicator.is-code {
  transform: translateX(100%);
}

.view-switch__btn {
  position: relative;
  z-index: 2;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.28rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  outline: none;
  touch-action: manipulation;
  transition: color 0.18s ease;
}

.view-switch__btn:hover {
  color: var(--vp-c-text-1);
}

.view-switch__btn.is-active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.view-switch__btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.view-switch__icon {
  width: 13px;
  height: 13px;
  opacity: 0.85;
  flex-shrink: 0;
}

.view-switch__btn.is-active .view-switch__icon {
  opacity: 1;
  color: var(--vp-c-brand-1);
}

/* ============================================================================
   Main Stage & Preview Sandbox
   ============================================================================ */
.demo-body {
  position: relative;
  min-height: 240px;
  background: var(--vp-c-bg);
}

.view-fade-enter-active {
  transition:
    opacity 0.16s ease-out,
    transform 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-fade-leave-active {
  transition:
    opacity 0.1s ease-in,
    transform 0.1s ease-in;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(2px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

.demo-sandbox {
  position: relative;
  min-height: 240px;
  height: clamp(16rem, 45vh, 22rem);
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--vp-c-bg-alt);
  padding: 1.5rem 1rem;
}

/* ============================================================================
   Code View Panel & Floating Top-Right Copy Button
   ============================================================================ */
.code-view {
  position: relative;
  height: clamp(16rem, 45vh, 22rem);
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

.code-view__content {
  margin: 0;
  padding: 0;
  height: 100%;
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--vp-c-text-1);
}

.code-view__content :deep(div[class*="language-"]) {
  position: relative;
  z-index: 0;
  margin: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  height: 100%;
}

.code-view__content :deep(pre) {
  position: relative;
  z-index: 0;
  height: 100%;
  margin: 0 !important;
  padding: 1rem 4.5rem 1rem 1.25rem !important;
  box-sizing: border-box;
  overflow: auto;
  max-height: none;
  background: transparent !important;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.55;
}

.code-view__content :deep(pre code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  background: transparent;
  padding: 0;
}

@media (max-width: 768px) {
  .demo-header {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }
}

@media (max-width: 640px) {
  .demo-card {
    margin: 1rem 0 1.5rem;
    border-radius: 10px;
  }

  .demo-body {
    min-height: 200px;
  }

  .demo-sandbox,
  .code-view {
    height: 300px;
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

  .code-view__content :deep(pre) {
    padding: 0.75rem 3.5rem 0.75rem 0.85rem !important;
    font-size: 0.76rem;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
