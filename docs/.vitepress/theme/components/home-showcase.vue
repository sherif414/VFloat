<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import {
  type Placement,
  useArrow,
  useClientPoint,
  useCollection,
  useFloatingContext,
  useFocus,
  useHover,
  useListNavigation,
  useOutsideClick,
  usePosition,
  useRole,
  useClick,
  useEscapeKey,
} from "v-float";

// ============================================================================
// State & Options
// ============================================================================
type PresetType = "tooltip" | "popover" | "menu" | "cursor";

const activePreset = ref<PresetType>("tooltip");
const activeView = ref<"preview" | "code">("preview");

const selectedPlacement = ref<Placement>("top");
const offsetValue = ref<number>(8);
const enableFlip = ref<boolean>(true);
const enableShift = ref<boolean>(true);
const enableArrow = ref<boolean>(true);

const presets: { id: PresetType; label: string; description: string }[] = [
  { id: "tooltip", label: "Tooltip", description: "Hover & focus triggers" },
  { id: "popover", label: "Popover", description: "Click & modal dismissal" },
  { id: "menu", label: "Menu", description: "Keyboard list navigation" },
  { id: "cursor", label: "Virtual Anchor", description: "Cursor client point" },
];

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
// Sandbox & Drag State
// ============================================================================
const sandboxEl = shallowRef<HTMLElement | null>(null);
const anchorOffsetX = ref(0);
const anchorOffsetY = ref(0);
const isDragging = ref(false);
let dragStartPointer = { x: 0, y: 0 };
let dragStartOffset = { x: 0, y: 0 };

// ============================================================================
// Positioning Options Configuration
// ============================================================================
const positionMiddlewareConfig = computed(() => ({
  offset: offsetValue.value,
  flip: enableFlip.value,
  shift: enableShift.value,
}));

// ============================================================================
// 1. Tooltip Preset
// ============================================================================
const tooltipAnchorEl = shallowRef<HTMLElement | null>(null);
const tooltipFloatingEl = shallowRef<HTMLElement | null>(null);
const tooltipArrowEl = shallowRef<HTMLElement | null>(null);

const tooltipContext = useFloatingContext({
  anchorEl: tooltipAnchorEl,
  floatingEl: tooltipFloatingEl,
  arrowEl: tooltipArrowEl,
});

const tooltipPosition = usePosition(tooltipContext, {
  placement: selectedPlacement,
  middleware: positionMiddlewareConfig,
});

const { arrowStyles: tooltipArrowStyles } = useArrow(tooltipContext, {
  offset: "-5px",
});

const tooltipSide = computed(
  () =>
    (tooltipPosition.placement.value.split("-")[0] ?? "bottom") as
      | "top"
      | "bottom"
      | "left"
      | "right",
);

useHover(tooltipContext, {
  enabled: () => activePreset.value === "tooltip",
  delay: { open: 80, close: 120 },
});

useFocus(tooltipContext, {
  enabled: () => activePreset.value === "tooltip",
});

useRole(tooltipContext, {
  role: "tooltip",
});

// ============================================================================
// 2. Popover Preset
// ============================================================================
const popoverAnchorEl = shallowRef<HTMLElement | null>(null);
const popoverFloatingEl = shallowRef<HTMLElement | null>(null);
const popoverArrowEl = shallowRef<HTMLElement | null>(null);

const popoverContext = useFloatingContext({
  anchorEl: popoverAnchorEl,
  floatingEl: popoverFloatingEl,
  arrowEl: popoverArrowEl,
});

const popoverPosition = usePosition(popoverContext, {
  placement: selectedPlacement,
  middleware: positionMiddlewareConfig,
});

const { arrowStyles: popoverArrowStyles } = useArrow(popoverContext, {
  offset: "-5px",
});

const popoverSide = computed(
  () =>
    (popoverPosition.placement.value.split("-")[0] ?? "bottom") as
      | "top"
      | "bottom"
      | "left"
      | "right",
);

useClick(popoverContext, {
  enabled: () => activePreset.value === "popover",
});

useOutsideClick(popoverContext, {
  enabled: () => activePreset.value === "popover",
});

useEscapeKey(popoverContext, {
  enabled: () => activePreset.value === "popover",
});

useRole(popoverContext, {
  role: "dialog",
});

// ============================================================================
// 3. Dropdown Menu Preset
// ============================================================================
const menuAnchorEl = shallowRef<HTMLElement | null>(null);
const menuFloatingEl = shallowRef<HTMLElement | null>(null);
const menuArrowEl = shallowRef<HTMLElement | null>(null);

const menuContext = useFloatingContext({
  anchorEl: menuAnchorEl,
  floatingEl: menuFloatingEl,
  arrowEl: menuArrowEl,
});

const menuPosition = usePosition(menuContext, {
  placement: selectedPlacement,
  middleware: positionMiddlewareConfig,
});

const { arrowStyles: menuArrowStyles } = useArrow(menuContext, {
  offset: "-5px",
});

const menuSide = computed(
  () =>
    (menuPosition.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

const menuItems = [
  { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
  { id: "rename", label: "Rename", shortcut: "↵" },
  { id: "share", label: "Copy Link", shortcut: "⌘C" },
  { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
];

const menuCollection = useCollection({
  values: menuItems.map((item) => item.id),
});

useClick(menuContext, {
  enabled: () => activePreset.value === "menu",
});

useOutsideClick(menuContext, {
  enabled: () => activePreset.value === "menu",
});

useEscapeKey(menuContext, {
  enabled: () => activePreset.value === "menu",
});

useListNavigation(menuContext, {
  collection: menuCollection,
  loop: true,
  enabled: () => activePreset.value === "menu",
});

useRole(menuContext, {
  role: "menu",
});

// ============================================================================
// 4. Cursor Follower Preset (Virtual Element)
// ============================================================================
const cursorTrackingEl = shallowRef<HTMLElement | null>(null);
const cursorAnchorEl = shallowRef<HTMLElement | null>(null);
const cursorFloatingEl = shallowRef<HTMLElement | null>(null);

const cursorContext = useFloatingContext({
  anchorEl: cursorAnchorEl,
  floatingEl: cursorFloatingEl,
});

const cursorPosition = usePosition(cursorContext, {
  placement: selectedPlacement,
  middleware: computed(() => ({
    offset: offsetValue.value,
    shift: enableShift.value,
  })),
});

const { coordinates: cursorCoordinates } = useClientPoint(cursorContext, {
  trackingAreaEl: cursorTrackingEl,
  trackingMode: "follow",
  enabled: () => activePreset.value === "cursor",
});
const cursorPointerX = computed(() => cursorCoordinates.value.x ?? 0);
const cursorPointerY = computed(() => cursorCoordinates.value.y ?? 0);

// ============================================================================
// Current Position & Active Preset
// ============================================================================
const currentPosition = computed(() => {
  switch (activePreset.value) {
    case "tooltip":
      return tooltipPosition;
    case "popover":
      return popoverPosition;
    case "menu":
      return menuPosition;
    case "cursor":
      return cursorPosition;
    default:
      return tooltipPosition;
  }
});

// ============================================================================
// Drag Physics
// ============================================================================
function onAnchorPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStartPointer = { x: e.clientX, y: e.clientY };
  dragStartOffset = { x: anchorOffsetX.value, y: anchorOffsetY.value };

  if (typeof window !== "undefined") {
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
  }
}

function onWindowPointerMove(e: PointerEvent) {
  if (!isDragging.value || !sandboxEl.value) return;

  const dx = e.clientX - dragStartPointer.x;
  const dy = e.clientY - dragStartPointer.y;

  const sandboxRect = sandboxEl.value.getBoundingClientRect();
  const maxExtentX = Math.max(0, sandboxRect.width / 2 - 70);
  const maxExtentY = Math.max(0, sandboxRect.height / 2 - 45);

  const rawX = dragStartOffset.x + dx;
  const rawY = dragStartOffset.y + dy;

  anchorOffsetX.value = Math.max(-maxExtentX, Math.min(maxExtentX, rawX));
  anchorOffsetY.value = Math.max(-maxExtentY, Math.min(maxExtentY, rawY));

  void currentPosition.value.update();
}

function onWindowPointerUp() {
  isDragging.value = false;
  if (typeof window !== "undefined") {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
  }
}

function resetAnchorPosition() {
  anchorOffsetX.value = 0;
  anchorOffsetY.value = 0;
  void nextTick(() => {
    void currentPosition.value.update();
  });
}

function switchPreset(preset: PresetType) {
  activePreset.value = preset;
  tooltipContext.state.setOpen(false);
  popoverContext.state.setOpen(false);
  menuContext.state.setOpen(false);
  cursorContext.state.setOpen(false);
  resetAnchorPosition();
}

// ============================================================================
// Code Snippet Generation
// ============================================================================
const generatedCode = computed(() => {
  const p = selectedPlacement.value;
  const off = offsetValue.value;
  const fl = enableFlip.value;
  const sh = enableShift.value;
  const ar = enableArrow.value;

  const scriptEnd = "<" + "/script>";

  if (activePreset.value === "tooltip") {
    return `<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useHover, useFocus${ar ? ", useArrow" : ""} } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${ar ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${ar ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${p}",
  middleware: {
    offset: ${off},
    flip: ${fl},
    shift: ${sh},
  },
});
${ar ? '\nconst { arrowStyles } = useArrow(context, { offset: "-5px" });' : ""}
useHover(context, { delay: { open: 80, close: 120 } });
useFocus(context);
${scriptEnd}

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="tooltip"
    :style="styles"
  >
    Copy link to clipboard
    ${ar ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  if (activePreset.value === "popover") {
    return `<script setup lang="ts">
import { ref } from "vue";
import {
  useFloatingContext,
  usePosition,
  useClick,
  useOutsideClick,
  useEscapeKey${ar ? ",\n  useArrow" : ""}
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${ar ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${ar ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${p}",
  middleware: {
    offset: ${off},
    flip: ${fl},
    shift: ${sh},
  },
});
${ar ? '\nconst { arrowStyles } = useArrow(context, { offset: "-5px" });' : ""}
useClick(context);
useOutsideClick(context);
useEscapeKey(context);
${scriptEnd}

<template>
  <button ref="anchorEl" type="button">Open Card</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="dialog"
    :style="styles"
  >
    <h3>Settings</h3>
    <p>Dismiss by clicking outside or pressing Escape.</p>
    <button type="button" @click="context.state.setOpen(false)">Close</button>
    ${ar ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  if (activePreset.value === "menu") {
    return `<script setup lang="ts">
import { ref } from "vue";
import {
  useFloatingContext,
  usePosition,
  useClick,
  useOutsideClick,
  useEscapeKey,
  useCollection,
  useListNavigation,
  useRole${ar ? ",\n  useArrow" : ""}
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${ar ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${ar ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${p}",
  middleware: {
    offset: ${off},
    flip: ${fl},
    shift: ${sh},
  },
});

const collection = useCollection({
  values: ["duplicate", "rename", "share", "delete"],
});

${ar ? 'const { arrowStyles } = useArrow(context, { offset: "-5px" });\n' : ""}useClick(context);
useOutsideClick(context);
useEscapeKey(context);
useListNavigation(context, { collection, loop: true });
useRole(context, { role: "menu" });
${scriptEnd}

<template>
  <button ref="anchorEl" type="button" aria-haspopup="menu">Actions Menu</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="menu"
    :style="styles"
  >
    <div
      v-for="item in collection.values.value"
      :key="item"
      role="menuitem"
      :class="{ 'is-active': collection.activeValue.value === item }"
      @mouseenter="collection.setActiveValue(item)"
    >
      {{ item }}
    </div>
    ${ar ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  return `<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useClientPoint } from "v-float";

const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ anchorEl, floatingEl });

const { styles } = usePosition(context, {
  placement: "${p}",
  middleware: {
    offset: ${off},
    shift: ${sh},
  },
});

const { x, y } = useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
});
${scriptEnd}

<template>
  <div ref="trackingAreaEl" class="tracker-canvas">
    <div
      v-if="context.state.open.value"
      ref="floatingEl"
      :style="styles"
    >
      Pointer: X={{ Math.round(x) }}, Y={{ Math.round(y) }}
    </div>
  </div>
</template>`;
});

// ============================================================================
// Clipboard Feedback
// ============================================================================
const copyButtonText = ref("Copy code");
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

async function copySnippet() {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(generatedCode.value);
    copyButtonText.value = "Copied!";
  } catch {
    copyButtonText.value = "Failed";
  }

  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = setTimeout(() => {
    copyButtonText.value = "Copy code";
  }, 1800);
}

// ============================================================================
// Lifecycle
// ============================================================================
onMounted(() => {
  void nextTick(() => {
    void currentPosition.value.update();
  });
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
  }
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
});
</script>

<template>
  <div class="showcase-card">
    <!-- Header: Navigation Tabs & View Mode -->
    <div class="showcase-header">
      <div class="preset-nav" role="tablist" aria-label="Component examples">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          class="preset-tab"
          :class="{ 'is-active': activePreset === p.id }"
          :aria-selected="activePreset === p.id"
          @click="switchPreset(p.id)"
        >
          <span class="preset-tab__label">{{ p.label }}</span>
        </button>
      </div>

      <div class="view-switch" role="tablist" aria-label="View mode">
        <button
          type="button"
          class="view-switch__btn"
          :class="{ 'is-active': activeView === 'preview' }"
          @click="activeView = 'preview'"
        >
          Preview
        </button>
        <button
          type="button"
          class="view-switch__btn"
          :class="{ 'is-active': activeView === 'code' }"
          @click="activeView = 'code'"
        >
          Code
        </button>
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="showcase-controls">
      <div class="control-unit">
        <label class="control-unit__label" for="showcase-placement">Placement</label>
        <select id="showcase-placement" v-model="selectedPlacement" class="control-select">
          <option v-for="item in placements" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div class="control-unit">
        <span class="control-unit__label">Offset</span>
        <div class="segmented-control">
          <button
            v-for="off in offsetPresets"
            :key="off"
            type="button"
            class="segmented-btn"
            :class="{ 'is-active': offsetValue === off }"
            @click="offsetValue = off"
          >
            {{ off }}px
          </button>
        </div>
      </div>

      <div class="control-unit control-unit--toggles">
        <label class="toggle-label">
          <input v-model="enableFlip" type="checkbox" class="toggle-checkbox" />
          <span>Flip</span>
        </label>

        <label class="toggle-label">
          <input v-model="enableShift" type="checkbox" class="toggle-checkbox" />
          <span>Shift</span>
        </label>

        <label v-if="activePreset !== 'cursor'" class="toggle-label">
          <input v-model="enableArrow" type="checkbox" class="toggle-checkbox" />
          <span>Arrow</span>
        </label>
      </div>

      <div class="control-unit control-unit--status">
        <span class="placement-badge">
          resolved: <code>{{ currentPosition.placement.value }}</code>
        </span>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="showcase-body">
      <!-- 1. Interactive Preview Canvas -->
      <div
        v-show="activeView === 'preview'"
        ref="sandboxEl"
        class="sandbox"
        :class="{ 'is-cursor-mode': activePreset === 'cursor' }"
      >
        <!-- Unobtrusive Drag Instruction -->
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

        <!-- Center Reset Action -->
        <button
          v-if="activePreset !== 'cursor' && (anchorOffsetX !== 0 || anchorOffsetY !== 0)"
          type="button"
          class="reset-position-btn"
          @click="resetAnchorPosition"
        >
          Reset anchor
        </button>

        <!-- Tooltip Preset -->
        <template v-if="activePreset === 'tooltip'">
          <div
            class="anchor-slot"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="tooltipAnchorEl"
              type="button"
              class="anchor-btn"
              :class="{ 'is-dragging': isDragging }"
              @pointerdown="onAnchorPointerDown"
            >
              <svg
                class="anchor-btn__drag-icon"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
              <span>Hover me</span>
            </button>
          </div>

          <div
            v-if="tooltipContext.state.open.value"
            ref="tooltipFloatingEl"
            role="tooltip"
            class="floating-panel panel-tooltip"
            :style="tooltipPosition.styles.value"
          >
            <span>Copy link to clipboard</span>
            <kbd class="shortcut-tag">⌘C</kbd>
            <div
              v-if="enableArrow"
              ref="tooltipArrowEl"
              :class="['floating-arrow', `floating-arrow--${tooltipSide}`]"
              :style="tooltipArrowStyles"
            />
          </div>
        </template>

        <!-- Popover Preset -->
        <template v-if="activePreset === 'popover'">
          <div
            class="anchor-slot"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="popoverAnchorEl"
              type="button"
              class="anchor-btn"
              :class="{
                'is-active': popoverContext.state.open.value,
                'is-dragging': isDragging,
              }"
              @pointerdown="onAnchorPointerDown"
            >
              <svg
                class="anchor-btn__drag-icon"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
              <span>{{ popoverContext.state.open.value ? "Close card" : "Open card" }}</span>
            </button>
          </div>

          <div
            v-if="popoverContext.state.open.value"
            ref="popoverFloatingEl"
            role="dialog"
            aria-modal="false"
            class="floating-panel panel-popover"
            :style="popoverPosition.styles.value"
          >
            <div class="popover-header">
              <span class="popover-title">Share link</span>
              <button
                type="button"
                class="popover-close-btn"
                aria-label="Close"
                @click="popoverContext.state.setOpen(false)"
              >
                ✕
              </button>
            </div>

            <p class="popover-description">
              Anyone with this link will have view permissions for this workspace.
            </p>

            <div class="popover-footer">
              <button
                type="button"
                class="action-btn action-btn--secondary"
                @click="popoverContext.state.setOpen(false)"
              >
                Done
              </button>
              <button
                type="button"
                class="action-btn action-btn--primary"
                @click="popoverContext.state.setOpen(false)"
              >
                Copy Link
              </button>
            </div>

            <div
              v-if="enableArrow"
              ref="popoverArrowEl"
              :class="['floating-arrow', `floating-arrow--${popoverSide}`]"
              :style="popoverArrowStyles"
            />
          </div>
        </template>

        <!-- Menu Preset -->
        <template v-if="activePreset === 'menu'">
          <div
            class="anchor-slot"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="menuAnchorEl"
              type="button"
              class="anchor-btn"
              :class="{
                'is-active': menuContext.state.open.value,
                'is-dragging': isDragging,
              }"
              aria-haspopup="menu"
              :aria-expanded="menuContext.state.open.value"
              @pointerdown="onAnchorPointerDown"
            >
              <svg
                class="anchor-btn__drag-icon"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
              <span>Actions</span>
              <span class="anchor-btn__chevron">▾</span>
            </button>
          </div>

          <div
            v-if="menuContext.state.open.value"
            ref="menuFloatingEl"
            role="menu"
            class="floating-panel panel-menu"
            :style="menuPosition.styles.value"
          >
            <div
              v-for="item in menuItems"
              :key="item.id"
              role="menuitem"
              class="menu-item"
              :class="{
                'is-active': menuCollection.activeValue.value === item.id,
                'is-danger': item.danger,
              }"
              @mouseenter="menuCollection.setActiveValue(item.id)"
              @click="menuContext.state.setOpen(false)"
            >
              <span class="menu-item__label">{{ item.label }}</span>
              <kbd class="menu-item__shortcut">{{ item.shortcut }}</kbd>
            </div>

            <div
              v-if="enableArrow"
              ref="menuArrowEl"
              :class="['floating-arrow', `floating-arrow--${menuSide}`]"
              :style="menuArrowStyles"
            />
          </div>
        </template>

        <!-- Virtual Anchor / Cursor Follower Preset -->
        <template v-if="activePreset === 'cursor'">
          <div ref="cursorTrackingEl" class="cursor-zone">
            <div class="cursor-zone__prompt">
              <span>Move pointer within this canvas</span>
            </div>

            <div ref="cursorAnchorEl" style="display: none" />

            <div
              v-if="cursorContext.state.open.value"
              ref="cursorFloatingEl"
              class="floating-panel panel-cursor"
              :style="cursorPosition.styles.value"
            >
              <span class="panel-cursor__indicator" />
              <span class="panel-cursor__coords">
                x: {{ Math.round(cursorPointerX) }}px, y: {{ Math.round(cursorPointerY) }}px
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- 2. Code Viewer -->
      <div v-show="activeView === 'code'" class="code-view">
        <div class="code-view__bar">
          <span class="code-view__tag">{{ activePreset.toUpperCase() }} COMPONENT</span>
          <button type="button" class="code-copy-btn" @click="copySnippet">
            {{ copyButtonText }}
          </button>
        </div>
        <pre class="code-view__content"><code>{{ generatedCode }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================================
   Frame & Structural Shell
   ============================================================================ */
.showcase-card {
  margin: 1.5rem 0 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

/* ============================================================================
   Header & Tabs
   ============================================================================ */
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

.preset-nav {
  display: flex;
  gap: 0.25rem;
}

.preset-tab {
  padding: 0.4rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.preset-tab:hover {
  color: var(--vp-c-text-1);
}

.preset-tab.is-active {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.view-switch {
  display: flex;
  background: var(--vp-c-bg-elv, rgba(125, 125, 125, 0.08));
  padding: 0.2rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}

.view-switch__btn {
  padding: 0.25rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-switch__btn.is-active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ============================================================================
   Controls Bar
   ============================================================================ */
.showcase-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
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

.control-select {
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.control-select:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
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

.control-unit--toggles {
  display: flex;
  gap: 0.75rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  accent-color: var(--vp-c-brand-1, #3eaf7c);
  cursor: pointer;
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
  color: var(--vp-c-text-1);
  font-weight: 600;
  background: var(--vp-c-bg-soft);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

/* ============================================================================
   Workspace & Preview Sandbox
   ============================================================================ */
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
  background: var(--vp-c-bg-alt, #fafafb);
}

:root.dark .sandbox {
  background: #141416;
}

.sandbox-caption {
  position: absolute;
  bottom: 0.85rem;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  text-align: center;
  white-space: nowrap;
}

.sandbox-caption kbd {
  display: inline-block;
  padding: 0.05rem 0.3rem;
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}

.reset-position-btn {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 10;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-position-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-2);
}

/* ============================================================================
   Anchor Trigger Element
   ============================================================================ */
.anchor-slot {
  position: relative;
  touch-action: none;
  z-index: 5;
  transition: transform 0.05s linear;
}

.anchor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  user-select: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-text-3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.anchor-btn.is-active {
  border-color: var(--vp-c-brand-1, #3eaf7c);
}

.anchor-btn.is-dragging {
  cursor: grabbing;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.anchor-btn__drag-icon {
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

.anchor-btn__chevron {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

/* ============================================================================
   Floating Panels
   ============================================================================ */
.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv, #fff);
  color: var(--vp-c-text-1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

:root.dark .floating-panel {
  background: #1e1e22;
}

/* Tooltip */
.panel-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
}

.shortcut-tag {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  padding: 0.08rem 0.3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

/* Popover */
.panel-popover {
  width: 260px;
  padding: 0.85rem;
  border-radius: 10px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.popover-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.popover-close-btn {
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
}

.popover-close-btn:hover {
  color: var(--vp-c-text-1);
}

.popover-description {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.popover-footer {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.action-btn {
  padding: 0.32rem 0.65rem;
  border-radius: 6px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn--primary {
  border: none;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.action-btn--primary:hover {
  opacity: 0.9;
}

.action-btn--secondary {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
}

.action-btn--secondary:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

/* Menu */
.panel-menu {
  width: 180px;
  padding: 0.3rem;
  border-radius: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.55rem;
  border-radius: 5px;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.menu-item:hover,
.menu-item.is-active {
  background: var(--vp-c-bg-soft);
}

.menu-item.is-danger {
  color: #e5484d;
}

.menu-item.is-danger:hover,
.menu-item.is-danger.is-active {
  background: rgba(229, 72, 77, 0.08);
}

.menu-item__shortcut {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}

/* Cursor Zone & Follower */
.cursor-zone {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  cursor: crosshair;
}

.cursor-zone__prompt {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  pointer-events: none;
}

.panel-cursor {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  pointer-events: none;
  font-size: 0.76rem;
  font-family: var(--vp-font-family-mono, monospace);
}

.panel-cursor__indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3eaf7c;
}

.panel-cursor__coords {
  color: var(--vp-c-text-2);
}

/* ============================================================================
   Directional Arrow Borders
   ============================================================================ */
.floating-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--vp-c-bg-elv, #fff);
  transform: rotate(45deg);
  pointer-events: none;
  border: 0 solid var(--vp-c-divider);
  z-index: 1;
}

:root.dark .floating-arrow {
  background: #1e1e22;
}

.floating-arrow--top {
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.floating-arrow--bottom {
  border-top-width: 1px;
  border-left-width: 1px;
}

.floating-arrow--left {
  border-top-width: 1px;
  border-right-width: 1px;
}

.floating-arrow--right {
  border-bottom-width: 1px;
  border-left-width: 1px;
}

/* ============================================================================
   Code Viewer
   ============================================================================ */
.code-view {
  position: relative;
  height: 380px;
  display: flex;
  flex-direction: column;
  background: #161618;
}

.code-view__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: #121214;
}

.code-view__tag {
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: rgba(255, 255, 255, 0.45);
}

.code-copy-btn {
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.12s ease;
}

.code-copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.code-view__content {
  margin: 0;
  padding: 0.85rem 1rem;
  height: 100%;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.5;
  color: #d1d5db;
}

.code-view__content code {
  color: inherit;
  background: transparent;
  padding: 0;
}

/* ============================================================================
   Responsive
   ============================================================================ */
@media (max-width: 768px) {
  .showcase-header {
    flex-direction: column;
    align-items: stretch;
  }

  .preset-nav {
    overflow-x: auto;
  }

  .showcase-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .control-unit--status {
    margin-left: 0;
  }
}
</style>
