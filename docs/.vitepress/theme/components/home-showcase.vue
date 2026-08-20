<script setup lang="ts">
import type { Placement } from "v-float";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import { generateShowcaseCode } from "./showcase/code-generator";
import PresetCursor from "./showcase/preset-cursor.vue";
import PresetMenu from "./showcase/preset-menu.vue";
import PresetPopover from "./showcase/preset-popover.vue";
import PresetTooltip from "./showcase/preset-tooltip.vue";
import ShowcaseCodePanel from "./showcase/showcase-code-panel.vue";
import ShowcaseHeader from "./showcase/showcase-header.vue";
import ShowcaseToolbar from "./showcase/showcase-toolbar.vue";
import type { PresetType, ShowcasePresetMeta, ViewMode } from "./showcase/types";
import { useShowcaseDrag } from "./showcase/use-showcase-drag";

const activePreset = ref<PresetType>("tooltip");
const activeView = ref<ViewMode>("preview");

const selectedPlacement = ref<Placement>("top");
const offsetValue = ref<number>(8);
const enableFlip = ref<boolean>(true);
const enableShift = ref<boolean>(true);
const enableArrow = ref<boolean>(true);
const keepOpen = ref<boolean>(false);
const resolvedPlacement = ref<string>("top");

const presets: ShowcasePresetMeta[] = [
  { id: "tooltip", label: "Tooltip", description: "Hover & focus triggers" },
  { id: "popover", label: "Popover", description: "Click & modal dismissal" },
  { id: "menu", label: "Menu", description: "Keyboard list navigation" },
  { id: "cursor", label: "Virtual Anchor", description: "Cursor client point" },
];

const sandboxEl = shallowRef<HTMLElement | null>(null);

const { anchorOffset, isDragging, onAnchorPointerDown, resetAnchorPosition } = useShowcaseDrag();

const tooltipPresetRef = shallowRef<InstanceType<typeof PresetTooltip> | null>(null);
const popoverPresetRef = shallowRef<InstanceType<typeof PresetPopover> | null>(null);
const menuPresetRef = shallowRef<InstanceType<typeof PresetMenu> | null>(null);
const cursorPresetRef = shallowRef<InstanceType<typeof PresetCursor> | null>(null);

const middlewareConfig = computed(() => ({
  offset: offsetValue.value,
  flip: enableFlip.value ? { padding: 8 } : false,
  shift: enableShift.value ? { padding: 8 } : false,
}));

function getActivePresetInstance() {
  switch (activePreset.value) {
    case "tooltip":
      return tooltipPresetRef.value;
    case "popover":
      return popoverPresetRef.value;
    case "menu":
      return menuPresetRef.value;
    case "cursor":
      return cursorPresetRef.value;
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

function onSwitchPreset(preset: PresetType) {
  activePreset.value = preset;
  handleResetPosition();
}

function onResolvedPlacementUpdate(val: Placement) {
  resolvedPlacement.value = val;
}

const generatedCode = computed(() =>
  generateShowcaseCode({
    activePreset: activePreset.value,
    placement: selectedPlacement.value,
    offset: offsetValue.value,
    flip: enableFlip.value,
    shift: enableShift.value,
    arrow: enableArrow.value,
  }),
);

onMounted(() => {
  void nextTick(() => {
    void getActivePresetInstance()?.update();
  });
});
</script>

<template>
  <div class="showcase-card">
    <!-- 1. Header Navigation -->
    <ShowcaseHeader
      :model-value="activePreset"
      :view-mode="activeView"
      :presets="presets"
      @update:model-value="onSwitchPreset"
      @update:view-mode="activeView = $event"
    />

    <!-- 2. Controls Toolbar -->
    <ShowcaseToolbar
      v-model:placement="selectedPlacement"
      v-model:offset="offsetValue"
      v-model:flip="enableFlip"
      v-model:shift="enableShift"
      v-model:arrow="enableArrow"
      v-model:keep-open="keepOpen"
      :active-preset="activePreset"
      :resolved-placement="resolvedPlacement"
    />

    <!-- 3. Main Workspace -->
    <div class="showcase-body">
      <div
        v-show="activeView === 'preview'"
        ref="sandboxEl"
        class="sandbox"
        :class="{ 'is-cursor-mode': activePreset === 'cursor' }"
      >
        <!-- Caption Helper -->
        <div class="sandbox-caption">
          <template v-if="activePreset === 'tooltip'">
            Hover to open. Drag anchor to test collision flipping.
          </template>
          <template v-else-if="activePreset === 'popover'">
            Click to open card. Drag anchor near edges to observe placement adaptation.
          </template>
          <template v-else-if="activePreset === 'menu'">
            Click or press <kbd>↑</kbd> <kbd>↓</kbd> to navigate items.
          </template>
          <template v-else> Move your cursor across this area to track coordinates. </template>
        </div>

        <!-- Reset Button -->
        <button
          v-if="activePreset !== 'cursor' && (anchorOffset.x !== 0 || anchorOffset.y !== 0)"
          type="button"
          class="reset-position-btn"
          @click="handleResetPosition"
        >
          Reset anchor
        </button>

        <!-- Tooltip Preset -->
        <PresetTooltip
          v-if="activePreset === 'tooltip'"
          ref="tooltipPresetRef"
          :placement="selectedPlacement"
          :middleware-config="middlewareConfig"
          :enable-arrow="enableArrow"
          :anchor-offset="anchorOffset"
          :is-dragging="isDragging"
          :is-active="activePreset === 'tooltip'"
          :keep-open="keepOpen"
          @pointerdown="handlePointerDown"
          @update:resolved-placement="onResolvedPlacementUpdate"
        />

        <!-- Popover Preset -->
        <PresetPopover
          v-if="activePreset === 'popover'"
          ref="popoverPresetRef"
          :placement="selectedPlacement"
          :middleware-config="middlewareConfig"
          :enable-arrow="enableArrow"
          :anchor-offset="anchorOffset"
          :is-dragging="isDragging"
          :is-active="activePreset === 'popover'"
          :keep-open="keepOpen"
          @pointerdown="handlePointerDown"
          @update:resolved-placement="onResolvedPlacementUpdate"
        />

        <!-- Menu Preset -->
        <PresetMenu
          v-if="activePreset === 'menu'"
          ref="menuPresetRef"
          :placement="selectedPlacement"
          :middleware-config="middlewareConfig"
          :enable-arrow="enableArrow"
          :anchor-offset="anchorOffset"
          :is-dragging="isDragging"
          :is-active="activePreset === 'menu'"
          :keep-open="keepOpen"
          @pointerdown="handlePointerDown"
          @update:resolved-placement="onResolvedPlacementUpdate"
        />

        <!-- Cursor Follower Preset -->
        <PresetCursor
          v-if="activePreset === 'cursor'"
          ref="cursorPresetRef"
          :placement="selectedPlacement"
          :middleware-config="middlewareConfig"
          :is-active="activePreset === 'cursor'"
          :keep-open="keepOpen"
          @update:resolved-placement="onResolvedPlacementUpdate"
        />
      </div>

      <!-- Live Code Panel -->
      <ShowcaseCodePanel
        v-show="activeView === 'code'"
        :code="generatedCode"
        :active-preset="activePreset"
      />
    </div>
  </div>
</template>

<style scoped>
.showcase-card {
  margin: 1.5rem 0 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-2, 0 4px 20px rgba(0, 0, 0, 0.04));
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

.showcase-body {
  position: relative;
  min-height: 380px;
  background: var(--vp-c-bg);
}

.sandbox {
  position: relative;
  height: 380px;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--vp-c-bg-alt);
}

.sandbox-caption {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 1.5rem);
  max-width: 440px;
  pointer-events: none;
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--vp-c-text-3);
  text-align: center;
  white-space: normal;
  text-wrap: balance;
}

.sandbox-caption kbd {
  display: inline-block;
  padding: 0.05rem 0.3rem;
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  color: var(--vp-c-text-2);
}

.reset-position-btn {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 10;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.reset-position-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

@media (max-width: 640px) {
  .showcase-card {
    margin: 1rem 0 1.5rem;
    border-radius: 10px;
  }

  .showcase-body {
    min-height: 320px;
  }

  .sandbox {
    height: 320px;
  }

  .reset-position-btn {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.2rem 0.45rem;
    font-size: 0.72rem;
  }

  .sandbox-caption {
    bottom: 0.5rem;
    font-size: 0.72rem;
  }
}
</style>
