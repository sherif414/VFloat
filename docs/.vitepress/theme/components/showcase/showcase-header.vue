<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PresetType, ShowcasePresetMeta, ViewMode } from "./types";

interface Props {
  modelValue: PresetType;
  viewMode: ViewMode;
  presets: ShowcasePresetMeta[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: PresetType): void;
  (e: "update:viewMode", value: ViewMode): void;
}>();

const tabNavEl = ref<HTMLElement | null>(null);
const tabButtonRefs = ref<Record<string, HTMLElement | null>>({});
const isReady = ref(false);

const indicatorStyle = ref<{
  transform: string;
  width: string;
}>({
  transform: "translateX(0px)",
  width: "0px",
});

function updateIndicator() {
  const container = tabNavEl.value;
  const currentBtn = tabButtonRefs.value[props.modelValue];
  if (!container || !currentBtn) return;

  const left = currentBtn.offsetLeft;
  const width = currentBtn.offsetWidth;

  indicatorStyle.value = {
    transform: `translateX(${left}px)`,
    width: `${width}px`,
  };
}

function scrollActiveTabIntoView() {
  const currentBtn = tabButtonRefs.value[props.modelValue];
  if (!currentBtn) return;
  currentBtn.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

watch(
  () => props.modelValue,
  () => {
    void nextTick(() => {
      updateIndicator();
      scrollActiveTabIntoView();
    });
  },
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  void nextTick(() => {
    updateIndicator();

    requestAnimationFrame(() => {
      isReady.value = true;
    });

    if (typeof ResizeObserver !== "undefined" && tabNavEl.value) {
      resizeObserver = new ResizeObserver(() => {
        updateIndicator();
      });
      resizeObserver.observe(tabNavEl.value);
    }
  });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

function onSelectPreset(preset: PresetType) {
  emit("update:modelValue", preset);
}

function onSelectView(mode: ViewMode) {
  emit("update:viewMode", mode);
}
</script>

<template>
  <div class="showcase-header">
    <!-- Preset Navigation with Sliding Indicator Pill -->
    <div ref="tabNavEl" class="preset-nav" role="tablist" aria-label="Component examples">
      <div class="preset-tab-indicator" :class="{ 'is-ready': isReady }" :style="indicatorStyle" />

      <button
        v-for="p in presets"
        :key="p.id"
        :ref="
          (el) => {
            tabButtonRefs[p.id] = el as HTMLElement | null;
          }
        "
        type="button"
        role="tab"
        class="preset-tab"
        :class="{ 'is-active': modelValue === p.id }"
        :aria-selected="modelValue === p.id"
        @click="onSelectPreset(p.id)"
      >
        <span class="preset-tab__label">{{ p.label }}</span>
      </button>
    </div>

    <!-- View Switch (Preview / Code) with Icons & Smooth Sliding Highlight -->
    <div class="view-switch" role="tablist" aria-label="View mode">
      <div class="view-switch-indicator" :class="{ 'is-code': viewMode === 'code' }" />
      <button
        type="button"
        role="tab"
        class="view-switch__btn"
        :class="{ 'is-active': viewMode === 'preview' }"
        :aria-selected="viewMode === 'preview'"
        @click="onSelectView('preview')"
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
        :class="{ 'is-active': viewMode === 'code' }"
        :aria-selected="viewMode === 'code'"
        @click="onSelectView('code')"
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
</template>

<style scoped>
.showcase-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

/* ============================================================================
   Preset Navigation & Sliding Indicator
   ============================================================================ */
.preset-nav {
  position: relative;
  display: flex;
  gap: 0.25rem;
  padding: 2px;
  border-radius: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.preset-nav::-webkit-scrollbar {
  display: none;
}

.preset-tab-indicator {
  position: absolute;
  top: 2px;
  left: 0;
  height: calc(100% - 4px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-1, 0 1px 3px rgba(0, 0, 0, 0.08));
  pointer-events: none;
  z-index: 1;
  opacity: 0;
}

.preset-tab-indicator.is-ready {
  opacity: 1;
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.15s ease;
}

.preset-tab {
  position: relative;
  z-index: 2;
  padding: 0.4rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  touch-action: manipulation;
  transition: color 0.18s ease;
}

.preset-tab:hover {
  color: var(--vp-c-text-1);
}

.preset-tab.is-active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

/* ============================================================================
   View Switch & Micro-Sliding Highlight
   ============================================================================ */
.view-switch {
  position: relative;
  display: flex;
  width: 172px;
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
  padding: 0.28rem 0.55rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
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

.view-switch__icon {
  width: 13px;
  height: 13px;
  opacity: 0.85;
}

.view-switch__btn.is-active .view-switch__icon {
  opacity: 1;
  color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .showcase-header {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .view-switch {
    width: 100%;
    max-width: 280px;
    align-self: center;
  }

  .preset-tab {
    font-size: 0.8rem;
    padding: 0.35rem 0.65rem;
  }
}
</style>
