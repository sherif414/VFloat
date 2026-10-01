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

const placementNode = useFloatingNode({
  anchorEl: placementAnchorEl,
  floatingEl: placementFloatingEl,
});

const placementPosition = usePosition(placementNode, {
  placement: "bottom-start",
  strategy: "fixed",
  transform: true,
  middlewares: {
    offset: 4,
    flip: true,
    shift: true,
  },
});

useClick(placementNode);
useOutsideClick(placementNode);
useEscapeKey(placementNode);

function selectPlacementOption(val: Placement) {
  emit("update:placement", val);
  placementNode.open.value = false;
}
</script>

<template>
  <div
    class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 border-b border-default bg-elevated"
  >
    <!-- Preset Navigation -->
    <div
      ref="tabNavEl"
      class="relative flex items-center gap-[2px] p-[2px] rounded-lg bg-muted overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto"
      role="tablist"
      aria-label="Component examples"
    >
      <div
        class="absolute top-[2px] left-0 h-[calc(100%-4px)] rounded-md bg-elevated shadow-xs pointer-events-none z-[1] transition-[transform,width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :class="[isPositioned ? 'opacity-100' : 'opacity-0', !isAnimated && 'transition-none']"
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
        class="relative z-[2] px-2.5 py-1 text-center rounded-md text-[13px] font-medium select-none whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 flex-1 sm:flex-initial"
        :class="
          modelValue === p.id ? 'text-highlighted font-medium' : 'text-muted hover:text-highlighted'
        "
        :aria-selected="modelValue === p.id"
        @click="onSelectPreset(p.id)"
      >
        <span>{{ p.label }}</span>
      </button>
    </div>

    <!-- Header Actions -->
    <div class="flex items-center justify-end gap-1.5 w-full sm:w-auto">
      <!-- Placement Selector -->
      <div v-show="hasPlacementControl" class="relative">
        <button
          ref="placementAnchorEl"
          type="button"
          class="inline-flex items-center gap-1.5 h-7 px-2 text-xs font-medium rounded-md border border-default bg-elevated transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 select-none cursor-pointer"
          :class="
            placementNode.open.value
              ? 'border-dimmed text-highlighted bg-muted'
              : 'text-muted hover:text-highlighted hover:border-muted hover:bg-muted'
          "
          aria-haspopup="listbox"
          :aria-expanded="placementNode.open.value"
          title="Placement alignment"
        >
          <span>{{ currentPlacementLabel }}</span>
          <svg
            class="w-2.5 h-2.5 transition-transform duration-150"
            :class="placementNode.open.value ? 'rotate-180 text-highlighted' : 'text-dimmed'"
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
            v-if="placementNode.open.value"
            ref="placementFloatingEl"
            class="fixed z-[1000] top-0 left-0 pointer-events-auto"
            :style="[
              placementPosition.styles.value,
              { visibility: placementPosition.isPositioned.value ? 'visible' : 'hidden' },
            ]"
          >
            <Transition
              enter-active-class="transition duration-120 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              leave-active-class="transition duration-100 ease-in"
              leave-to-class="opacity-0 -translate-y-1"
              appear
            >
              <div
                class="w-36 p-1 bg-elevated border border-default rounded-md shadow-md flex flex-col gap-0.5"
                role="listbox"
              >
                <button
                  v-for="opt in placementOptions"
                  :key="opt.value"
                  type="button"
                  role="option"
                  :aria-selected="placement === opt.value"
                  class="flex items-center justify-between w-full min-h-7 px-2 py-1 text-xs font-medium rounded text-muted hover:bg-muted hover:text-highlighted transition-colors duration-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-1 select-none"
                  :class="{ '!bg-muted !text-primary font-semibold': placement === opt.value }"
                  @click="selectPlacementOption(opt.value)"
                >
                  <span>{{ opt.label }}</span>
                  <svg
                    v-if="placement === opt.value"
                    class="w-3 h-3 text-primary shrink-0"
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
        class="inline-flex items-center gap-1.5 h-7 px-2 text-xs font-medium rounded-md border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 select-none cursor-pointer"
        :class="
          keepOpen
            ? 'border-primary bg-(--vf-brand-wash) text-primary'
            : 'border-default bg-elevated text-muted hover:text-highlighted hover:border-muted hover:bg-muted'
        "
        :title="keepOpen ? 'Dismiss keep open' : 'Keep floating UI open'"
        :aria-pressed="keepOpen"
        @click="emit('update:keepOpen', !keepOpen)"
      >
        <svg
          class="w-3 h-3 shrink-0"
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
        <span>Keep open</span>
      </button>
    </div>
  </div>
</template>
