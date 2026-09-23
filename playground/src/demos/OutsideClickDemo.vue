<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { useFloatingNode, useOutsideClick, usePosition } from "@/composables";

// --- Configuration toggles ---------------------------------------------------

const leafFirst = ref(true);
const eventType = ref<"pointerdown" | "click">("pointerdown");
const ignoreScrollbar = ref(true);
const ignoreDrag = ref(true);

// --- Activity log ------------------------------------------------------------

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "dismiss" | "ignore";
}

const logs = ref<LogEntry[]>([]);
let logCounter = 0;

function addLog(message: string, type: "info" | "dismiss" | "ignore" = "info") {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  logs.value.unshift({ id: ++logCounter, time, message, type });
  if (logs.value.length > 20) {
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
  addLog("Clicked whitelisted button. Outside click ignored.", "ignore");
}

function checkIgnoreClick(_event: MouseEvent, target: EventTarget | null): boolean {
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
  leafFirst,
  event: eventType.value,
  ignoreScrollbar: ignoreScrollbar.value,
  ignoreDrag: ignoreDrag.value,
  shouldIgnore: checkIgnoreClick,
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
  leafFirst,
  event: eventType.value,
  ignoreScrollbar: ignoreScrollbar.value,
  ignoreDrag: ignoreDrag.value,
  shouldIgnore: checkIgnoreClick,
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
  leafFirst,
  event: eventType.value,
  ignoreScrollbar: ignoreScrollbar.value,
  ignoreDrag: ignoreDrag.value,
  shouldIgnore: checkIgnoreClick,
});

// --- Lifecycle logging -------------------------------------------------------

watch(rootOpen, (isOpen) => {
  addLog(
    isOpen ? "Level 0: Dialog opened" : "Level 0: Dialog dismissed",
    isOpen ? "info" : "dismiss",
  );
});

watch(childOpen, (isOpen) => {
  addLog(
    isOpen ? "Level 1: Filter menu opened" : "Level 1: Filter menu dismissed",
    isOpen ? "info" : "dismiss",
  );
});

watch(leafOpen, (isOpen) => {
  addLog(
    isOpen ? "Level 2: Tag picker opened" : "Level 2: Tag picker dismissed",
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
</script>

<template>
  <div class="demo-container">
    <header class="demo-header">
      <div class="demo-title-row">
        <h2 class="demo-title">Outside click stack</h2>
        <span class="demo-badge"> {{ activeStackCount }} active on stack </span>
      </div>
      <p class="demo-subtitle">
        Test multi-level outside click coordination, leaf-first unpeeling, drag suppression, and
        scrollbar filtering.
      </p>
    </header>

    <!-- Controls Toolbar -->
    <section class="controls-panel">
      <div class="controls-grid">
        <label class="toggle-control">
          <input v-model="leafFirst" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">leafFirst</span>
          <span class="toggle-desc">
            {{ leafFirst ? "True: peel leaf first" : "False: dismiss all" }}
          </span>
        </label>

        <label class="toggle-control">
          <span class="toggle-label">event</span>
          <select v-model="eventType" class="select-input">
            <option value="pointerdown">pointerdown</option>
            <option value="click">click</option>
          </select>
        </label>

        <label class="toggle-control">
          <input v-model="ignoreScrollbar" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">ignoreScrollbar</span>
          <span class="toggle-desc">{{ ignoreScrollbar ? "Enabled" : "Disabled" }}</span>
        </label>

        <label class="toggle-control">
          <input v-model="ignoreDrag" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">ignoreDrag</span>
          <span class="toggle-desc">{{ ignoreDrag ? "Enabled" : "Disabled" }}</span>
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
    </section>

    <!-- Main Workspace -->
    <div class="workspace-grid">
      <!-- Interactive Stage -->
      <section class="stage-area">
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
            Click this scrollbar to test ignoreScrollbar. When true, clicks on this scrollbar leave
            the dialog open. When false, clicking this scrollbar dismisses the dialog.
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
              Root entry on the stack. With leafFirst set to true, clicking outside while children
              are open will dismiss the child first.
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
              <div class="test-card__title">Drag gesture test area</div>
              <p class="test-card__text">
                Select text here, drag pointer outside this card, and release. If ignoreDrag is
                enabled and event is click, the dialog stays open.
              </p>
            </div>

            <!-- Scrollbar test container -->
            <div class="test-card">
              <div class="test-card__title">Scrollbar test box</div>
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
              Child of Level 0. Clicking outside this menu will dismiss it before the root dialog
              when leafFirst is true.
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
              Deepest node. This leaf always receives the first dismissal signal in the stack.
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

.select-input {
  padding: 4px 8px;
  border-radius: 6px;
  background: #16181d;
  color: #f7f8f8;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 12px;
  cursor: pointer;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
}

.btn--highlight {
  background: rgba(46, 160, 67, 0.15);
  color: #7ee787;
  border-color: rgba(46, 160, 67, 0.35);
}

.btn--highlight:hover {
  background: rgba(46, 160, 67, 0.25);
}

.btn--nested {
  background: rgba(94, 106, 210, 0.15);
  color: #bec6ff;
  border-color: rgba(94, 106, 210, 0.3);
}

.btn--nested:hover {
  background: rgba(94, 106, 210, 0.25);
}

.btn-text {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.5);
  cursor: pointer;
}

.btn-text:hover {
  color: #f7f8f8;
}

/* Workspace */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .workspace-grid {
    grid-template-columns: 1fr 280px;
  }
}

.stage-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  min-height: 260px;
  padding: 24px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
}

.external-scroll-card {
  width: 100%;
  max-width: 320px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.external-scroll-box {
  max-height: 110px;
  overflow-y: scroll;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  scrollbar-width: auto;
  scrollbar-color: rgba(255, 255, 255, 0.35) rgba(0, 0, 0, 0.2);
}

.external-scroll-box::-webkit-scrollbar {
  width: 16px;
}

.external-scroll-box::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}

.external-scroll-box::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

/* Inspector */
.inspector-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector-card {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.inspector-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.85);
}

.inspector-count {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.4);
}

.stack-tree {
  list-style: none;
  margin: 0;
  padding: 0;
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
  font-size: 11px;
  color: rgba(247, 248, 248, 0.5);
  transition: all 0.14s ease;
}

.stack-item.is-active {
  background: rgba(94, 106, 210, 0.1);
  border-color: rgba(94, 106, 210, 0.25);
  color: #f7f8f8;
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
  background: rgba(255, 255, 255, 0.2);
}

.stack-item.is-active .stack-indicator {
  background: #7ee787;
  box-shadow: 0 0 6px rgba(126, 231, 135, 0.6);
}

.stack-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.stack-status {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Event log */
.log-container {
  height: 180px;
  overflow-y: auto;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.log-empty {
  font-size: 11px;
  color: rgba(247, 248, 248, 0.3);
  text-align: center;
  padding: 40px 10px;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(247, 248, 248, 0.7);
}

.log-time {
  color: rgba(247, 248, 248, 0.35);
  flex-shrink: 0;
}

.log-item--dismiss {
  color: #ff9b9b;
}

.log-item--ignore {
  color: #7ee787;
}
</style>

<style>
/* Unscoped floating panels rendered into body */
.floating-panel {
  background: #16181d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 0, 0, 0.4);
  color: #f7f8f8;
  z-index: 60;
  outline: none;
}

.root-panel {
  width: 320px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-panel {
  width: 240px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaf-panel {
  width: 210px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.panel-tag.level-0 {
  background: rgba(94, 106, 210, 0.2);
  color: #bec6ff;
}

.panel-tag.level-1 {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.panel-tag.level-2 {
  background: rgba(236, 72, 153, 0.2);
  color: #f472b6;
}

.icon-close {
  background: transparent;
  border: 0;
  color: rgba(247, 248, 248, 0.4);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.icon-close:hover {
  color: #f7f8f8;
}

.panel-description {
  margin: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.65);
  line-height: 1.4;
}

.test-card {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.test-card__title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(247, 248, 248, 0.8);
}

.test-card__text {
  margin: 0;
  font-size: 10px;
  color: rgba(247, 248, 248, 0.5);
  line-height: 1.4;
  user-select: text;
  cursor: text;
}

.scroll-box {
  max-height: 90px;
  overflow-y: scroll;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.scroll-row {
  font-size: 10px;
  color: rgba(247, 248, 248, 0.6);
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.scroll-row:last-child {
  border-bottom: none;
}

/* Menu list */
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
  padding: 6px 8px;
  border-radius: 5px;
  border: 0;
  background: transparent;
  color: rgba(247, 248, 248, 0.85);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.menu-item__arrow {
  color: rgba(247, 248, 248, 0.4);
}

/* Tag grid */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.tag-pill {
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: opacity 0.12s ease;
}

.tag-pill:hover {
  opacity: 0.85;
}

.tag-pill--red {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.tag-pill--blue {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.tag-pill--green {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.tag-pill--purple {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
  color: #d8b4fe;
}
</style>
