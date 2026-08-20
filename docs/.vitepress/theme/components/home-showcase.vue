<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
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

const placements: Placement[] = [
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "right",
];

const offsetPresets = [4, 8, 12, 16];

// ============================================================================
// Sandbox & Drag State
// ============================================================================
const sandboxEl = shallowRef<HTMLElement | null>(null);
const anchorOffsetX = ref(0);
const anchorOffsetY = ref(0);
const isDragging = ref(false);
let dragStartPointer = { x: 0, y: 0 };
let dragStartOffset = { x: 0, y: 0 };
let hasDraggedSignificant = false;

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

const { arrowStyles: tooltipArrowStyles } = useArrow(tooltipContext);

useHover(tooltipContext, {
  enabled: () => activePreset.value === "tooltip",
  delay: { open: 100, close: 150 },
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

const { arrowStyles: popoverArrowStyles } = useArrow(popoverContext);

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

const { arrowStyles: menuArrowStyles } = useArrow(menuContext);

const menuItems = [
  { id: "edit", label: "Edit Item", icon: "✏️", shortcut: "⌘E" },
  { id: "duplicate", label: "Duplicate", icon: "📋", shortcut: "⌘D" },
  { id: "share", label: "Share Link", icon: "🔗", shortcut: "⌘S" },
  { id: "delete", label: "Delete", icon: "🗑️", danger: true },
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

const { x: cursorPointerX, y: cursorPointerY } = useClientPoint(cursorContext, {
  trackingAreaEl: cursorTrackingEl,
  trackingMode: "follow",
  enabled: () => activePreset.value === "cursor",
});

// ============================================================================
// Current Active Context & Position
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
// Drag Handling
// ============================================================================
function onAnchorPointerDown(e: PointerEvent) {
  if (e.button !== 0) return; // Primary click only
  isDragging.value = true;
  hasDraggedSignificant = false;
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

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    hasDraggedSignificant = true;
  }

  const sandboxRect = sandboxEl.value.getBoundingClientRect();
  const maxExtentX = Math.max(0, sandboxRect.width / 2 - 60);
  const maxExtentY = Math.max(0, sandboxRect.height / 2 - 40);

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
  // Reset open states on switch
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
${ar ? "\nconst { arrowStyles } = useArrow(context);" : ""}
useHover(context, { delay: { open: 100, close: 150 } });
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
    Instant, collision-aware tooltip!
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
${ar ? "\nconst { arrowStyles } = useArrow(context);" : ""}
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
    <h3>Interactive Popover</h3>
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
  values: ["edit", "duplicate", "share", "delete"],
});

${ar ? "const { arrowStyles } = useArrow(context);\n" : ""}useClick(context);
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
// Clipboard / Copy Feedback
// ============================================================================
const copyButtonText = ref("Copy Code");
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

async function copySnippet() {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(generatedCode.value);
    copyButtonText.value = "Copied! ✓";
  } catch {
    copyButtonText.value = "Failed";
  }

  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = setTimeout(() => {
    copyButtonText.value = "Copy Code";
  }, 2000);
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
  <div class="vfloat-showcase">
    <!-- Header: Preset Selection & View Tabs -->
    <div class="vfloat-showcase__header">
      <div class="vfloat-showcase__presets" role="tablist" aria-label="Showcase presets">
        <button
          type="button"
          role="tab"
          class="vfloat-preset-tab"
          :class="{ 'is-active': activePreset === 'tooltip' }"
          :aria-selected="activePreset === 'tooltip'"
          @click="switchPreset('tooltip')"
        >
          <span class="vfloat-preset-tab__icon">💬</span>
          <span class="vfloat-preset-tab__title">Tooltip</span>
          <span class="vfloat-preset-tab__badge">Hover / Focus</span>
        </button>

        <button
          type="button"
          role="tab"
          class="vfloat-preset-tab"
          :class="{ 'is-active': activePreset === 'popover' }"
          :aria-selected="activePreset === 'popover'"
          @click="switchPreset('popover')"
        >
          <span class="vfloat-preset-tab__icon">🪟</span>
          <span class="vfloat-preset-tab__title">Popover Card</span>
          <span class="vfloat-preset-tab__badge">Click / Outside</span>
        </button>

        <button
          type="button"
          role="tab"
          class="vfloat-preset-tab"
          :class="{ 'is-active': activePreset === 'menu' }"
          :aria-selected="activePreset === 'menu'"
          @click="switchPreset('menu')"
        >
          <span class="vfloat-preset-tab__icon">📑</span>
          <span class="vfloat-preset-tab__title">Dropdown Menu</span>
          <span class="vfloat-preset-tab__badge">Keyboard Nav</span>
        </button>

        <button
          type="button"
          role="tab"
          class="vfloat-preset-tab"
          :class="{ 'is-active': activePreset === 'cursor' }"
          :aria-selected="activePreset === 'cursor'"
          @click="switchPreset('cursor')"
        >
          <span class="vfloat-preset-tab__icon">🎯</span>
          <span class="vfloat-preset-tab__title">Cursor Follower</span>
          <span class="vfloat-preset-tab__badge">Virtual Anchor</span>
        </button>
      </div>

      <div class="vfloat-showcase__view-tabs">
        <button
          type="button"
          class="vfloat-view-tab"
          :class="{ 'is-active': activeView === 'preview' }"
          @click="activeView = 'preview'"
        >
          Interactive Preview
        </button>
        <button
          type="button"
          class="vfloat-view-tab"
          :class="{ 'is-active': activeView === 'code' }"
          @click="activeView = 'code'"
        >
          Vue 3 Code
        </button>
      </div>
    </div>

    <!-- Controls Toolbar -->
    <div class="vfloat-showcase__toolbar">
      <div class="vfloat-toolbar-group">
        <label class="vfloat-toolbar-label" for="vfloat-placement-select">Placement:</label>
        <select id="vfloat-placement-select" v-model="selectedPlacement" class="vfloat-select">
          <option v-for="p in placements" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div class="vfloat-toolbar-group">
        <span class="vfloat-toolbar-label">Offset:</span>
        <div class="vfloat-pill-group">
          <button
            v-for="off in offsetPresets"
            :key="off"
            type="button"
            class="vfloat-pill-btn"
            :class="{ 'is-active': offsetValue === off }"
            @click="offsetValue = off"
          >
            {{ off }}px
          </button>
        </div>
      </div>

      <div class="vfloat-toolbar-group vfloat-toggles">
        <label
          class="vfloat-checkbox-label"
          title="Automatically flip to opposite side on collision"
        >
          <input v-model="enableFlip" type="checkbox" class="vfloat-checkbox" />
          <span>Flip</span>
        </label>

        <label
          class="vfloat-checkbox-label"
          title="Shift along axis to remain visible within bounds"
        >
          <input v-model="enableShift" type="checkbox" class="vfloat-checkbox" />
          <span>Shift</span>
        </label>

        <label
          v-if="activePreset !== 'cursor'"
          class="vfloat-checkbox-label"
          title="Enable directional arrow pointer"
        >
          <input v-model="enableArrow" type="checkbox" class="vfloat-checkbox" />
          <span>Arrow</span>
        </label>
      </div>

      <div class="vfloat-toolbar-status">
        <span class="vfloat-status-pill">
          Actual: <strong>{{ currentPosition.placement.value }}</strong>
        </span>
      </div>
    </div>

    <!-- Main Content Area: Interactive Sandbox / Code View -->
    <div class="vfloat-showcase__body">
      <!-- 1. Interactive Preview Sandbox -->
      <div
        v-show="activeView === 'preview'"
        ref="sandboxEl"
        class="vfloat-sandbox"
        :class="{ 'is-cursor-mode': activePreset === 'cursor' }"
      >
        <!-- Canvas Background Watermark & Instructions -->
        <div class="vfloat-sandbox__hint">
          <template v-if="activePreset === 'tooltip'">
            <span
              >Hover or focus the trigger. <strong>Drag it near edges</strong> to see auto-flip &
              shift!</span
            >
          </template>
          <template v-else-if="activePreset === 'popover'">
            <span
              >Click to toggle card. <strong>Drag around</strong> to test boundary avoidance. Press
              <kbd>Esc</kbd> or click outside to dismiss.</span
            >
          </template>
          <template v-else-if="activePreset === 'menu'">
            <span
              >Click or press <kbd>↑</kbd> <kbd>↓</kbd> to open. Use arrow keys to navigate,
              <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close.</span
            >
          </template>
          <template v-else>
            <span
              >Move your mouse anywhere inside this area. The floating badge tracks your cursor via
              virtual element positioning.</span
            >
          </template>
        </div>

        <!-- Reset Button (When Dragged) -->
        <button
          v-if="activePreset !== 'cursor' && (anchorOffsetX !== 0 || anchorOffsetY !== 0)"
          type="button"
          class="vfloat-reset-btn"
          title="Reset anchor position to center"
          @click="resetAnchorPosition"
        >
          ↺ Center Anchor
        </button>

        <!-- PRESET 1: Tooltip Anchor & Floating Element -->
        <template v-if="activePreset === 'tooltip'">
          <div
            class="vfloat-anchor-wrapper"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="tooltipAnchorEl"
              type="button"
              class="vfloat-trigger-btn"
              :class="{ 'is-dragging': isDragging }"
              @pointerdown="onAnchorPointerDown"
            >
              <span class="vfloat-trigger-btn__drag-handle">⋮⋮</span>
              <span>Hover me</span>
            </button>
          </div>

          <div
            v-if="tooltipContext.state.open.value"
            ref="tooltipFloatingEl"
            role="tooltip"
            class="vfloat-surface vfloat-tooltip"
            :style="tooltipPosition.styles.value"
          >
            <div class="vfloat-tooltip__content">
              <span class="vfloat-tooltip__title">Live Tooltip</span>
              <span class="vfloat-tooltip__desc">Seamless positioning & collision handling</span>
            </div>
            <div
              v-if="enableArrow"
              ref="tooltipArrowEl"
              class="vfloat-arrow"
              :style="tooltipArrowStyles"
            />
          </div>
        </template>

        <!-- PRESET 2: Popover Anchor & Floating Element -->
        <template v-if="activePreset === 'popover'">
          <div
            class="vfloat-anchor-wrapper"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="popoverAnchorEl"
              type="button"
              class="vfloat-trigger-btn vfloat-trigger-btn--popover"
              :class="{
                'is-active': popoverContext.state.open.value,
                'is-dragging': isDragging,
              }"
              @pointerdown="onAnchorPointerDown"
            >
              <span class="vfloat-trigger-btn__drag-handle">⋮⋮</span>
              <span>{{
                popoverContext.state.open.value ? "Close Card" : "Open Popover Card"
              }}</span>
            </button>
          </div>

          <div
            v-if="popoverContext.state.open.value"
            ref="popoverFloatingEl"
            role="dialog"
            aria-modal="false"
            class="vfloat-surface vfloat-popover"
            :style="popoverPosition.styles.value"
          >
            <div class="vfloat-popover__header">
              <div class="vfloat-popover__avatar">⚡</div>
              <div class="vfloat-popover__titles">
                <span class="vfloat-popover__title">Project Settings</span>
                <span class="vfloat-popover__subtitle">Connected via FloatingContext</span>
              </div>
              <button
                type="button"
                class="vfloat-popover__close"
                aria-label="Close"
                @click="popoverContext.state.setOpen(false)"
              >
                ✕
              </button>
            </div>

            <p class="vfloat-popover__text">
              Fully interactive card with click-outside and escape-key dismissal.
            </p>

            <div class="vfloat-popover__actions">
              <button
                type="button"
                class="vfloat-btn vfloat-btn--primary"
                @click="popoverContext.state.setOpen(false)"
              >
                Save Changes
              </button>
              <button
                type="button"
                class="vfloat-btn vfloat-btn--ghost"
                @click="popoverContext.state.setOpen(false)"
              >
                Cancel
              </button>
            </div>

            <div
              v-if="enableArrow"
              ref="popoverArrowEl"
              class="vfloat-arrow"
              :style="popoverArrowStyles"
            />
          </div>
        </template>

        <!-- PRESET 3: Dropdown Menu Anchor & Floating Element -->
        <template v-if="activePreset === 'menu'">
          <div
            class="vfloat-anchor-wrapper"
            :style="{ transform: `translate(${anchorOffsetX}px, ${anchorOffsetY}px)` }"
          >
            <button
              ref="menuAnchorEl"
              type="button"
              class="vfloat-trigger-btn vfloat-trigger-btn--menu"
              :class="{
                'is-active': menuContext.state.open.value,
                'is-dragging': isDragging,
              }"
              aria-haspopup="menu"
              :aria-expanded="menuContext.state.open.value"
              @pointerdown="onAnchorPointerDown"
            >
              <span class="vfloat-trigger-btn__drag-handle">⋮⋮</span>
              <span>Actions Menu</span>
              <span class="vfloat-trigger-caret">▾</span>
            </button>
          </div>

          <div
            v-if="menuContext.state.open.value"
            ref="menuFloatingEl"
            role="menu"
            class="vfloat-surface vfloat-menu"
            :style="menuPosition.styles.value"
          >
            <div class="vfloat-menu__header">Quick Actions</div>
            <div
              v-for="item in menuItems"
              :key="item.id"
              role="menuitem"
              class="vfloat-menu__item"
              :class="{
                'is-active': menuCollection.activeValue.value === item.id,
                'is-danger': item.danger,
              }"
              @mouseenter="menuCollection.setActiveValue(item.id)"
              @click="menuContext.state.setOpen(false)"
            >
              <span class="vfloat-menu__item-icon">{{ item.icon }}</span>
              <span class="vfloat-menu__item-label">{{ item.label }}</span>
              <kbd v-if="item.shortcut" class="vfloat-menu__item-shortcut">{{ item.shortcut }}</kbd>
            </div>

            <div
              v-if="enableArrow"
              ref="menuArrowEl"
              class="vfloat-arrow"
              :style="menuArrowStyles"
            />
          </div>
        </template>

        <!-- PRESET 4: Cursor Tracker Canvas & Follower Element -->
        <template v-if="activePreset === 'cursor'">
          <div ref="cursorTrackingEl" class="vfloat-cursor-area">
            <div class="vfloat-cursor-target-hint">
              <div class="vfloat-cursor-crosshair" />
              <span>Hover around this interactive zone</span>
            </div>

            <!-- Virtual Anchor Target -->
            <div ref="cursorAnchorEl" style="display: none" />

            <div
              v-if="cursorContext.state.open.value"
              ref="cursorFloatingEl"
              class="vfloat-surface vfloat-cursor-badge"
              :style="cursorPosition.styles.value"
            >
              <div class="vfloat-cursor-badge__dot" />
              <div class="vfloat-cursor-badge__content">
                <span class="vfloat-cursor-badge__title">Virtual Element Tracker</span>
                <span class="vfloat-cursor-badge__coords">
                  X: {{ Math.round(cursorPointerX) }}px &nbsp; Y: {{ Math.round(cursorPointerY) }}px
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 2. Live Vue 3 Code View -->
      <div v-show="activeView === 'code'" class="vfloat-code-panel">
        <div class="vfloat-code-panel__header">
          <div class="vfloat-code-panel__title">
            <span class="vfloat-code-panel__lang">Vue 3 SFC</span>
            <span class="vfloat-code-panel__preset">{{ activePreset.toUpperCase() }} PRESET</span>
          </div>
          <button type="button" class="vfloat-copy-btn" @click="copySnippet">
            {{ copyButtonText }}
          </button>
        </div>

        <pre class="vfloat-code-block"><code>{{ generatedCode }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================================
   Root Container & Card Frame
   ============================================================================ */
.vfloat-showcase {
  margin: 2.5rem 0 3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  font-family: var(--vp-font-family-base, sans-serif);
}

/* ============================================================================
   Header & Tabs
   ============================================================================ */
.vfloat-showcase__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.vfloat-showcase__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.vfloat-preset-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.vfloat-preset-tab:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.vfloat-preset-tab.is-active {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1, #3eaf7c);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.vfloat-preset-tab__icon {
  font-size: 0.95rem;
}

.vfloat-preset-tab__badge {
  font-size: 0.72rem;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: var(--vp-c-bg-elv, rgba(125, 125, 125, 0.1));
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.vfloat-preset-tab.is-active .vfloat-preset-tab__badge {
  background: var(--vp-c-brand-soft, rgba(62, 175, 124, 0.15));
  color: var(--vp-c-brand-1, #3eaf7c);
}

.vfloat-showcase__view-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--vp-c-bg-elv, rgba(125, 125, 125, 0.1));
  padding: 0.25rem;
  border-radius: 10px;
}

.vfloat-view-tab {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vfloat-view-tab.is-active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ============================================================================
   Toolbar & Config Bar
   ============================================================================ */
.vfloat-showcase__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.vfloat-toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vfloat-toolbar-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.vfloat-select {
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
}

.vfloat-select:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #3eaf7c);
}

.vfloat-pill-group {
  display: flex;
  gap: 0.2rem;
}

.vfloat-pill-btn {
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vfloat-pill-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.vfloat-pill-btn.is-active {
  background: var(--vp-c-brand-1, #3eaf7c);
  color: #fff;
  border-color: var(--vp-c-brand-1, #3eaf7c);
}

.vfloat-toggles {
  display: flex;
  gap: 0.85rem;
}

.vfloat-checkbox-label {
  display: center;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
}

.vfloat-checkbox {
  accent-color: var(--vp-c-brand-1, #3eaf7c);
  cursor: pointer;
}

.vfloat-toolbar-status {
  margin-left: auto;
}

.vfloat-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono, monospace);
}

.vfloat-status-pill strong {
  color: var(--vp-c-brand-1, #3eaf7c);
}

/* ============================================================================
   Body & Preview Sandbox Area
   ============================================================================ */
.vfloat-showcase__body {
  position: relative;
  min-height: 420px;
  background: var(--vp-c-bg);
}

.vfloat-sandbox {
  position: relative;
  height: 420px;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background-color: var(--vp-c-bg);
  background-image: radial-gradient(var(--vp-c-divider) 1px, transparent 1px);
  background-size: 20px 20px;
}

.vfloat-sandbox__hint {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  pointer-events: none;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-elv);
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  max-width: 90%;
}

.vfloat-sandbox__hint kbd {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.vfloat-reset-btn {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 10;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease;
}

.vfloat-reset-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1, #3eaf7c);
}

/* ============================================================================
   Draggable Anchor Trigger Button
   ============================================================================ */
.vfloat-anchor-wrapper {
  position: relative;
  touch-action: none;
  z-index: 5;
  transition: transform 0.05s linear;
}

.vfloat-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: grab;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  user-select: none;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    transform 0.1s ease;
}

.vfloat-trigger-btn:hover {
  border-color: var(--vp-c-brand-1, #3eaf7c);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.vfloat-trigger-btn.is-active {
  border-color: var(--vp-c-brand-1, #3eaf7c);
  background: var(--vp-c-bg-soft);
}

.vfloat-trigger-btn.is-dragging {
  cursor: grabbing;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
  transform: scale(1.02);
}

.vfloat-trigger-btn__drag-handle {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  letter-spacing: -2px;
}

.vfloat-trigger-caret {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

/* ============================================================================
   Floating Surfaces (Tooltip, Popover, Menu, Cursor Badge)
   ============================================================================ */
.vfloat-surface {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
  animation: vfloat-fade-in 0.15s ease-out;
}

@keyframes vfloat-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Tooltip Surface */
.vfloat-tooltip {
  padding: 0.6rem 0.85rem;
  max-width: 220px;
  border-radius: 10px;
}

.vfloat-tooltip__content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.vfloat-tooltip__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.vfloat-tooltip__desc {
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  line-height: 1.3;
}

/* Popover Card Surface */
.vfloat-popover {
  width: 280px;
  padding: 1rem;
  border-radius: 14px;
}

.vfloat-popover__header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.vfloat-popover__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft, rgba(62, 175, 124, 0.15));
  font-size: 1rem;
}

.vfloat-popover__titles {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.vfloat-popover__title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.vfloat-popover__subtitle {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.vfloat-popover__close {
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
}

.vfloat-popover__close:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.vfloat-popover__text {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.vfloat-popover__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.vfloat-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vfloat-btn--primary {
  border: none;
  background: var(--vp-c-brand-1, #3eaf7c);
  color: #fff;
}

.vfloat-btn--primary:hover {
  background: var(--vp-c-brand-2, #33996a);
}

.vfloat-btn--ghost {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
}

.vfloat-btn--ghost:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

/* Menu Surface */
.vfloat-menu {
  width: 210px;
  padding: 0.4rem;
  border-radius: 12px;
}

.vfloat-menu__header {
  padding: 0.35rem 0.6rem 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}

.vfloat-menu__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.vfloat-menu__item:hover,
.vfloat-menu__item.is-active {
  background: var(--vp-c-brand-soft, rgba(62, 175, 124, 0.12));
  color: var(--vp-c-brand-1, #3eaf7c);
}

.vfloat-menu__item.is-danger {
  color: #ef4444;
}

.vfloat-menu__item.is-danger:hover,
.vfloat-menu__item.is-danger.is-active {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.vfloat-menu__item-label {
  flex: 1;
}

.vfloat-menu__item-shortcut {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}

/* Cursor Follower Surface & Area */
.vfloat-cursor-area {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  cursor: crosshair;
}

.vfloat-cursor-target-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  pointer-events: none;
}

.vfloat-cursor-crosshair {
  width: 24px;
  height: 24px;
  border: 1px dashed var(--vp-c-brand-1, #3eaf7c);
  border-radius: 50%;
  animation: vfloat-pulse 2s infinite ease-in-out;
}

@keyframes vfloat-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

.vfloat-cursor-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  pointer-events: none;
}

.vfloat-cursor-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-brand-1, #3eaf7c);
  box-shadow: 0 0 8px var(--vp-c-brand-1, #3eaf7c);
}

.vfloat-cursor-badge__content {
  display: flex;
  flex-direction: column;
}

.vfloat-cursor-badge__title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.vfloat-cursor-badge__coords {
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}

/* Arrow Element */
.vfloat-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  transform: rotate(45deg);
  pointer-events: none;
}

/* ============================================================================
   Code Viewer Panel
   ============================================================================ */
.vfloat-code-panel {
  position: relative;
  height: 420px;
  display: flex;
  flex-direction: column;
  background: #1e1e24;
}

.vfloat-code-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #18181c;
}

.vfloat-code-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vfloat-code-panel__lang {
  font-size: 0.76rem;
  font-weight: 600;
  color: #3eaf7c;
  background: rgba(62, 175, 124, 0.15);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.vfloat-code-panel__preset {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--vp-font-family-mono, monospace);
}

.vfloat-copy-btn {
  padding: 0.3rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vfloat-copy-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.vfloat-code-block {
  margin: 0;
  padding: 1rem 1.25rem;
  height: 100%;
  overflow: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.84rem;
  line-height: 1.55;
  color: #d1d5db;
}

.vfloat-code-block code {
  color: inherit;
  background: transparent;
  padding: 0;
}

/* ============================================================================
   Responsive Breakpoints
   ============================================================================ */
@media (max-width: 768px) {
  .vfloat-showcase__header {
    flex-direction: column;
    align-items: stretch;
  }

  .vfloat-showcase__presets {
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }

  .vfloat-preset-tab__badge {
    display: none;
  }

  .vfloat-showcase__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .vfloat-toolbar-status {
    margin-left: 0;
  }

  .vfloat-sandbox {
    height: 380px;
  }

  .vfloat-code-panel {
    height: 380px;
  }
}
</style>
