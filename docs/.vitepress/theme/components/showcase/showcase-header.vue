<script setup lang="ts">
import type { Placement } from "v-float";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { PresetType, ShowcasePresetMeta, ViewMode } from "./types";

interface Props {
  modelValue: PresetType;
  viewMode: ViewMode;
  presets: ShowcasePresetMeta[];
  placement: Placement;
  keepOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: PresetType): void;
  (e: "update:viewMode", value: ViewMode): void;
  (e: "update:placement", value: Placement): void;
  (e: "update:keepOpen", value: boolean): void;
}>();

// Preset Tabs Navigation Indicator
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

// ============================================================================
// Small & Non-flashy Placement Dropdown
// ============================================================================
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
useDismiss(placementContext);

function selectPlacementOption(val: Placement) {
  emit("update:placement", val);
  placementContext.setOpen(false);
}
</script>

<template>
  <div class="showcase-header">
    <!-- 1. Preset Navigation -->
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

    <!-- 2. Header Actions -->
    <div class="header-actions">
      <!-- Small Placement Dropdown -->
      <div v-if="viewMode === 'preview'" class="placement-control">
        <button
          ref="placementAnchorEl"
          type="button"
          class="placement-btn"
          :class="{ 'is-open': placementContext.open.value }"
          aria-haspopup="listbox"
          :aria-expanded="placementContext.open.value"
          title="Placement alignment"
        >
          <span class="placement-btn__label">{{ currentPlacementLabel }}</span>
          <svg
            class="placement-btn__chevron"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
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
            <Transition name="dropdown-pop" appear>
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
                  >
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                </button>
              </div>
            </Transition>
          </div>
        </Teleport>
      </div>

      <!-- Small Keep Open Toggle -->
      <button
        v-if="viewMode === 'preview'"
        type="button"
        class="action-btn"
        :class="{ 'is-active': keepOpen }"
        :title="keepOpen ? 'Disable keep open' : 'Keep open to inspect in devtools'"
        @click="emit('update:keepOpen', !keepOpen)"
      >
        <svg
          class="action-btn__icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
        <span>Keep open</span>
      </button>

      <!-- View Switch (Preview / Code) -->
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
  </div>
</template>

<style scoped>
.showcase-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

/* ============================================================================
   1. Preset Navigation
   ============================================================================ */
.preset-nav {
  position: relative;
  display: flex;
  gap: 0.2rem;
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
  padding: 0.35rem 0.65rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.82rem;
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
   2. Header Actions
   ============================================================================ */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* Small Placement Select Button */
.placement-control {
  position: relative;
}

.placement-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 28px;
  padding: 0 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.placement-btn:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}

.placement-btn.is-open {
  border-color: var(--vp-c-brand-1);
}

.placement-btn__chevron {
  width: 10px;
  height: 10px;
  color: var(--vp-c-text-3);
  transition: transform 0.18s ease;
}

.placement-btn.is-open .placement-btn__chevron {
  transform: rotate(180deg);
  color: var(--vp-c-brand-1);
}

/* Small Action Button (Keep Open) */
.action-btn {
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
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.action-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.action-btn.is-active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.action-btn__icon {
  width: 12px;
  height: 12px;
}

/* View Switch */
.view-switch {
  position: relative;
  display: flex;
  width: 156px;
  height: 28px;
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
  gap: 0.3rem;
  padding: 0 0.4rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.76rem;
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

.view-switch__btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.view-switch__icon {
  width: 12px;
  height: 12px;
  opacity: 0.85;
  flex-shrink: 0;
}

.view-switch__btn.is-active .view-switch__icon {
  opacity: 1;
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .showcase-header {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
    gap: 0.45rem;
  }

  .header-actions {
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
  padding: 4px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3, 0 8px 24px rgba(0, 0, 0, 0.12));
  display: flex;
  flex-direction: column;
  gap: 2px;
  transform-origin: top left;
}

.placement-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.35rem 0.55rem;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base, sans-serif);
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.12s ease;
}

.placement-dropdown-item:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.placement-dropdown-item.is-active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.placement-dropdown-item .check-icon {
  width: 12px;
  height: 12px;
  color: var(--vp-c-brand-1);
}

.dropdown-pop-enter-active {
  transition:
    opacity 0.14s ease-out,
    transform 0.14s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-pop-leave-active {
  transition:
    opacity 0.1s ease-in,
    transform 0.1s ease-in;
}

.dropdown-pop-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}

.dropdown-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>

