<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import { useEscapeKey, useFloatingNode, useFocusTrap } from "@/composables";

// --- State -------------------------------------------------------------------

const mainOpen = ref(false);
const iframeOpen = ref(false);

const mainAnchorRef = shallowRef<HTMLElement | null>(null);
const mainFloatingRef = shallowRef<HTMLElement | null>(null);

const iframeEl = useTemplateRef<HTMLIFrameElement>("iframeEl");
const iframeMountEl = shallowRef<HTMLElement | null>(null);
const iframeAnchorRef = shallowRef<HTMLElement | null>(null);
const iframeFloatingRef = shallowRef<HTMLElement | null>(null);

const activeDocName = ref<"main" | "iframe" | "none">("none");
const lastAction = ref<string>("Ready — click 'Open' on either document.");

// --- VFloat Focus Traps ------------------------------------------------------

// Main Document Trap
const mainNode = useFloatingNode({
  anchorEl: mainAnchorRef,
  floatingEl: mainFloatingRef,
  open: mainOpen,
});

const mainTrap = useFocusTrap(mainNode, {
  modal: true,
  outsideElementsInert: false, // Keep iframe interactive so both can be tested side-by-side
  returnFocus: true,
});

useEscapeKey(mainNode, {
  onEscape: () => {
    mainOpen.value = false;
    lastAction.value = "Escape closed Dialog A (Main Window)";
  },
});

// Iframe Document Trap
const iframeNode = useFloatingNode({
  anchorEl: iframeAnchorRef,
  floatingEl: iframeFloatingRef,
  open: iframeOpen,
});

const iframeTrap = useFocusTrap(iframeNode, {
  modal: true,
  outsideElementsInert: false,
  returnFocus: true,
});

useEscapeKey(iframeNode, {
  onEscape: () => {
    iframeOpen.value = false;
    lastAction.value = "Escape closed Dialog B (Iframe)";
  },
});

// --- Iframe Lifecycle & Setup ------------------------------------------------

let isIframeInitialized = false;

function initIframe() {
  if (isIframeInitialized) return;
  const iframe = iframeEl.value;
  if (!iframe) return;

  const doc = iframe.contentDocument;
  if (!doc) return;

  isIframeInitialized = true;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #0d0e11;
      color: #f7f8f8;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      padding: 0 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.05);
      color: #f7f8f8;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn--primary {
      background: #42b883;
      border-color: #42b883;
      color: #08090a;
      font-weight: 600;
    }
    .btn--primary:hover {
      background: #33a06f;
      border-color: #33a06f;
    }
    .btn--subtle {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: transparent;
      color: #94a3b8;
    }
    .btn--subtle:hover {
      color: #f7f8f8;
      background: rgba(255, 255, 255, 0.06);
    }
    .input {
      width: 100%;
      height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(0, 0, 0, 0.3);
      color: #f7f8f8;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input:focus {
      border-color: #42b883;
      box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.25);
    }
    .dialog {
      margin-top: 8px;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid rgba(66, 184, 131, 0.3);
      background: #14171f;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: #42b883;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div id="mount"></div>
</body>
</html>`);
  doc.close();

  const mount = doc.getElementById("mount");
  if (mount) {
    iframeMountEl.value = mount;
  }

  // Focus tracking inside iframe
  doc.addEventListener("focusin", () => {
    activeDocName.value = "iframe";
  });
  doc.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      lastAction.value = `Tab in Iframe (trapped: ${iframeTrap.isActive.value ? "YES" : "NO"})`;
    }
  });
}

function handleMainFocus(e: FocusEvent) {
  if (e.target === iframeEl.value) {
    activeDocName.value = "iframe";
    return;
  }
  activeDocName.value = "main";
}

function handleMainKeyDown(e: KeyboardEvent) {
  if (e.key === "Tab") {
    lastAction.value = `Tab in Main Window (trapped: ${mainTrap.isActive.value ? "YES" : "NO"})`;
  }
}

onMounted(async () => {
  document.addEventListener("focusin", handleMainFocus);
  document.addEventListener("keydown", handleMainKeyDown);
  await nextTick();
  initIframe();
});

onUnmounted(() => {
  document.removeEventListener("focusin", handleMainFocus);
  document.removeEventListener("keydown", handleMainKeyDown);
});

function closeBoth() {
  mainOpen.value = false;
  iframeOpen.value = false;
  lastAction.value = "Closed all dialogs.";
}
</script>

<template>
  <div class="trap-demo">
    <!-- Header -->
    <header class="demo-header">
      <h2 class="demo-title">Cross-Document Focus Trap</h2>
      <p class="demo-subtitle">
        Both documents are controlled by the same VFloat instance. Open both dialogs to verify that
        <kbd>Tab</kbd> and <kbd>Escape</kbd> stay strictly isolated.
      </p>
    </header>

    <!-- Document Surfaces -->
    <div class="surfaces-stack">
      <!-- Surface A: Main Window -->
      <section class="surface-card" :class="{ 'surface-card--focused': activeDocName === 'main' }">
        <div class="surface-top">
          <div class="surface-identity">
            <span class="doc-dot" :class="{ 'doc-dot--active': activeDocName === 'main' }" />
            <span class="doc-name">Main Window</span>
            <span class="doc-realm">window.document</span>
          </div>
          <span
            class="trap-badge"
            :class="mainTrap.isActive.value ? 'trap-badge--active' : 'trap-badge--idle'"
          >
            {{ mainTrap.isActive.value ? "Trap Active" : "Trap Idle" }}
          </span>
        </div>

        <div class="surface-body">
          <div class="controls-row">
            <button
              ref="mainAnchorRef"
              type="button"
              class="v-btn"
              :class="mainOpen ? 'v-btn--active' : 'v-btn--primary'"
              @click="mainOpen = !mainOpen"
            >
              {{ mainOpen ? "Close Dialog A" : "Open Dialog A" }}
            </button>
            <input
              type="text"
              class="v-input v-input--compact"
              placeholder="Background input in main window"
            />
          </div>

          <!-- Dialog A (Main Window) -->
          <div
            v-if="mainOpen"
            ref="mainFloatingRef"
            class="embedded-dialog"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div class="dialog-top">
              <span class="dialog-title">Dialog A (Main Window)</span>
              <span class="dialog-tag">document.activeElement</span>
            </div>
            <div class="dialog-fields">
              <input type="text" class="v-input" placeholder="Field 1 — press Tab" />
              <input type="text" class="v-input" placeholder="Field 2 — press Tab" />
            </div>
            <div class="dialog-footer">
              <button type="button" class="v-btn v-btn--subtle" @click="mainOpen = false">
                Close
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Surface B: Iframe Window -->
      <section
        class="surface-card"
        :class="{ 'surface-card--focused': activeDocName === 'iframe' }"
      >
        <div class="surface-top">
          <div class="surface-identity">
            <span class="doc-dot" :class="{ 'doc-dot--active': activeDocName === 'iframe' }" />
            <span class="doc-name">Iframe Window</span>
            <span class="doc-realm">iframe.contentDocument</span>
          </div>
          <span
            class="trap-badge"
            :class="iframeTrap.isActive.value ? 'trap-badge--active' : 'trap-badge--idle'"
          >
            {{ iframeTrap.isActive.value ? "Trap Active" : "Trap Idle" }}
          </span>
        </div>

        <div class="surface-body">
          <iframe
            ref="iframeEl"
            src="about:blank"
            class="doc-iframe"
            tabindex="-1"
            @load="initIframe"
          />

          <!-- Teleport into Iframe Document -->
          <Teleport v-if="iframeMountEl" :to="iframeMountEl">
            <div class="content">
              <div style="display: flex; gap: 8px; align-items: center">
                <button
                  ref="iframeAnchorRef"
                  type="button"
                  class="btn"
                  :class="iframeOpen ? '' : 'btn--primary'"
                  @click="iframeOpen = !iframeOpen"
                >
                  {{ iframeOpen ? "Close Dialog B" : "Open Dialog B" }}
                </button>
                <input type="text" class="input" placeholder="Background input in iframe" />
              </div>

              <!-- Dialog B (Inside Iframe) -->
              <div
                v-if="iframeOpen"
                ref="iframeFloatingRef"
                class="dialog"
                tabindex="-1"
                role="dialog"
                aria-modal="true"
              >
                <div class="dialog-header">
                  <span>Dialog B (Iframe)</span>
                  <span style="font-size: 11px; opacity: 0.7">contentDocument</span>
                </div>
                <input type="text" class="input" placeholder="Field 1 — press Tab" />
                <input type="text" class="input" placeholder="Field 2 — press Tab" />
                <div class="dialog-actions">
                  <button type="button" class="btn btn--subtle" @click="iframeOpen = false">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </section>
    </div>

    <!-- Minimal Status Footer -->
    <footer class="demo-bar">
      <div class="bar-item">
        <span class="bar-label">Focus Location:</span>
        <span class="bar-value">
          {{
            activeDocName === "main"
              ? "Main Window"
              : activeDocName === "iframe"
                ? "Iframe Window"
                : "None"
          }}
        </span>
      </div>
      <div class="bar-item bar-item--action">
        <span class="bar-label">Event:</span>
        <span class="bar-value bar-value--mono">{{ lastAction }}</span>
      </div>
      <button v-if="mainOpen || iframeOpen" type="button" class="reset-link" @click="closeBoth">
        Close All
      </button>
    </footer>
  </div>
</template>

<style scoped>
.trap-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.demo-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f7f8f8;
  letter-spacing: -0.02em;
}

.demo-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(247, 248, 248, 0.6);
  line-height: 1.45;
}

.demo-subtitle kbd {
  font-family: inherit;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f7f8f8;
}

/* Surfaces */
.surfaces-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.surface-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.surface-card--focused {
  border-color: rgba(66, 184, 131, 0.4);
  background: rgba(66, 184, 131, 0.02);
}

.surface-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.surface-identity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition:
    background 0.15s,
    box-shadow 0.15s;
}

.doc-dot--active {
  background: #42b883;
}

.doc-name {
  font-size: 13px;
  font-weight: 600;
  color: #f7f8f8;
}

.doc-realm {
  font-size: 11px;
  font-family: monospace;
  color: rgba(247, 248, 248, 0.4);
}

.trap-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.trap-badge--active {
  background: rgba(66, 184, 131, 0.15);
  color: #42b883;
  border: 1px solid rgba(66, 184, 131, 0.3);
}

.trap-badge--idle {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(247, 248, 248, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.surface-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Embedded Dialog */
.embedded-dialog {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(66, 184, 131, 0.3);
  background: #14171f;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 10px;
  outline: none;
}

.dialog-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  font-size: 12px;
  font-weight: 600;
  color: #42b883;
}

.dialog-tag {
  font-size: 10px;
  font-family: monospace;
  color: rgba(247, 248, 248, 0.4);
}

.dialog-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

/* Iframe */
.doc-iframe {
  width: 100%;
  height: 180px;
  border: none;
  border-radius: 6px;
  background: #0d0e11;
  display: block;
}

/* Inputs & Buttons */
.v-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #f7f8f8;
  transition: all 0.15s;
  white-space: nowrap;
}

.v-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.v-btn--primary {
  background: #42b883;
  border-color: #42b883;
  color: #08090a;
  font-weight: 600;
}

.v-btn--primary:hover {
  background: #33a06f;
  border-color: #33a06f;
}

.v-btn--active {
  background: rgba(255, 255, 255, 0.08);
  color: #f7f8f8;
}

.v-btn--subtle {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(247, 248, 248, 0.6);
}

.v-btn--subtle:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f7f8f8;
}

.v-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.3);
  color: #f7f8f8;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.v-input:focus {
  border-color: #42b883;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.25);
}

.v-input--compact {
  flex: 1;
}

/* Footer Status Bar */
.demo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-item--action {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-label {
  color: rgba(247, 248, 248, 0.4);
}

.bar-value {
  color: #f7f8f8;
  font-weight: 500;
}

.bar-value--mono {
  font-family: monospace;
  color: #42b883;
  font-size: 11px;
}

.reset-link {
  background: none;
  border: none;
  color: rgba(247, 248, 248, 0.5);
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  white-space: nowrap;
}

.reset-link:hover {
  color: #f7f8f8;
}
</style>
