<script setup lang="ts">
import {
  useClick,
  useEscapeKey,
  useFloatingNode,
  useFocusTrap,
  useOutsideClick,
  useRole,
} from "v-float";
import { ref, shallowRef } from "vue";

const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const fileNameInputEl = shallowRef<HTMLInputElement | null>(null);

const node = useFloatingNode({
  anchorEl,
  floatingEl,
});

useFocusTrap(node, {
  initialFocus: fileNameInputEl,
});

useOutsideClick(node);
useClick(node);
useEscapeKey(node);

useRole(node, {
  role: "dialog",
  modal: true,
  labelledBy: "export-dialog-title",
  describedBy: "export-dialog-desc",
});

interface FormatOption {
  id: "json" | "csv" | "md";
  name: string;
}

const formatOptions: FormatOption[] = [
  { id: "json", name: "JSON" },
  { id: "csv", name: "CSV" },
  { id: "md", name: "Markdown" },
];

const fileName = ref("workspace-export");
const selectedFormat = ref<"json" | "csv" | "md">("json");
const includeAttachments = ref(true);
const isExporting = ref(false);

function closeDialog() {
  node.open.value = false;
}

function handleConfirm() {
  if (isExporting.value) return;
  isExporting.value = true;
  setTimeout(() => {
    isExporting.value = false;
    closeDialog();
  }, 400);
}

defineExpose({
  context: node,
  update: () => {},
});
</script>

<template>
  <div class="preset-wrapper">
    <!-- Anchor Trigger -->
    <div class="anchor-slot">
      <button
        ref="anchorEl"
        type="button"
        class="anchor-btn"
        :class="{
          'is-active': node.open.value,
        }"
        aria-haspopup="dialog"
        :aria-expanded="node.open.value"
      >
        <svg
          class="btn-icon"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="12" height="10" rx="2" />
          <line x1="2" y1="7" x2="14" y2="7" />
        </svg>
        <span>Open Dialog</span>
      </button>
    </div>

    <!-- Centered Modal Dialog (Teleported) -->
    <Teleport to="body">
      <div v-if="node.open.value" class="dialog-overlay" @click.self="closeDialog">
        <div ref="floatingEl" class="dialog-card" tabindex="-1">
          <!-- Header -->
          <div class="dialog-header">
            <div class="header-main">
              <div class="header-icon" aria-hidden="true">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 10v2.5a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 12.5V10" />
                  <polyline points="5 6 8 9 11 6" />
                  <line x1="8" y1="9" x2="8" y2="1.5" />
                </svg>
              </div>
              <div class="header-text">
                <h2 id="export-dialog-title" class="dialog-title">Export Workspace</h2>
                <p id="export-dialog-desc" class="dialog-description">
                  Save node tree and middleware configuration.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="dialog-close-btn"
              aria-label="Close dialog"
              title="Close dialog (Esc)"
              @click="closeDialog"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
                <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
              </svg>
            </button>
          </div>

          <!-- Body Form -->
          <form class="dialog-body" @submit.prevent="handleConfirm">
            <!-- Format Cards -->
            <div class="form-group">
              <label id="export-format-label" class="form-label">Format</label>
              <div class="format-grid" role="radiogroup" aria-labelledby="export-format-label">
                <label
                  v-for="format in formatOptions"
                  :key="format.id"
                  class="format-card"
                  :class="{ 'is-selected': selectedFormat === format.id }"
                >
                  <input
                    v-model="selectedFormat"
                    type="radio"
                    name="format"
                    :value="format.id"
                    class="sr-only"
                  />
                  <span class="format-ext">.{{ format.id }}</span>
                  <span class="format-name">{{ format.name }}</span>
                </label>
              </div>
            </div>

            <!-- Filename Field -->
            <div class="form-group">
              <label for="export-filename" class="form-label">Filename</label>
              <div class="input-shell">
                <span class="input-prefix" aria-hidden="true">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-3-4z" />
                    <path d="M9 2v4h4" />
                  </svg>
                </span>
                <input
                  id="export-filename"
                  ref="fileNameInputEl"
                  v-model="fileName"
                  type="text"
                  class="form-input"
                  required
                  spellcheck="false"
                />
                <span class="input-suffix">.{{ selectedFormat }}</span>
              </div>
            </div>

            <!-- Options Checkbox / Toggle -->
            <div class="form-options">
              <label class="option-row">
                <div class="option-info">
                  <span class="option-title">Include geometry cache</span>
                  <span class="option-desc">Embed computed layout and bounding rectangles</span>
                </div>
                <input v-model="includeAttachments" type="checkbox" class="toggle-switch" />
              </label>
            </div>

            <!-- Actions -->
            <div class="dialog-footer">
              <div class="footer-hint" aria-hidden="true">
                <kbd class="kbd-key">esc</kbd>
                <span>cancel</span>
              </div>
              <div class="footer-actions">
                <button type="button" class="dialog-btn dialog-btn--secondary" @click="closeDialog">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="dialog-btn dialog-btn--primary"
                  :disabled="isExporting"
                >
                  <svg
                    v-if="isExporting"
                    class="spinner-icon"
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="6" stroke-opacity="0.25" />
                    <path d="M14 8a6 6 0 0 0-6-6" stroke-linecap="round" />
                  </svg>
                  <span>{{ isExporting ? "Exporting..." : "Export" }}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.preset-wrapper {
  display: contents;
}

.anchor-slot {
  position: relative;
  touch-action: none;
  z-index: 5;
}

.anchor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.btn-icon {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-elv);
}

.anchor-btn:hover .btn-icon {
  color: var(--vp-c-text-1);
}

.anchor-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

/* Modal Scrim & Card */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: overlay-fade 0.15s ease-out;
}

:root.dark .dialog-overlay {
  background: rgba(0, 0, 0, 0.65);
}

@keyframes overlay-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-card {
  position: relative;
  width: 100%;
  max-width: 410px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow:
    0 16px 40px -8px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  outline: none;
  animation: card-scale 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes card-scale {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.15rem 1.15rem 0.6rem;
}

.header-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-brand-text, #18794e);
  flex-shrink: 0;
  margin-top: 1px;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dialog-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.dialog-description {
  margin: 0;
  font-size: 0.78125rem;
  line-height: 1.4;
  color: var(--vp-c-text-2);
}

.dialog-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  outline: none;
  transition:
    color 0.12s ease,
    background-color 0.12s ease;
  flex-shrink: 0;
}

.dialog-close-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.dialog-close-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.6rem 1.15rem 1.15rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

/* Format Cards */
.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.45rem 0.5rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  user-select: none;
  outline: none;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    box-shadow 0.12s ease;
}

.format-card:hover {
  border-color: var(--vp-c-text-3);
}

.format-card:focus-within {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.format-card.is-selected {
  background: var(--vp-c-bg-elv);
  border-color: var(--vp-c-brand-solid, #30a46c);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.format-ext {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.format-card.is-selected .format-ext {
  color: var(--vp-c-brand-text, #18794e);
}

.format-name {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

.format-card.is-selected .format-name {
  color: var(--vp-c-text-2);
}

/* Input Shell */
.input-shell {
  display: flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.input-shell:focus-within {
  border-color: var(--vp-c-brand-text, #18794e);
}

.input-prefix {
  display: flex;
  align-items: center;
  padding-left: 0.65rem;
  color: var(--vp-c-text-3);
}

.form-input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.55rem;
  font-size: 0.8125rem;
  font-family: inherit;
  background: transparent;
  color: var(--vp-c-text-1);
  border: none;
  outline: none;
}

.input-suffix {
  padding: 0.45rem 0.65rem;
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
  border-left: 1px solid var(--vp-c-divider);
  user-select: none;
}

/* Option Row / Switch */
.form-options {
  padding: 0.2rem 0;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.65rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.12s ease;
}

.option-row:hover {
  border-color: var(--vp-c-text-3);
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.option-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.option-desc {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

/* Minimalist Toggle Switch */
.toggle-switch {
  appearance: none;
  -webkit-appearance: none;
  width: 32px;
  height: 18px;
  background: var(--vp-c-divider);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.toggle-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.toggle-switch:checked {
  background: var(--vp-c-brand-solid, #30a46c);
}

.toggle-switch:checked::after {
  transform: translateX(14px);
}

.toggle-switch:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

/* Footer & Hints */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.3rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--vp-c-divider);
}

.footer-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

.kbd-key {
  padding: 0.1rem 0.3rem;
  font-size: 0.625rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  line-height: 1;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.78125rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  transition: all 0.12s ease;
}

.dialog-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.dialog-btn--secondary {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
}

.dialog-btn--secondary:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-3);
}

.dialog-btn--primary {
  border: 1px solid transparent;
  background: var(--vp-c-brand-solid, #30a46c);
  color: #fff;
}

.dialog-btn--primary:hover:not(:disabled) {
  background: var(--vp-c-brand-hover, #299764);
}

.dialog-btn--primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
