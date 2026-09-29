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

// ============================================================================
// 1. Floating Node Setup (Centered Modal Dialog)
// ============================================================================
const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const fileNameInputEl = shallowRef<HTMLInputElement | null>(null);

const node = useFloatingNode({
  anchorEl,
  floatingEl,
});

// ============================================================================
// 2. Focus Management & Accessibility Primitives
// ============================================================================
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

// ============================================================================
// 3. Modal State & Actions
// ============================================================================
interface FormatOption {
  id: "json" | "csv" | "md";
  name: string;
  badge: string;
  description: string;
}

const formatOptions: FormatOption[] = [
  { id: "json", name: "JSON", badge: "JSON", description: "Complete state tree snapshot" },
  { id: "csv", name: "CSV", badge: "CSV", description: "Tabular metrics & node list" },
  { id: "md", name: "Markdown", badge: "MD", description: "Formatted summary documentation" },
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
  }, 450);
}

defineExpose({
  context: node,
  update: () => {},
});
</script>

<template>
  <div class="preset-wrapper">
    <!-- Visual Anchor Trigger Button in Sandbox -->
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
          class="dialog-trigger-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <span>Open Dialog</span>
      </button>
    </div>

    <!-- Centered Modal Dialog with Backdrop Overlay -->
    <Teleport to="body">
      <div v-if="node.open.value" class="dialog-overlay" @click.self="closeDialog">
        <div ref="floatingEl" class="dialog-card" tabindex="-1">
          <!-- Dialog Header -->
          <div class="dialog-header">
            <div class="dialog-header-text">
              <h2 id="export-dialog-title" class="dialog-title">Export Workspace</h2>
              <p id="export-dialog-desc" class="dialog-description">
                Configure your export settings and file details for this workspace.
              </p>
            </div>
            <button
              type="button"
              class="dialog-close-btn"
              aria-label="Close dialog"
              title="Close dialog"
              @click="closeDialog"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>

          <!-- Dialog Form Body -->
          <form class="dialog-body" @submit.prevent="handleConfirm">
            <!-- File Name Field -->
            <div class="form-group">
              <label for="export-filename" class="form-label">File name</label>
              <div class="input-addon-group">
                <input
                  id="export-filename"
                  ref="fileNameInputEl"
                  v-model="fileName"
                  type="text"
                  class="form-input"
                  placeholder="workspace-export"
                  required
                />
                <span class="input-addon">.{{ selectedFormat }}</span>
              </div>
              <span class="form-hint">Default storage location: Downloads</span>
            </div>

            <!-- Export Format Radiogroup -->
            <div class="form-group">
              <span class="form-label" id="format-group-label">Export format</span>
              <div
                class="format-options-grid"
                role="radiogroup"
                aria-labelledby="format-group-label"
              >
                <label
                  v-for="format in formatOptions"
                  :key="format.id"
                  class="format-card"
                  :class="{ 'is-selected': selectedFormat === format.id }"
                >
                  <input
                    v-model="selectedFormat"
                    type="radio"
                    name="export-format"
                    :value="format.id"
                    class="sr-only"
                  />
                  <div class="format-card__badge-row">
                    <span class="format-badge">{{ format.badge }}</span>
                  </div>
                  <div class="format-card__content">
                    <span class="format-card__title">{{ format.name }}</span>
                    <span class="format-card__desc">{{ format.description }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Attachments Toggle -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="includeAttachments" type="checkbox" class="form-checkbox" />
                <span>Include media attachments and computed cache</span>
              </label>
            </div>

            <!-- Footer Action Buttons -->
            <div class="dialog-footer">
              <button type="button" class="dialog-btn dialog-btn--secondary" @click="closeDialog">
                Cancel
              </button>
              <button type="submit" class="dialog-btn dialog-btn--primary" :disabled="isExporting">
                <svg
                  v-if="!isExporting"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 2v9m-4-4l4 4 4-4" />
                  <path d="M2 14h12" />
                </svg>
                <span v-if="isExporting">Exporting...</span>
                <span v-else>Confirm Export</span>
              </button>
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

/* ============================================================================
 * Anchor Trigger Button (Consistent with other showcase presets)
 * ============================================================================ */
.anchor-slot {
  position: relative;
  touch-action: none;
  z-index: 5;
}

.anchor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--vp-shadow-1, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.anchor-btn:active {
  transform: scale(0.98);
  background: var(--vp-c-bg-soft);
}

.anchor-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.anchor-btn.is-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.dialog-trigger-icon {
  color: var(--vp-c-brand-1);
}

@media (pointer: coarse), (max-width: 640px) {
  .anchor-btn {
    min-height: 42px;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}

/* ============================================================================
 * Modal Dialog Overlay (Scrim) & Centered Card
 * ============================================================================ */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: dialogFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

:root.dark .dialog-overlay {
  background: rgba(0, 0, 0, 0.68);
}

.dialog-card {
  position: relative;
  width: 100%;
  max-width: 460px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-4, 0 16px 36px rgba(0, 0, 0, 0.18));
  overflow: hidden;
  outline: none;
  animation: dialogScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes dialogScaleIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ============================================================================
 * Dialog Header
 * ============================================================================ */
.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.25rem 0.75rem;
}

.dialog-title {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.dialog-description {
  margin: 0.3rem 0 0;
  font-size: 0.83rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

.dialog-close-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dialog-close-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

.dialog-close-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* ============================================================================
 * Dialog Form Content
 * ============================================================================ */
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 0.5rem 1.25rem 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.input-addon-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.input-addon-group:focus-within {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.form-input {
  flex: 1;
  min-width: 0;
  padding: 0.55rem 0.75rem;
  font-size: 0.88rem;
  font-family: inherit;
  background: transparent;
  color: var(--vp-c-text-1);
  border: none;
  outline: none;
}

.form-input::placeholder {
  color: var(--vp-c-text-3);
}

.input-addon {
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border-left: 1px solid var(--vp-c-divider);
  border-top-right-radius: 7px;
  border-bottom-right-radius: 7px;
  user-select: none;
}

/* Format Options Radio Grid */
.format-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
}

.format-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  user-select: none;
}

.format-card:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg-alt);
}

.format-card.is-selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.format-card:focus-within {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.format-card__badge-row {
  margin-bottom: 0.35rem;
}

.format-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.format-card.is-selected .format-badge {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-neutral-inverse, #fff);
  border-color: var(--vp-c-brand-1);
}

.format-card__title {
  display: block;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.format-card__desc {
  display: block;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  line-height: 1.3;
  margin-top: 0.15rem;
}

/* Checkbox */
.checkbox-group {
  margin-top: 0.15rem;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

/* Dialog Footer Buttons */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.35rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.dialog-btn--secondary {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.dialog-btn--secondary:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-text-3);
}

.dialog-btn--secondary:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.dialog-btn--primary {
  border: 1px solid transparent;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-neutral-inverse, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dialog-btn--primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.dialog-btn--primary:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.dialog-btn--primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Accessibility helper */
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

/* Responsive Mobile Layout */
@media (max-width: 640px) {
  .dialog-card {
    max-width: 100%;
  }

  .format-options-grid {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-btn {
    width: 100%;
  }
}
</style>
