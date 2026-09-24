<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { useFloatingNode, useOutsideClick, usePosition } from "@/composables";

// --- Configuration toggles ---------------------------------------------------

const enabled = ref(true);
const ignoreScrollbar = ref(true);

// --- Activity log ------------------------------------------------------------

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "dismiss" | "ignore" | "touch";
}

const logs = ref<LogEntry[]>([]);
let logCounter = 0;

function addLog(message: string, type: "info" | "dismiss" | "ignore" | "touch" = "info") {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  logs.value.unshift({ id: ++logCounter, time, message, type });
  if (logs.value.length > 25) {
    logs.value.pop();
  }
}

function clearLogs() {
  logs.value = [];
}

// --- Ignored target ----------------------------------------------------------

const whitelistEl = useTemplateRef<HTMLElement>("whitelistBtn");
const whitelistedClickCount = ref(0);

function handleWhitelistClick() {
  whitelistedClickCount.value++;
  addLog("Clicked whitelisted target. Outside click ignored.", "ignore");
}

function checkIgnoreClick(_event: MouseEvent | PointerEvent, target: EventTarget | null): boolean {
  const btn = whitelistEl.value;
  if (!btn || !target || !(target instanceof Node)) return false;
  return btn.contains(target);
}

// --- Level 0 (Root Dialog) ---------------------------------------------------

const rootTriggerEl = useTemplateRef<HTMLElement>("rootTrigger");
const rootFloatingEl = useTemplateRef<HTMLElement>("rootFloating");
const rootOpen = ref(false);

const rootNode = useFloatingNode({
  anchorEl: rootTriggerEl,
  floatingEl: rootFloatingEl,
  open: rootOpen,
});

const rootPosition = usePosition(rootNode, {
  placement: "bottom-start",
  middlewares: { offset: 10, flip: true, shift: { padding: 12 } },
});

useOutsideClick(rootNode, {
  enabled,
  ignoreScrollbar,
  shouldIgnore: checkIgnoreClick,
  onOutsideClick(e) {
    const isTouch = (e as PointerEvent).pointerType === "touch";
    const isVirtual = e.detail === 0;
    const kind = isTouch ? "Touch Tap" : isVirtual ? "Keyboard/Virtual" : "Mouse Press";
    addLog(`Level 0: Dismissed by outside [${e.type}] (${kind})`, "dismiss");
    rootOpen.value = false;
  },
});

// --- Level 1 (Child Popover) -------------------------------------------------

const childTriggerEl = useTemplateRef<HTMLElement>("childTrigger");
const childFloatingEl = useTemplateRef<HTMLElement>("childFloating");
const childOpen = ref(false);

const childNode = useFloatingNode({
  anchorEl: childTriggerEl,
  floatingEl: childFloatingEl,
  open: childOpen,
  parent: rootNode,
});

const childPosition = usePosition(childNode, {
  placement: "right-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

useOutsideClick(childNode, {
  enabled,
  ignoreScrollbar,
  shouldIgnore: checkIgnoreClick,
  onOutsideClick(e) {
    const isTouch = (e as PointerEvent).pointerType === "touch";
    const isVirtual = e.detail === 0;
    const kind = isTouch ? "Touch Tap" : isVirtual ? "Keyboard/Virtual" : "Mouse Press";
    addLog(`Level 1: Dismissed by outside [${e.type}] (${kind})`, "dismiss");
    childOpen.value = false;
  },
});

// --- Level 2 (Grandchild / Leaf Submenu) --------------------------------------

const leafTriggerEl = useTemplateRef<HTMLElement>("leafTrigger");
const leafFloatingEl = useTemplateRef<HTMLElement>("leafFloating");
const leafOpen = ref(false);

const leafNode = useFloatingNode({
  anchorEl: leafTriggerEl,
  floatingEl: leafFloatingEl,
  open: leafOpen,
  parent: childNode,
});

const leafPosition = usePosition(leafNode, {
  placement: "right-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 12 } },
});

useOutsideClick(leafNode, {
  enabled,
  ignoreScrollbar,
  shouldIgnore: checkIgnoreClick,
  onOutsideClick(e) {
    const isTouch = (e as PointerEvent).pointerType === "touch";
    const isVirtual = e.detail === 0;
    const kind = isTouch ? "Touch Tap" : isVirtual ? "Keyboard/Virtual" : "Mouse Press";
    addLog(`Level 2: Dismissed by outside [${e.type}] (${kind})`, "dismiss");
    leafOpen.value = false;
  },
});

// --- Lifecycle logging -------------------------------------------------------

watch(rootOpen, (isOpen) => {
  addLog(isOpen ? "Level 0: Dialog opened" : "Level 0: Dialog closed", isOpen ? "info" : "dismiss");
});

watch(childOpen, (isOpen) => {
  addLog(
    isOpen ? "Level 1: Filter menu opened" : "Level 1: Filter menu closed",
    isOpen ? "info" : "dismiss",
  );
});

watch(leafOpen, (isOpen) => {
  addLog(
    isOpen ? "Level 2: Tag picker opened" : "Level 2: Tag picker closed",
    isOpen ? "info" : "dismiss",
  );
});

// --- Helpers -----------------------------------------------------------------

function openAllLayers() {
  rootOpen.value = true;
  void nextTick(() => {
    childOpen.value = true;
    void nextTick(() => {
      leafOpen.value = true;
    });
  });
}

function closeAllLayers() {
  leafOpen.value = false;
  childOpen.value = false;
  rootOpen.value = false;
}

const activeStackCount = computed(() => {
  let count = 0;
  if (rootOpen.value) count++;
  if (childOpen.value) count++;
  if (leafOpen.value) count++;
  return count;
});

// --- Device & Input Simulators -----------------------------------------------

const testStageEl = useTemplateRef<HTMLElement>("stageArea");

function simulateTouchScroll() {
  const target = testStageEl.value ?? document.body;
  addLog("Simulating Touch Scroll: dispatched pointerdown with pointerType='touch'", "touch");
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
    }),
  );
  addLog("Touch scroll started. Dialog safely stays open (no premature dismissal).", "info");
}

function simulateTouchTap() {
  const target = testStageEl.value ?? document.body;
  addLog("Simulating Touch Tap: dispatched click with pointerType='touch'", "touch");
  target.dispatchEvent(
    new PointerEvent("click", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
    }),
  );
}

function simulateVirtualClick() {
  const target = testStageEl.value ?? document.body;
  addLog("Simulating Keyboard Click: dispatched click with detail=0", "info");
  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      detail: 0,
    }),
  );
}
</script>

<template>
  <div class="demo-container">
    <header class="demo-header">
      <div class="demo-title-row">
        <h2 class="demo-title">Outside click coordination</h2>
        <span class="demo-badge"> {{ activeStackCount }} active on stack </span>
      </div>
      <p class="demo-subtitle">
        Zero-config outside click with unified platform handling: instant mouse pointerdown,
        scroll-safe touch tap, keyboard virtual click, and text drag protection.
      </p>
    </header>

    <!-- Unified Engine Info Banner -->
    <div class="engine-banner">
      <div class="engine-banner__item">
        <span class="engine-banner__icon">🖱️</span>
        <div>
          <span class="engine-banner__label">Desktop Mouse & Pen</span>
          <span class="engine-banner__sub">Instant on <code>pointerdown</code></span>
        </div>
      </div>
      <div class="engine-banner__sep" />
      <div class="engine-banner__item">
        <span class="engine-banner__icon">📱</span>
        <div>
          <span class="engine-banner__label">Touchscreens</span>
          <span class="engine-banner__sub">Scroll-safe on <code>click</code> (tap)</span>
        </div>
      </div>
      <div class="engine-banner__sep" />
      <div class="engine-banner__item">
        <span class="engine-banner__icon">⌨️</span>
        <div>
          <span class="engine-banner__label">Keyboard / A11y</span>
          <span class="engine-banner__sub">Accessible on <code>detail === 0</code></span>
        </div>
      </div>
      <div class="engine-banner__sep" />
      <div class="engine-banner__item">
        <span class="engine-banner__icon">✍️</span>
        <div>
          <span class="engine-banner__label">Text Selection</span>
          <span class="engine-banner__sub">Drag inside-to-outside immune</span>
        </div>
      </div>
    </div>

    <!-- Controls Toolbar -->
    <section class="controls-panel">
      <div class="controls-grid">
        <label class="toggle-control">
          <input v-model="enabled" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">enabled</span>
          <span class="toggle-desc">{{ enabled ? "Active" : "Disabled" }}</span>
        </label>

        <label class="toggle-control">
          <input v-model="ignoreScrollbar" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">ignoreScrollbar</span>
          <span class="toggle-desc">{{ ignoreScrollbar ? "Enabled" : "Disabled" }}</span>
        </label>
      </div>

      <div class="actions-row">
        <button type="button" class="btn btn--secondary" @click="openAllLayers">
          Open all 3 levels
        </button>
        <button type="button" class="btn btn--secondary" @click="closeAllLayers">Close all</button>
        <button
          ref="whitelistBtn"
          type="button"
          class="btn btn--highlight"
          @click="handleWhitelistClick"
        >
          Whitelisted target [ignoreClick: {{ whitelistedClickCount }}]
        </button>
      </div>

      <!-- Simulator Row -->
      <div class="simulator-row">
        <span class="simulator-label">Simulate gestures:</span>
        <button type="button" class="btn btn--sim" @click="simulateTouchScroll">
          📱 Touch scroll (ignored)
        </button>
        <button type="button" class="btn btn--sim" @click="simulateTouchTap">
          👆 Touch tap (dismisses)
        </button>
        <button type="button" class="btn btn--sim" @click="simulateVirtualClick">
          ⌨️ Virtual click (dismisses)
        </button>
      </div>
    </section>

    <!-- Main Workspace -->
    <div class="workspace-grid">
      <!-- Interactive Stage -->
      <section ref="stageArea" class="stage-area">
        <button
          ref="rootTrigger"
          type="button"
          class="btn btn--primary"
          @click="rootOpen = !rootOpen"
        >
          {{ rootOpen ? "Close Dialog" : "Open Dialog (Level 0)" }}
        </button>

        <!-- External scrollable container outside all popups -->
        <div class="external-scroll-card">
          <div class="test-card__title">External scrollbar (outside popups)</div>
          <p class="test-card__text">
            Click this scrollbar to test <code>ignoreScrollbar</code>. When true, clicks on this
            scrollbar gutter leave the dialog open.
          </p>
          <div class="external-scroll-box">
            <div v-for="i in 15" :key="i" class="scroll-row">External content item {{ i }}</div>
          </div>
        </div>

        <!-- Level 0: Root Dialog Panel -->
        <Teleport to="body">
          <div
            v-if="rootOpen"
            ref="rootFloating"
            class="floating-panel root-panel"
            :style="rootPosition.styles.value"
          >
            <div class="panel-header">
              <div class="panel-tag level-0">Level 0: Root Dialog</div>
              <button type="button" class="icon-close" @click="rootOpen = false">×</button>
            </div>

            <p class="panel-description">
              Root overlay. Clean-slate dismissal closes all open descendant levels simultaneously
              when clicking outside.
            </p>

            <div class="panel-actions">
              <button
                ref="childTrigger"
                type="button"
                class="btn btn--nested"
                @click="childOpen = !childOpen"
              >
                {{ childOpen ? "Close Filter Menu" : "Open Filter Menu (Level 1) ›" }}
              </button>
            </div>

            <!-- Drag test area -->
            <div class="test-card">
              <div class="test-card__title">Text drag selection test</div>
              <p class="test-card__text select-test">
                Select this text with your mouse, drag outside this card, and release. Because mouse
                pointerdown occurred inside, trailing clicks outside are safely ignored!
              </p>
            </div>

            <!-- Scrollbar test container -->
            <div class="test-card">
              <div class="test-card__title">Panel internal scrollbar</div>
              <div class="scroll-box">
                <div v-for="i in 12" :key="i" class="scroll-row">
                  Scroll item {{ i }}. Clicking the scrollbar will not dismiss.
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Level 1: Child Popover -->
        <Teleport to="body">
          <div
            v-if="childOpen"
            ref="childFloating"
            class="floating-panel child-panel"
            :style="childPosition.styles.value"
          >
            <div class="panel-header">
              <div class="panel-tag level-1">Level 1: Filter Menu</div>
              <button type="button" class="icon-close" @click="childOpen = false">×</button>
            </div>

            <p class="panel-description">
              Child of Level 0. Clicking inside Level 0's dialog closes this child menu while
              leaving the dialog open.
            </p>

            <div class="menu-list">
              <button type="button" class="menu-item" @click="addLog('Selected: All Projects')">
                All Projects
              </button>
              <button type="button" class="menu-item" @click="addLog('Selected: Active Tasks')">
                Active Tasks
              </button>
              <button
                ref="leafTrigger"
                type="button"
                class="menu-item menu-item--has-sub"
                @click="leafOpen = !leafOpen"
              >
                <span>Filter by tag</span>
                <span class="menu-item__arrow">›</span>
              </button>
            </div>
          </div>
        </Teleport>

        <!-- Level 2: Leaf Submenu -->
        <Teleport to="body">
          <div
            v-if="leafOpen"
            ref="leafFloating"
            class="floating-panel leaf-panel"
            :style="leafPosition.styles.value"
          >
            <div class="panel-header">
              <div class="panel-tag level-2">Level 2: Tag Picker (Leaf)</div>
              <button type="button" class="icon-close" @click="leafOpen = false">×</button>
            </div>

            <p class="panel-description">
              Deepest node in the hierarchy. Clicking outside the entire tree dismisses all 3
              levels.
            </p>

            <div class="tag-grid">
              <button
                type="button"
                class="tag-pill tag-pill--red"
                @click="addLog('Selected tag: Bug', 'info')"
              >
                Bug
              </button>
              <button
                type="button"
                class="tag-pill tag-pill--blue"
                @click="addLog('Selected tag: Feature', 'info')"
              >
                Feature
              </button>
              <button
                type="button"
                class="tag-pill tag-pill--green"
                @click="addLog('Selected tag: Docs', 'info')"
              >
                Docs
              </button>
              <button
                type="button"
                class="tag-pill tag-pill--purple"
                @click="addLog('Selected tag: Core', 'info')"
              >
                Core
              </button>
            </div>
          </div>
        </Teleport>
      </section>

      <!-- Live Stack & Event Log Sidebars -->
      <aside class="inspector-column">
        <!-- Stack State -->
        <div class="inspector-card">
          <div class="inspector-header">
            <h3 class="inspector-title">Active stack hierarchy</h3>
            <span class="inspector-count">{{ activeStackCount }} nodes</span>
          </div>

          <ul class="stack-tree">
            <li class="stack-item" :class="{ 'is-active': rootOpen }">
              <span class="stack-indicator" />
              <div class="stack-info">
                <span class="stack-name">Level 0: Root Dialog</span>
                <span class="stack-status">{{ rootOpen ? "Open" : "Closed" }}</span>
              </div>
            </li>

            <li class="stack-item stack-item--indent-1" :class="{ 'is-active': childOpen }">
              <span class="stack-indicator" />
              <div class="stack-info">
                <span class="stack-name">Level 1: Filter Menu</span>
                <span class="stack-status">{{ childOpen ? "Open" : "Closed" }}</span>
              </div>
            </li>

            <li class="stack-item stack-item--indent-2" :class="{ 'is-active': leafOpen }">
              <span class="stack-indicator" />
              <div class="stack-info">
                <span class="stack-name">Level 2: Tag Picker</span>
                <span class="stack-status">{{ leafOpen ? "Open" : "Closed" }}</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Event Log -->
        <div class="inspector-card">
          <div class="inspector-header">
            <h3 class="inspector-title">Event log</h3>
            <button type="button" class="btn-text" @click="clearLogs">Clear</button>
          </div>

          <div class="log-container">
            <div v-if="logs.length === 0" class="log-empty">
              Interact with elements or click outside to see live events.
            </div>
            <ul v-else class="log-list">
              <li
                v-for="log in logs"
                :key="log.id"
                class="log-item"
                :class="`log-item--${log.type}`"
              >
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.demo-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f7f8f8;
}

.demo-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(94, 106, 210, 0.2);
  color: #bec6ff;
  border: 1px solid rgba(94, 106, 210, 0.35);
}

.demo-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(247, 248, 248, 0.6);
  line-height: 1.5;
}

/* Engine banner */
.engine-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(94, 106, 210, 0.08);
  border: 1px solid rgba(94, 106, 210, 0.2);
  flex-wrap: wrap;
}

.engine-banner__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.engine-banner__icon {
  font-size: 18px;
}

.engine-banner__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #e4e7ff;
}

.engine-banner__sub {
  display: block;
  font-size: 10px;
  color: rgba(247, 248, 248, 0.5);
}

.engine-banner__sub code {
  color: #bec6ff;
}

.engine-banner__sep {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
}

/* Controls */
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.toggle-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.toggle-checkbox {
  accent-color: #5e6ad2;
  cursor: pointer;
}

.toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.85);
}

.toggle-desc {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.45);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.simulator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.simulator-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

.btn--primary {
  background: #5e6ad2;
  color: #ffffff;
  border-color: #5e6ad2;
}

.btn--primary:hover {
  background: #717cef;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(247, 248, 248, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn--highlight {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}

.btn--highlight:hover {
  background: rgba(245, 158, 11, 0.2);
}

.btn--sim {
  background: rgba(94, 106, 210, 0.12);
  color: #bec6ff;
  border-color: rgba(94, 106, 210, 0.25);
  font-size: 11px;
  padding: 5px 10px;
}

.btn--sim:hover {
  background: rgba(94, 106, 210, 0.22);
  color: #ffffff;
}

.btn--nested {
  background: rgba(255, 255, 255, 0.08);
  color: #f7f8f8;
  border-color: rgba(255, 255, 255, 0.15);
  width: 100%;
  justify-content: space-between;
}

.btn--nested:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-text {
  background: transparent;
  border: 0;
  color: rgba(247, 248, 248, 0.45);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-text:hover {
  color: #f7f8f8;
}

/* Workspace Grid */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 768px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

.stage-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  min-height: 380px;
}

/* Floating Panels */
.floating-panel {
  position: absolute;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  background: #16181d;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.12);
}

.root-panel {
  width: 320px;
}

.child-panel {
  width: 240px;
}

.leaf-panel {
  width: 220px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.panel-tag.level-0 {
  background: rgba(94, 106, 210, 0.2);
  color: #bec6ff;
  border: 1px solid rgba(94, 106, 210, 0.4);
}

.panel-tag.level-1 {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.panel-tag.level-2 {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.icon-close {
  background: transparent;
  border: 0;
  color: rgba(247, 248, 248, 0.45);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.icon-close:hover {
  color: #f7f8f8;
}

.panel-description {
  margin: 0;
  font-size: 12px;
  color: rgba(247, 248, 248, 0.6);
  line-height: 1.4;
}

/* Menu Items */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: rgba(247, 248, 248, 0.85);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.menu-item__arrow {
  color: rgba(247, 248, 248, 0.4);
}

/* Tag Grid */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.tag-pill {
  padding: 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.06);
  color: #f7f8f8;
}

.tag-pill--red {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.tag-pill--blue {
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}

.tag-pill--green {
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);
}

.tag-pill--purple {
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
}

/* Test Cards */
.test-card {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.test-card__title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.7);
  margin-bottom: 6px;
}

.test-card__text {
  margin: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.5);
  line-height: 1.4;
}

.select-test {
  user-select: text;
  background: rgba(94, 106, 210, 0.08);
  padding: 6px;
  border-radius: 4px;
  cursor: text;
}

.scroll-box {
  max-height: 90px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 4px 6px;
}

.scroll-row {
  font-size: 11px;
  padding: 3px 0;
  color: rgba(247, 248, 248, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.scroll-row:last-child {
  border-bottom: 0;
}

.external-scroll-card {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.external-scroll-box {
  max-height: 100px;
  overflow-y: scroll;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 6px;
  margin-top: 8px;
}

/* Inspector Column */
.inspector-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inspector-card {
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.inspector-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.85);
}

.inspector-count {
  font-size: 11px;
  color: #bec6ff;
  font-weight: 500;
}

/* Stack Tree */
.stack-tree {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stack-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  opacity: 0.45;
  transition: opacity 0.14s ease;
}

.stack-item.is-active {
  opacity: 1;
  background: rgba(94, 106, 210, 0.08);
  border-color: rgba(94, 106, 210, 0.25);
}

.stack-item--indent-1 {
  margin-left: 12px;
}

.stack-item--indent-2 {
  margin-left: 24px;
}

.stack-indicator {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
}

.stack-item.is-active .stack-indicator {
  background: #5e6ad2;
  box-shadow: 0 0 6px #5e6ad2;
}

.stack-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.stack-name {
  font-size: 11px;
  font-weight: 500;
  color: rgba(247, 248, 248, 0.85);
}

.stack-status {
  font-size: 10px;
  color: rgba(247, 248, 248, 0.45);
}

.stack-item.is-active .stack-status {
  color: #bec6ff;
}

/* Log */
.log-container {
  max-height: 220px;
  overflow-y: auto;
}

.log-empty {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.4);
  font-style: italic;
  padding: 8px 0;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 11px;
  line-height: 1.4;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
}

.log-item--info {
  color: rgba(247, 248, 248, 0.7);
}

.log-item--dismiss {
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
}

.log-item--ignore {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.08);
}

.log-item--touch {
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.08);
}

.log-time {
  color: rgba(247, 248, 248, 0.35);
  font-family: monospace;
  flex-shrink: 0;
}

.log-message {
  word-break: break-word;
}
</style>
