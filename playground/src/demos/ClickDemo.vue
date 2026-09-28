<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { useClick, useEscapeKey, useFloatingNode, usePosition } from "@/composables";

// --- Options -----------------------------------------------------------------

const eventType = ref<"click" | "mousedown">("click");
const toggle = ref(true);
const ignoreKeyboard = ref(false);
const ignoreMouse = ref(false);

// --- Floating Node -----------------------------------------------------------

const triggerEl = useTemplateRef<HTMLElement>("trigger");
const floatingEl = useTemplateRef<HTMLElement>("floating");
const isOpen = ref(false);

const node = useFloatingNode({
  anchorEl: triggerEl,
  floatingEl,
  open: isOpen,
});

const position = usePosition(node, {
  placement: "bottom",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

useClick(node, {
  event: eventType,
  toggle,
  ignoreKeyboard,
  ignoreMouse,
});

useEscapeKey(node);
</script>

<template>
  <div class="demo">
    <!-- Header -->
    <header class="demo__header">
      <div class="demo__title-row">
        <h2 class="demo__title">Click Trigger (useClick)</h2>
        <span class="badge" :class="isOpen ? 'badge--active' : 'badge--muted'">
          {{ isOpen ? "Open" : "Closed" }}
        </span>
      </div>
      <p class="demo__desc">
        Toggles floating elements on pointer click and keyboard (Space / Enter).
      </p>
    </header>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="controls-bar__group">
        <span class="controls-bar__label">Event:</span>
        <button
          type="button"
          class="pill-btn"
          :class="{ 'pill-btn--active': eventType === 'click' }"
          @click="eventType = 'click'"
        >
          click
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ 'pill-btn--active': eventType === 'mousedown' }"
          @click="eventType = 'mousedown'"
        >
          mousedown
        </button>
      </div>

      <div class="controls-bar__toggles">
        <label class="toggle">
          <input v-model="toggle" type="checkbox" class="toggle__input" />
          <span class="toggle__text">toggle</span>
        </label>
        <label class="toggle">
          <input v-model="ignoreKeyboard" type="checkbox" class="toggle__input" />
          <span class="toggle__text">ignoreKeyboard</span>
        </label>
        <label class="toggle">
          <input v-model="ignoreMouse" type="checkbox" class="toggle__input" />
          <span class="toggle__text">ignoreMouse</span>
        </label>
      </div>
    </div>

    <!-- Stage -->
    <div class="stage">
      <button ref="trigger" type="button" class="btn btn--primary" :aria-expanded="isOpen">
        {{ isOpen ? "Close Popover" : "Open Popover" }}
      </button>

      <p class="stage__hint">
        Click or press <kbd>Space</kbd> / <kbd>Enter</kbd> to trigger.
        <template v-if="eventType === 'mousedown'">
          <br />Activates instantly on <code>mousedown</code>.
        </template>
        <template v-if="!toggle">
          <br /><code>toggle: false</code> — clicking again will not close.
        </template>
      </p>

      <!-- Floating Element -->
      <Teleport to="body">
        <div v-if="isOpen" ref="floating" class="popover" :style="position.styles.value">
          <div class="popover__header">
            <span class="popover__title">Floating Popover</span>
            <button type="button" class="popover__close" aria-label="Close" @click="isOpen = false">
              ×
            </button>
          </div>
          <p class="popover__body">
            Triggered via <code>useClick</code>. Press <kbd>Esc</kbd> or click the close button to
            dismiss.
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
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  padding: 48px 16px;
  font-family: inherit;
}

/* Header */
.demo__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.demo__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f7f8f8;
}

.demo__desc {
  margin: 0;
  font-size: 13px;
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

/* Controls */
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-bar__group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.controls-bar__label {
  font-size: 12px;
  color: rgba(247, 248, 248, 0.5);
  margin-right: 2px;
}

.pill-btn {
  font-size: 11px;
  font-family: inherit;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(247, 248, 248, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f7f8f8;
}

.pill-btn--active {
  background: rgba(94, 106, 210, 0.25);
  border-color: rgba(94, 106, 210, 0.5);
  color: #bec6ff;
  font-weight: 500;
}

.controls-bar__toggles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: rgba(247, 248, 248, 0.7);
}

.toggle__input {
  accent-color: #5e6ad2;
  cursor: pointer;
}

/* Stage */
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
}

.stage__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(247, 248, 248, 0.45);
  text-align: center;
}

.stage__hint kbd,
.popover__body kbd {
  font-family: inherit;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(247, 248, 248, 0.8);
}

.stage__hint code,
.popover__body code {
  color: #bec6ff;
  font-size: 11px;
}

/* Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn--primary {
  background: #5e6ad2;
  color: #ffffff;
  border-color: #5e6ad2;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.btn--primary:hover {
  background: #6f7be8;
}

/* Popover */
.popover {
  position: absolute;
  z-index: 1000;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  background: #14161c;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.12);
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
  padding: 0 4px;
}

.popover__close:hover {
  color: #f7f8f8;
}

.popover__body {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(247, 248, 248, 0.7);
}
</style>
