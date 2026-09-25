<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { useFloatingNode, useOutsideClick, usePosition } from "@/composables";

// --- Options -----------------------------------------------------------------

const enabled = ref(true);
const ignoreScrollbar = ref(true);

// --- Diagnostics -------------------------------------------------------------

const lastEventText = ref("No interaction yet");
const lastEventType = ref<"idle" | "dismiss" | "ignore">("idle");

function logInteraction(text: string, type: "idle" | "dismiss" | "ignore" = "idle") {
  lastEventText.value = text;
  lastEventType.value = type;
}

// --- Whitelisted target ------------------------------------------------------

const whitelistBtnEl = useTemplateRef<HTMLElement>("whitelistBtn");

function handleWhitelistClick() {
  logInteraction("Clicked whitelisted target (outside click ignored)", "ignore");
}

function checkIgnore(_event: MouseEvent | PointerEvent, target: EventTarget | null): boolean {
  const btn = whitelistBtnEl.value;
  if (!btn || !target || !(target instanceof Node)) return false;
  return btn.contains(target);
}

// --- Primary Floating Node (Popover) -----------------------------------------

const triggerEl = useTemplateRef<HTMLElement>("trigger");
const floatingEl = useTemplateRef<HTMLElement>("floating");
const isOpen = ref(false);

const node = useFloatingNode({
  anchorEl: triggerEl,
  floatingEl,
  open: isOpen,
});

const position = usePosition(node, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

useOutsideClick(node, {
  enabled,
  ignoreScrollbar,
  shouldIgnore: checkIgnore,
  onOutsideClick(e) {
    const isTouch = (e as PointerEvent).pointerType === "touch";
    const isVirtual = e.detail === 0;
    const device = isTouch ? "Touch Tap" : isVirtual ? "Keyboard" : "Mouse Press";
    logInteraction(`Dismissed by outside [${e.type}] (${device})`, "dismiss");
    isOpen.value = false;
    isSubmenuOpen.value = false;
  },
});

// --- Nested Child Node (Submenu) ---------------------------------------------

const subTriggerEl = useTemplateRef<HTMLElement>("subTrigger");
const subFloatingEl = useTemplateRef<HTMLElement>("subFloating");
const isSubmenuOpen = ref(false);

const subNode = useFloatingNode({
  anchorEl: subTriggerEl,
  floatingEl: subFloatingEl,
  open: isSubmenuOpen,
  parent: node,
});

const subPosition = usePosition(subNode, {
  placement: "bottom-start",
  middlewares: { offset: 6, flip: true, shift: { padding: 12 } },
});

useOutsideClick(subNode, {
  enabled,
  ignoreScrollbar,
  shouldIgnore: checkIgnore,
  onOutsideClick() {
    logInteraction("Submenu dismissed by outside click", "dismiss");
    isSubmenuOpen.value = false;
  },
});
</script>

<template>
  <div class="demo">
    <!-- Header -->
    <header class="demo__header">
      <div class="demo__title-row">
        <h2 class="demo__title">Outside Click</h2>
        <span class="badge" :class="isOpen ? 'badge--active' : 'badge--muted'">
          {{ isOpen ? (isSubmenuOpen ? "2 Open (Nested)" : "1 Open") : "Closed" }}
        </span>
      </div>
      <p class="demo__desc">
        Closes popovers when clicking outside. Automatically handles instant desktop mouse clicks,
        scroll-safe mobile touch taps, and text selection drag protection.
      </p>
    </header>

    <!-- Controls & Diagnostics (Pinned at top so popover never covers them) -->
    <div class="controls-bar">
      <div class="controls-bar__toggles">
        <label class="toggle">
          <input v-model="enabled" type="checkbox" class="toggle__input" />
          <span class="toggle__text">enabled</span>
        </label>
        <label class="toggle">
          <input v-model="ignoreScrollbar" type="checkbox" class="toggle__input" />
          <span class="toggle__text">ignoreScrollbar</span>
        </label>
      </div>

      <div class="status-pill" :class="`status-pill--${lastEventType}`">
        <span class="status-pill__label">Status:</span>
        <span class="status-pill__value">{{ lastEventText }}</span>
      </div>
    </div>

    <!-- Interactive Canvas Stage (Two-Column Side-by-Side Layout) -->
    <div class="stage">
      <div class="stage__instructions">
        Click anywhere in the canvas background to test outside dismissal.
      </div>

      <div class="stage__grid">
        <!-- Left Column: Trigger & Dedicated Popover Space -->
        <div class="stage__col stage__col--anchor">
          <span class="col-label">Trigger</span>
          <button ref="trigger" type="button" class="btn btn--primary" @click="isOpen = !isOpen">
            {{ isOpen ? "Close Popover" : "Open Popover" }}
          </button>

          <!-- Reserved drop zone so stage layout stays stable when open -->
          <div class="drop-zone" :class="{ 'is-open': isOpen }">
            <span v-if="!isOpen" class="drop-zone__hint">Popover opens below</span>
          </div>
        </div>

        <!-- Right Column: Outside Targets (Never covered by popover) -->
        <div class="stage__col stage__col--targets">
          <span class="col-label">Outside Test Targets</span>

          <div class="target-item">
            <button
              ref="whitelistBtn"
              type="button"
              class="btn btn--whitelist"
              @click="handleWhitelistClick"
            >
              ★ Whitelisted Button
            </button>
            <span class="target-desc">Ignored via <code>shouldIgnore</code></span>
          </div>

          <div class="scroll-test">
            <div class="scroll-test__header">
              <span>External scroll container</span>
              <span class="scroll-test__tag">ignoreScrollbar: {{ ignoreScrollbar }}</span>
            </div>
            <div class="scroll-test__box">
              <div v-for="i in 8" :key="i" class="scroll-test__row">
                Scroll row {{ i }} — click this scrollbar gutter
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Popover Overlay -->
      <Teleport to="body">
        <div v-if="isOpen" ref="floating" class="popover" :style="position.styles.value">
          <div class="popover__header">
            <span class="popover__title">Floating Popover</span>
            <button type="button" class="popover__close" aria-label="Close" @click="isOpen = false">
              ×
            </button>
          </div>

          <div class="popover__drag-zone">
            <span class="drag-zone__label">✍️ Text Selection Drag Test</span>
            <p class="drag-zone__text">
              Highlight this text, drag your cursor outside into the canvas, and release. The
              popover stays open!
            </p>
          </div>

          <div class="popover__actions">
            <button
              type="button"
              class="btn btn--sub"
              @click="logInteraction('Clicked inside button (stays open)', 'ignore')"
            >
              Click inside (stays open)
            </button>

            <button
              ref="subTrigger"
              type="button"
              class="btn btn--nested"
              @click="isSubmenuOpen = !isSubmenuOpen"
            >
              <span>{{ isSubmenuOpen ? "Close Submenu" : "Open Submenu" }}</span>
              <span>›</span>
            </button>
          </div>
        </div>
      </Teleport>

      <!-- Nested Submenu Overlay -->
      <Teleport to="body">
        <div
          v-if="isSubmenuOpen"
          ref="subFloating"
          class="popover popover--sub"
          :style="subPosition.styles.value"
        >
          <div class="popover__header">
            <span class="popover__title">Nested Submenu</span>
            <button
              type="button"
              class="popover__close"
              aria-label="Close"
              @click="isSubmenuOpen = false"
            >
              ×
            </button>
          </div>
          <p class="popover__hint">
            Clicking inside the parent popover closes this submenu while keeping the parent open.
            Clicking outside closes both.
          </p>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: inherit;
}

/* Header */
.demo__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f7f8f8;
}

.demo__desc {
  margin: 0;
  font-size: 12px;
  color: rgba(247, 248, 248, 0.55);
  line-height: 1.5;
}

/* Badges */
.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  transition: all 0.15s ease;
}

.badge--active {
  background: rgba(94, 106, 210, 0.2);
  color: #bec6ff;
  border: 1px solid rgba(94, 106, 210, 0.4);
}

.badge--muted {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(247, 248, 248, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Controls Bar (Pinned at top) */
.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-bar__toggles {
  display: flex;
  gap: 16px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(247, 248, 248, 0.8);
  cursor: pointer;
}

.toggle__input {
  accent-color: #5e6ad2;
  cursor: pointer;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.status-pill--dismiss {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

.status-pill--ignore {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  color: #fcd34d;
}

.status-pill__label {
  color: rgba(247, 248, 248, 0.4);
}

.status-pill__value {
  font-family: monospace;
}

/* Stage Area */
.stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.stage__instructions {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.35);
  text-align: center;
}

.stage__grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 620px) {
  .stage__grid {
    grid-template-columns: 1fr;
  }
}

.stage__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.col-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(247, 248, 248, 0.4);
}

/* Drop Zone Placeholder */
.drop-zone {
  min-height: 240px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.drop-zone.is-open {
  border-color: transparent;
}

.drop-zone__hint {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.2);
}

/* Target Column */
.target-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.target-desc {
  font-size: 10px;
  color: rgba(247, 248, 248, 0.4);
}

.target-desc code {
  color: #fbbf24;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn--primary {
  background: #5e6ad2;
  color: #ffffff;
  border-color: #5e6ad2;
}

.btn--primary:hover {
  background: #6f7be8;
}

.btn--whitelist {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.25);
  width: fit-content;
}

.btn--whitelist:hover {
  background: rgba(245, 158, 11, 0.18);
}

.btn--sub {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(247, 248, 248, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  width: 100%;
}

.btn--sub:hover {
  background: rgba(255, 255, 255, 0.09);
}

.btn--nested {
  background: rgba(94, 106, 210, 0.1);
  color: #bec6ff;
  border-color: rgba(94, 106, 210, 0.25);
  width: 100%;
  justify-content: space-between;
}

.btn--nested:hover {
  background: rgba(94, 106, 210, 0.18);
}

/* Scroll Test Box */
.scroll-test {
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.scroll-test__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.5);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.scroll-test__tag {
  font-family: monospace;
  font-size: 10px;
  color: #bec6ff;
}

.scroll-test__box {
  max-height: 120px;
  overflow-y: scroll;
  padding: 6px 10px;
}

.scroll-test__row {
  font-size: 11px;
  padding: 4px 0;
  color: rgba(247, 248, 248, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.scroll-test__row:last-child {
  border-bottom: 0;
}

/* Popover Overlay */
.popover {
  position: absolute;
  z-index: 1000;
  width: 270px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: #14161c;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.12);
}

.popover--sub {
  width: 210px;
  background: #191c24;
}

.popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.popover__title {
  font-size: 12px;
  font-weight: 600;
  color: #f7f8f8;
}

.popover__close {
  background: transparent;
  border: 0;
  color: rgba(247, 248, 248, 0.4);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.popover__close:hover {
  color: #f7f8f8;
}

.popover__drag-zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 6px;
  background: rgba(94, 106, 210, 0.07);
  border: 1px solid rgba(94, 106, 210, 0.2);
}

.drag-zone__label {
  font-size: 10px;
  font-weight: 600;
  color: #bec6ff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.drag-zone__text {
  margin: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.85);
  line-height: 1.4;
  user-select: text;
  cursor: text;
}

.popover__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popover__hint {
  margin: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.6);
  line-height: 1.4;
}
</style>
