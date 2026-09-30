<script setup lang="ts">
import type { Placement } from "v-float";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import PresetCombobox from "../showcase/preset-combobox.vue";
import PresetDialog from "../showcase/preset-dialog.vue";
import PresetMenu from "../showcase/preset-menu.vue";
import PresetSelection from "../showcase/preset-selection.vue";
import PresetTooltip from "../showcase/preset-tooltip.vue";
import ShowcaseHeader from "../showcase/showcase-header.vue";
import type { PresetType, ShowcasePresetMeta } from "../showcase/types";
import { useShowcaseDrag } from "../showcase/use-showcase-drag";

const activePreset = ref<PresetType>("tooltip");

const selectedPlacement = ref<Placement>("top");
const keepOpen = ref<boolean>(false);

const presets: ShowcasePresetMeta[] = [
  { id: "tooltip", label: "Tooltip", description: "Hover & collision physics" },
  { id: "menu", label: "Menu", description: "Submenu & safe polygon" },
  { id: "combobox", label: "Combobox", description: "Search & virtual focus" },
  { id: "selection", label: "Selection", description: "Dynamic virtual anchor" },
  { id: "dialog", label: "Dialog", description: "Modal focus trap & overlay" },
];

const sandboxEl = shallowRef<HTMLElement | null>(null);

const { anchorOffset, isDragging, onAnchorPointerDown, resetAnchorPosition } = useShowcaseDrag();

const tooltipPresetRef = shallowRef<InstanceType<typeof PresetTooltip> | null>(null);
const menuPresetRef = shallowRef<InstanceType<typeof PresetMenu> | null>(null);
const comboboxPresetRef = shallowRef<InstanceType<typeof PresetCombobox> | null>(null);
const selectionPresetRef = shallowRef<InstanceType<typeof PresetSelection> | null>(null);
const dialogPresetRef = shallowRef<InstanceType<typeof PresetDialog> | null>(null);

function getActivePresetInstance() {
  switch (activePreset.value) {
    case "tooltip":
      return tooltipPresetRef.value;
    case "menu":
      return menuPresetRef.value;
    case "combobox":
      return comboboxPresetRef.value;
    case "selection":
      return selectionPresetRef.value;
    case "dialog":
      return dialogPresetRef.value;
    default:
      return null;
  }
}

function handlePointerDown(e: PointerEvent) {
  const activeInstance = getActivePresetInstance();
  onAnchorPointerDown(e, sandboxEl.value, () => {
    void activeInstance?.update();
  });
}

function handleResetPosition() {
  const activeInstance = getActivePresetInstance();
  resetAnchorPosition(() => {
    void activeInstance?.update();
  });
}

function getDefaultPlacement(preset: PresetType): Placement {
  switch (preset) {
    case "menu":
      return "bottom-start";
    default:
      return "top";
  }
}

function handleResetDemo() {
  selectedPlacement.value = getDefaultPlacement(activePreset.value);
  keepOpen.value = false;
  handleResetPosition();
}

const isModified = computed(() => {
  const hasOffset =
    (activePreset.value === "tooltip" || activePreset.value === "menu") &&
    (anchorOffset.value.x !== 0 || anchorOffset.value.y !== 0);
  const hasCustomPlacement = selectedPlacement.value !== getDefaultPlacement(activePreset.value);
  const isKeepOpen = keepOpen.value;
  return hasOffset || hasCustomPlacement || isKeepOpen;
});

function onSwitchPreset(preset: PresetType) {
  activePreset.value = preset;
  handleResetDemo();
}

onMounted(() => {
  void nextTick(() => {
    void getActivePresetInstance()?.update();
  });
});
</script>

<template>
  <div class="home-showcase-section">
    <div class="showcase-card">
      <!-- 1. Header Navigation -->
      <ShowcaseHeader
        :model-value="activePreset"
        :presets="presets"
        :placement="selectedPlacement"
        :keep-open="keepOpen"
        @update:model-value="onSwitchPreset"
        @update:placement="selectedPlacement = $event"
        @update:keep-open="keepOpen = $event"
      />

      <!-- 2. Main Workspace -->
      <div class="showcase-body">
        <div ref="sandboxEl" :class="['sandbox', `sandbox--${activePreset}`]">
          <!-- Interactive Components -->
          <PresetTooltip
            v-if="activePreset === 'tooltip'"
            ref="tooltipPresetRef"
            :placement="selectedPlacement"
            :anchor-offset="anchorOffset"
            :is-dragging="isDragging"
            :keep-open="keepOpen"
            @pointerdown="handlePointerDown"
          />

          <PresetMenu
            v-if="activePreset === 'menu'"
            ref="menuPresetRef"
            :placement="selectedPlacement"
            :anchor-offset="anchorOffset"
            :is-dragging="isDragging"
            :keep-open="keepOpen"
            @pointerdown="handlePointerDown"
          />

          <PresetCombobox
            v-if="activePreset === 'combobox'"
            ref="comboboxPresetRef"
            :keep-open="keepOpen"
          />

          <PresetSelection
            v-if="activePreset === 'selection'"
            ref="selectionPresetRef"
            :keep-open="keepOpen"
          />

          <PresetDialog v-if="activePreset === 'dialog'" ref="dialogPresetRef" />

          <!-- Minimal Footer Instructions & Reset -->
          <div class="sandbox-footer">
            <div class="sandbox-caption">
              <template v-if="activePreset === 'tooltip'">
                <span>Hover or drag anchor to test collision flipping</span>
              </template>
              <template v-else-if="activePreset === 'menu'">
                <span
                  >Click or use <kbd>↑</kbd><kbd>↓</kbd> to navigate · Drag to test boundary
                  collisions</span
                >
              </template>
              <template v-else-if="activePreset === 'combobox'">
                <span>Type to search · Use <kbd>↑</kbd><kbd>↓</kbd> for virtual focus</span>
              </template>
              <template v-else-if="activePreset === 'selection'">
                <span>Select text within the card to summon the floating toolbar</span>
              </template>
              <template v-else-if="activePreset === 'dialog'">
                <span>Open modal dialog with isolated focus trapping</span>
              </template>
            </div>

            <!-- Reset Button -->
            <button
              v-if="isModified"
              type="button"
              class="reset-btn"
              title="Reset position and settings"
              aria-label="Reset position and settings"
              @click="handleResetDemo"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 2.5v4h4" />
                <path d="M2.8 10a6 6 0 1 0 1.4-6.3L2.5 6.5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showcase-card {
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

.showcase-body {
  position: relative;
  min-height: 480px;
  background: var(--vp-c-bg-soft);
}

.sandbox {
  position: relative;
  height: 480px;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--vp-c-bg-soft);
}

.sandbox::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, var(--vp-c-divider) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: center center;
  mask-image: radial-gradient(ellipse 75% 70% at 50% 50%, #000 30%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 75% 70% at 50% 50%, #000 30%, transparent 85%);
  opacity: 0.7;
  pointer-events: none;
}

.sandbox--combobox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 3.5rem;
}

.sandbox--menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 4.5rem;
}

.sandbox-footer {
  position: absolute;
  bottom: 0.75rem;
  left: 0.85rem;
  right: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.sandbox-caption {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  text-wrap: balance;
}

.sandbox-caption kbd {
  display: inline-block;
  padding: 0.05rem 0.25rem;
  font-size: 0.6875rem;
  font-family: var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  color: var(--vp-c-text-2);
  margin: 0 0.15rem;
}

.reset-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  outline: none;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.reset-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.reset-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.reset-btn svg {
  width: 11px;
  height: 11px;
}

@media (max-width: 640px) {
  .showcase-body {
    min-height: 420px;
  }

  .sandbox {
    height: 420px;
  }

  .sandbox--combobox {
    padding-top: 2rem;
  }

  .sandbox--menu {
    padding-top: 2.5rem;
  }

  .sandbox-footer {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    text-align: center;
    bottom: 0.5rem;
  }
}
</style>
