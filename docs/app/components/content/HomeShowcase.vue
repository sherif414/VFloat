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
  <div class="max-w-6xl mx-auto my-6 sm:my-8 px-4 sm:px-6">
    <div
      class="m-0 border border-default rounded-xl bg-elevated overflow-hidden font-sans shadow-(--vf-elevation-card)"
    >
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
      <div class="relative min-h-[420px] sm:min-h-[480px] bg-muted">
        <div
          ref="sandboxEl"
          class="relative h-[420px] sm:h-[480px] w-full overflow-hidden grid place-items-center bg-muted before:absolute before:inset-0 before:bg-[radial-gradient(circle,var(--ui-border)_1px,transparent_1px)] before:bg-[size:20px_20px] before:bg-center before:[mask-image:radial-gradient(ellipse_75%_70%_at_50%_50%,#000_30%,transparent_85%)] before:opacity-70 before:pointer-events-none"
          :class="{
            '!flex !flex-col !items-center !justify-start pt-8 sm:pt-14':
              activePreset === 'combobox',
            '!flex !flex-col !items-center !justify-start pt-10 sm:pt-18': activePreset === 'menu',
          }"
        >
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
          <div
            class="absolute bottom-2 sm:bottom-3 left-3.5 right-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none text-center sm:text-left"
          >
            <div
              class="text-xs leading-relaxed text-muted text-balance [&>span>kbd]:inline-block [&>span>kbd]:px-1 [&>span>kbd]:py-0.5 [&>span>kbd]:text-[11px] [&>span>kbd]:font-mono [&>span>kbd]:bg-elevated [&>span>kbd]:border [&>span>kbd]:border-dotted [&>span>kbd]:border-default [&>span>kbd]:rounded [&>span>kbd]:text-toned [&>span>kbd]:mx-0.5"
            >
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
              class="pointer-events-auto inline-flex items-center gap-1.5 px-2 py-1 border border-default rounded-md bg-elevated text-toned font-medium text-[11.5px] cursor-pointer touch-manipulation outline-none transition-colors hover:text-highlighted hover:border-muted hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
              title="Reset position and settings"
              aria-label="Reset position and settings"
              @click="handleResetDemo"
            >
              <svg
                class="size-3"
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
