<script setup lang="ts">
import type { Placement } from "v-float";
import { useClick, useEscapeKey, useFloatingNode, useOutsideClick, usePosition } from "v-float";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { PresetType, ShowcasePresetMeta } from "./types";

interface Props {
  modelValue: PresetType;
  presets: ShowcasePresetMeta[];
  placement: Placement;
  keepOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: PresetType): void;
  (e: "update:placement", value: Placement): void;
  (e: "update:keepOpen", value: boolean): void;
}>();

// Tabs Indicator
const tabNavEl = ref<HTMLElement | null>(null);
const tabButtonRefs = ref<Record<string, HTMLElement | null>>({});
const isPositioned = ref(false);
const isAnimated = ref(false);

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
    isPositioned.value = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isAnimated.value = true;
      });
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

// Placement Control
interface PlacementOption {
  value: Placement;
  label: string;
}

const placementOptions: PlacementOption[] = [
  { value: "top", label: "Top" },
  { value: "top-start", label: "Top Start" },
  { value: "top-end", label: "Top End" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom-start", label: "Bottom Start" },
  { value: "bottom-end", label: "Bottom End" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const currentPlacementLabel = computed(() => {
  const item = placementOptions.find((p) => p.value === props.placement);
  return item ? item.label : props.placement;
});

const hasPlacementControl = computed(() => ["tooltip", "menu"].includes(props.modelValue));
const hasKeepOpenControl = computed(() =>
  ["tooltip", "menu", "combobox", "selection"].includes(props.modelValue),
);

const placementAnchorEl = shallowRef<HTMLElement | null>(null);
const placementFloatingEl = shallowRef<HTMLElement | null>(null);

const placementContext = useFloatingNode({
  anchorEl: placementAnchorEl,
  floatingEl: placementFloatingEl,
});

const placementPosition = usePosition(placementContext, {
  placement: "bottom-start",
  strategy: "fixed",
  transform: true,
  middlewares: {
    offset: 4,
    flip: true,
    shift: true,
  },
});

useClick(placementContext);
useOutsideClick(placementContext);
useEscapeKey(placementContext);

function selectPlacementOption(val: Placement) {
  emit("update:placement", val);
  placementContext.open.value = false;
}
</script>

<template>
  <div class="showcase-header">
    <!-- Preset Navigation -->
    <div ref="tabNavEl" class="preset-nav" role="tablist" aria-label="Component examples">
      <div
        class="preset-tab-indicator"
        :class="{ 'is-positioned': isPositioned, 'is-animated': isAnimated }"
        :style="indicatorStyle"
      />

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

    <!-- Header Actions -->
    <div class="header-actions">
      <!-- Placement Selector -->
      <div v-show="hasPlacementControl" class="placement-control">
        <button
          ref="placementAnchorEl"
          type="button"
          class="control-btn"
          :class="{ 'is-open': placementContext.open.value }"
          aria-haspopup="listbox"
          :aria-expanded="placementContext.open.value"
          title="Placement alignment"
        >
          <span class="control-btn__label">{{ currentPlacementLabel }}</span>
          <svg
            class="control-btn__chevron"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        <Teleport to="body">
          <div
            v-if="placementContext.open.value"
            ref="placementFloatingEl"
            class="placement-floating-wrapper"
            :style="[
              placementPosition.styles.value,
              { visibility: placementPosition.isPositioned.value ? 'visible' : 'hidden' },
            ]"
          >
            <Transition name="dropdown-fade" appear>
              <div class="placement-dropdown-menu" role="listbox">
                <button
                  v-for="opt in placementOptions"
                  :key="opt.value"
                  type="button"
                  role="option"
                  :aria-selected="placement === opt.value"
                  class="placement-dropdown-item"
                  :class="{ 'is-active': placement === opt.value }"
                  @click="selectPlacementOption(opt.value)"
                >
                  <span>{{ opt.label }}</span>
                  <svg
                    v-if="placement === opt.value"
                    class="check-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                </button>
              </div>
            </Transition>
          </div>
        </Teleport>
      </div>

      <!-- Keep Open Toggle -->
      <button
        v-if="hasKeepOpenControl"
        type="button"
        class="control-btn"
        :class="{ 'is-active': keepOpen }"
        :title="keepOpen ? 'Dismiss keep open' : 'Keep floating UI open'"
        :aria-pressed="keepOpen"
        @click="emit('update:keepOpen', !keepOpen)"
      >
        <svg
          class="control-btn__icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 2.5h7l-.5 4.5 2 2v1h-4.5v4.5l-.5.5-.5-.5V10H3v-1l2-2-.5-4.5z" />
        </svg>
        <span class="control-btn__label">Keep open</span>
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
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
}

/* 1. Preset Navigation */
.preset-nav {
  position: relative;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
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
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  pointer-events: none;
  z-index: 1;
  opacity: 0;
}

.preset-tab-indicator.is-positioned {
  opacity: 1;
}

.preset-tab-indicator.is-animated {
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.preset-tab {
  position: relative;
  z-index: 2;
  padding: 0.35rem 0.65rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  touch-action: manipulation;
  outline: none;
  transition: color 0.15s ease;
}

.preset-tab:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: -2px;
}

.preset-tab:hover {
  color: var(--vp-c-text-1);
}

.preset-tab.is-active {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.preset-nav:not(:has(.preset-tab-indicator.is-positioned)) .preset-tab.is-active {
  background: var(--vp-c-bg-elv);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 2. Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.placement-control {
  position: relative;
}

.control-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 28px;
  padding: 0 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.control-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.control-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.control-btn.is-open {
  border-color: var(--vp-c-text-2);
  color: var(--vp-c-text-1);
}

.control-btn.is-active {
  border-color: var(--vp-c-brand-text, #18794e);
  background: var(--vp-c-brand-soft, rgba(16, 185, 129, 0.12));
  color: var(--vp-c-brand-text, #18794e);
}

.control-btn__chevron {
  width: 9px;
  height: 9px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease;
}

.control-btn.is-open .control-btn__chevron {
  transform: rotate(180deg);
  color: var(--vp-c-text-1);
}

.control-btn__icon {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .showcase-header {
    flex-direction: column;
    align-items: stretch;
    padding: 0.45rem;
    gap: 0.45rem;
  }

  .preset-nav {
    width: 100%;
  }

  .preset-tab {
    flex: 1 0 auto;
    text-align: center;
    padding: 0.35rem 0.5rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

<style>
/* Dropdown Positioning & Menu (Teleported) */
.placement-floating-wrapper {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  pointer-events: auto;
}

.placement-dropdown-menu {
  width: 140px;
  padding: 3px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.placement-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 28px;
  padding: 0.3rem 0.55rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base, sans-serif);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
}

.placement-dropdown-item:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: -1px;
}

.placement-dropdown-item:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.placement-dropdown-item.is-active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-text, #18794e);
  font-weight: 600;
}

.placement-dropdown-item .check-icon {
  width: 11px;
  height: 11px;
  color: var(--vp-c-brand-text, #18794e);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
</style>
