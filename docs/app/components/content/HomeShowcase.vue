<script setup lang="ts">
import type { Placement } from "v-float";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import PresetCursor from "../showcase/preset-cursor.vue";
import PresetMenu from "../showcase/preset-menu.vue";
import PresetPopover from "../showcase/preset-popover.vue";
import PresetTooltip from "../showcase/preset-tooltip.vue";
import ShowcaseHeader from "../showcase/showcase-header.vue";
import type { PresetType, ShowcasePresetMeta } from "../showcase/types";
import { useShowcaseDrag } from "../showcase/use-showcase-drag";

const activePreset = ref<PresetType>("tooltip");

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

function handleResetDemo() {
  selectedPlacement.value = "top";
  keepOpen.value = false;
  handleResetPosition();
}

const isModified = computed(() => {
  const hasOffset =
    activePreset.value !== "cursor" && (anchorOffset.value.x !== 0 || anchorOffset.value.y !== 0);
  const hasCustomPlacement = selectedPlacement.value !== "top";
  const isKeepOpen = keepOpen.value;
  return hasOffset || hasCustomPlacement || isKeepOpen;
});

function onSwitchPreset(preset: PresetType) {
  activePreset.value = preset;
  handleResetDemo();
}

function onResolvedPlacementUpdate(val: Placement) {
  resolvedPlacement.value = val;
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
      <!-- 1. Unified Single Header Navigation -->
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
        <!-- 1. Interactive Stage Canvas -->
        <div
          ref="sandboxEl"
          class="sandbox"
          :class="{ 'is-cursor-mode': activePreset === 'cursor' }"
        >
          <!-- Caption Helper -->
          <div class="sandbox-caption">
            <template v-if="activePreset === 'tooltip'">
              <span class="caption--desktop"
                >Hover to open. Drag anchor to test collision flipping.</span
              >
              <span class="caption--touch"
                >Tap to open. Drag anchor to test collision flipping.</span
              >
            </template>
            <template v-else-if="activePreset === 'popover'">
              <span class="caption--desktop"
                >Click to open card. Drag anchor near edges to observe placement adaptation.</span
              >
              <span class="caption--touch"
                >Tap to open card. Drag anchor near edges to observe placement adaptation.</span
              >
            </template>
            <template v-else-if="activePreset === 'menu'">
              <span class="caption--desktop"
                >Click or press <kbd>↑</kbd> <kbd>↓</kbd> to navigate items.</span
              >
              <span class="caption--touch">Tap to open menu and choose an action.</span>
            </template>
            <template v-else>
              <span class="caption--desktop"
                >Move your cursor across this area to track coordinates.</span
              >
              <span class="caption--touch"
                >Touch and drag across this area to track coordinates.</span
              >
            </template>
          </div>

          <!-- Reset Button (Icon-Only, Resets Position & Options) -->
          <button
            v-if="isModified"
            type="button"
            class="reset-icon-btn"
            title="Reset position and settings"
            aria-label="Reset position and settings"
            @click="handleResetDemo"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 2.5v4h4" />
              <path d="M2.8 10a6 6 0 1 0 1.4-6.3L2.5 6.5" />
            </svg>
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
  box-shadow: var(--vp-shadow-2, 0 4px 20px rgba(0, 0, 0, 0.08));
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

.showcase-body {
  position: relative;
  min-height: 380px;
  background: var(--vp-c-bg-elv);
}

.sandbox {
  position: relative;
  height: 380px;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background-color: var(--vp-c-bg-alt);
  background-image: radial-gradient(var(--vp-c-divider) 1px, transparent 1px);
  background-size: 24px 24px;
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
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  color: var(--vp-c-text-2);
}

.caption--touch {
  display: none;
}

@media (hover: none) and (pointer: coarse) {
  .caption--desktop {
    display: none;
  }
  .caption--touch {
    display: inline;
  }
}

.reset-icon-btn {
  position: absolute;
  bottom: 0.75rem;
  right: 0.85rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.reset-icon-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  transform: rotate(-30deg);
}

.reset-icon-btn:active {
  transform: rotate(-90deg);
}

.reset-icon-btn svg {
  width: 13px;
  height: 13px;
}

@media (max-width: 640px) {
  .showcase-card {
    margin: 0;
    border-radius: 10px;
  }

  .showcase-body {
    min-height: 320px;
  }

  .sandbox {
    height: 320px;
  }

  .reset-icon-btn {
    bottom: 0.6rem;
    right: 0.6rem;
    width: 32px;
    height: 32px;
    border-radius: 7px;
  }

  .reset-icon-btn svg {
    width: 14px;
    height: 14px;
  }

  .sandbox-caption {
    bottom: 0.55rem;
    font-size: 0.73rem;
    padding: 0 2.2rem;
  }
}
</style>
