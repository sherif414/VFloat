<script setup lang="ts">
import type { Placement } from "v-float";
import { computed, shallowRef, watch } from "vue";
import {
  useClick,
  useCollection,
  useEscapeKey,
  useFloatingContext,
  useFocusManager,
  useListNavigation,
  useOutsideClick,
  usePosition,
  useRole,
} from "v-float";
import type { PresetType } from "./types";

interface Props {
  placement: Placement;
  offset: number;
  flip: boolean;
  shift: boolean;
  arrow: boolean;
  keepOpen: boolean;
  activePreset: PresetType;
  resolvedPlacement: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:placement", value: Placement): void;
  (e: "update:offset", value: number): void;
  (e: "update:flip", value: boolean): void;
  (e: "update:shift", value: boolean): void;
  (e: "update:arrow", value: boolean): void;
  (e: "update:keepOpen", value: boolean): void;
}>();

const placements: { value: Placement; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "top-start", label: "Top Start" },
  { value: "top-end", label: "Top End" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom-start", label: "Bottom Start" },
  { value: "bottom-end", label: "Bottom End" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const offsetPresets = [4, 8, 16];

// ============================================================================
// Custom Placement Dropdown using VFloat Composables
// ============================================================================
const selectAnchorEl = shallowRef<HTMLElement | null>(null);
const selectFloatingEl = shallowRef<HTMLElement | null>(null);

const selectContext = useFloatingContext({
  anchorEl: selectAnchorEl,
  floatingEl: selectFloatingEl,
});

const selectPosition = usePosition(selectContext, {
  placement: "bottom-start",
  strategy: "fixed",
  middleware: {
    offset: 4,
    flip: true,
    shift: true,
  },
});

useClick(selectContext);
useOutsideClick(selectContext);
useEscapeKey(selectContext);
useFocusManager(selectContext, {
  modal: false,
  initialFocus: selectFloatingEl,
  returnFocus: true,
  guards: false,
});

const { activeIndex, setActiveIndex, containerProps } = useListNavigation(placements, {
  loop: true,
  getItemId: (p) => p.value,
  getItemLabel: (p) => p.label,
  onSelect: (item) => {
    emit("update:placement", item.value as Placement);
    selectContext.state.setOpen(false);
  },
});
useRole(selectContext, { role: "listbox" });

const currentPlacementLabel = computed(
  () => placements.find((p) => p.value === props.placement)?.label ?? props.placement,
);

watch(selectContext.state.open, (isOpen) => {
  if (isOpen) {
    const idx = placements.findIndex((p) => p.value === props.placement);
    if (idx !== -1) {
      setActiveIndex(idx);
    }
  }
});

function onOptionSelect(val: Placement) {
  emit("update:placement", val);
  selectContext.state.setOpen(false);
}
</script>

<template>
  <div class="showcase-controls">
    <!-- Custom VFloat Select Dropdown -->
    <div class="control-unit">
      <span class="control-unit__label">Placement</span>
      <button
        ref="selectAnchorEl"
        type="button"
        class="control-select-btn"
        :class="{ 'is-open': selectContext.state.open.value }"
        aria-haspopup="listbox"
        :aria-expanded="selectContext.state.open.value"
      >
        <span>{{ currentPlacementLabel }}</span>
        <svg
          class="control-select-btn__chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <Teleport to="body">
        <div
          v-if="selectContext.state.open.value"
          ref="selectFloatingEl"
          role="listbox"
          class="control-select-dropdown"
          :style="selectPosition.styles.value"
          v-bind="containerProps"
        >
          <div
            v-for="(item, index) in placements"
            :key="item.value"
            role="option"
            :aria-selected="placement === item.value"
            class="control-select-option"
            :class="{
              'is-active': activeIndex === index,
              'is-selected': placement === item.value,
            }"
            @mouseenter="setActiveIndex(index)"
            @click="onOptionSelect(item.value)"
          >
            <span>{{ item.label }}</span>
            <svg
              v-if="placement === item.value"
              class="control-select-option__check"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 8.5l3.5 3.5L13 5" />
            </svg>
          </div>
        </div>
      </Teleport>
    </div>

    <div class="control-unit">
      <span class="control-unit__label">Offset</span>
      <div class="segmented-control">
        <button
          v-for="off in offsetPresets"
          :key="off"
          type="button"
          class="segmented-btn"
          :class="{ 'is-active': offset === off }"
          @click="emit('update:offset', off)"
        >
          {{ off }}px
        </button>
      </div>
    </div>

    <div class="control-unit control-unit--toggles">
      <!-- Flip -->
      <label class="custom-toggle">
        <input
          :checked="flip"
          type="checkbox"
          class="custom-toggle__input"
          @change="emit('update:flip', ($event.target as HTMLInputElement).checked)"
        />
        <span class="custom-toggle__box" aria-hidden="true">
          <svg
            class="custom-toggle__check"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-6" />
          </svg>
        </span>
        <span class="custom-toggle__label">Flip</span>
      </label>

      <!-- Shift -->
      <label class="custom-toggle">
        <input
          :checked="shift"
          type="checkbox"
          class="custom-toggle__input"
          @change="emit('update:shift', ($event.target as HTMLInputElement).checked)"
        />
        <span class="custom-toggle__box" aria-hidden="true">
          <svg
            class="custom-toggle__check"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-6" />
          </svg>
        </span>
        <span class="custom-toggle__label">Shift</span>
      </label>

      <!-- Arrow -->
      <label v-if="activePreset !== 'cursor'" class="custom-toggle">
        <input
          :checked="arrow"
          type="checkbox"
          class="custom-toggle__input"
          @change="emit('update:arrow', ($event.target as HTMLInputElement).checked)"
        />
        <span class="custom-toggle__box" aria-hidden="true">
          <svg
            class="custom-toggle__check"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-6" />
          </svg>
        </span>
        <span class="custom-toggle__label">Arrow</span>
      </label>

      <!-- Keep Open -->
      <label class="custom-toggle">
        <input
          :checked="keepOpen"
          type="checkbox"
          class="custom-toggle__input"
          @change="emit('update:keepOpen', ($event.target as HTMLInputElement).checked)"
        />
        <span class="custom-toggle__box" aria-hidden="true">
          <svg
            class="custom-toggle__check"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-6" />
          </svg>
        </span>
        <span class="custom-toggle__label">Keep open</span>
      </label>
    </div>

    <div class="control-unit control-unit--status">
      <span class="placement-badge">
        resolved: <code>{{ resolvedPlacement }}</code>
      </span>
    </div>
  </div>
</template>

<style scoped>
.showcase-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.82rem;
}

.control-unit {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.control-unit__label {
  font-weight: 500;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}

.control-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.control-select-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.control-select-btn.is-open {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft, rgba(66, 184, 131, 0.2));
}

.control-select-btn__chevron {
  width: 12px;
  height: 12px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
}

.control-select-btn.is-open .control-select-btn__chevron {
  transform: rotate(180deg);
}

.control-select-dropdown {
  position: fixed;
  z-index: 1000;
  min-width: 130px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 0.25rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-3, 0 8px 24px rgba(0, 0, 0, 0.12));
  outline: none;
}

.control-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.32rem 0.55rem;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition:
    background 0.1s ease,
    color 0.1s ease;
}

.control-select-option:hover,
.control-select-option.is-active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.control-select-option.is-selected {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.control-select-option__check {
  width: 12px;
  height: 12px;
  color: var(--vp-c-brand-1);
}

.segmented-control {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.segmented-btn {
  padding: 0.22rem 0.5rem;
  border: none;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.12s ease;
}

.segmented-btn:last-child {
  border-right: none;
}

.segmented-btn:hover {
  color: var(--vp-c-text-1);
}

.segmented-btn.is-active {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

/* ============================================================================
   Custom Precision Checkboxes
   ============================================================================ */
.control-unit--toggles {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
}

.custom-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: color 0.15s ease;
}

.custom-toggle:hover {
  color: var(--vp-c-text-1);
}

.custom-toggle__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}

.custom-toggle__box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.custom-toggle:hover .custom-toggle__box {
  border-color: var(--vp-c-text-3);
}

.custom-toggle__input:focus-visible + .custom-toggle__box {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.custom-toggle__input:checked + .custom-toggle__box {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 1px 4px var(--vp-c-brand-soft, rgba(66, 184, 131, 0.3));
}

.custom-toggle__check {
  width: 10px;
  height: 10px;
  color: var(--vp-c-white, #ffffff);
  opacity: 0;
  transform: scale(0.5);
  transition:
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.12s ease;
}

.custom-toggle__input:checked + .custom-toggle__box .custom-toggle__check {
  opacity: 1;
  transform: scale(1);
}

.custom-toggle__label {
  line-height: 1;
}

.control-unit--status {
  margin-left: auto;
}

.placement-badge {
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono, monospace);
}

.placement-badge code {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  background: var(--vp-c-bg-soft);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

@media (max-width: 768px) {
  .showcase-controls {
    padding: 0.55rem 0.75rem;
    gap: 0.65rem 0.85rem;
  }

  .control-unit--status {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}
</style>
