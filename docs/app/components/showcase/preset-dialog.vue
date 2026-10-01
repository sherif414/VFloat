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
  node,
  context: node,
  update: () => {},
});
</script>

<template>
  <div class="contents">
    <!-- Anchor Trigger -->
    <div class="relative touch-none z-[5]">
      <button
        ref="anchorEl"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-elevated text-highlighted text-[13px] font-medium shadow-xs select-none touch-manipulation cursor-pointer outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        :class="node.open.value ? 'border-primary' : 'border-default hover:border-muted'"
        aria-haspopup="dialog"
        :aria-expanded="node.open.value"
      >
        <svg
          class="w-3.5 h-3.5 text-muted shrink-0 transition-colors duration-150"
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
      <div
        v-if="node.open.value"
        class="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-black/45 dark:bg-black/65 backdrop-blur-xs transition-opacity duration-150"
        @click.self="closeDialog"
      >
        <div
          ref="floatingEl"
          class="relative w-full max-w-[410px] bg-elevated border border-default rounded-xl shadow-2xl outline-none"
          tabindex="-1"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 p-4 pb-2.5">
            <div class="flex items-start gap-3">
              <div
                class="flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-default text-primary shrink-0 mt-0.5"
                aria-hidden="true"
              >
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
              <div class="flex flex-col gap-0.5">
                <h2
                  id="export-dialog-title"
                  class="m-0 text-[15px] font-semibold leading-snug text-highlighted"
                >
                  Export Workspace
                </h2>
                <p id="export-dialog-desc" class="m-0 text-xs leading-normal text-muted">
                  Save node tree and middleware configuration.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md border-0 bg-transparent text-muted cursor-pointer outline-none transition-colors duration-120 hover:text-highlighted hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 shrink-0"
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
          <form class="flex flex-col gap-3.5 px-4 pb-4 pt-2" @submit.prevent="handleConfirm">
            <!-- Format Cards -->
            <div class="flex flex-col gap-1.5">
              <label id="export-format-label" class="text-xs font-medium text-muted">Format</label>
              <div
                class="grid grid-cols-3 gap-1.5"
                role="radiogroup"
                aria-labelledby="export-format-label"
              >
                <label
                  v-for="format in formatOptions"
                  :key="format.id"
                  class="flex flex-col items-center justify-center gap-0.5 p-2 rounded-md border cursor-pointer select-none outline-none transition-colors duration-120 focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-1"
                  :class="
                    selectedFormat === format.id
                      ? 'bg-elevated border-primary shadow-xs'
                      : 'bg-muted border-default hover:border-muted'
                  "
                >
                  <input
                    v-model="selectedFormat"
                    type="radio"
                    name="format"
                    :value="format.id"
                    class="sr-only"
                  />
                  <span
                    class="font-mono text-xs font-semibold"
                    :class="selectedFormat === format.id ? 'text-primary' : 'text-highlighted'"
                    >.{{ format.id }}</span
                  >
                  <span
                    class="text-[11px]"
                    :class="selectedFormat === format.id ? 'text-highlighted' : 'text-muted'"
                    >{{ format.name }}</span
                  >
                </label>
              </div>
            </div>

            <!-- Filename Field -->
            <div class="flex flex-col gap-1.5">
              <label for="export-filename" class="text-xs font-medium text-muted">Filename</label>
              <div
                class="flex items-center border border-default rounded-md bg-muted transition-colors duration-120 focus-within:border-primary"
              >
                <span class="flex items-center pl-2.5 text-muted" aria-hidden="true">
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
                  class="flex-1 min-w-0 px-2 py-1.5 text-[13px] bg-transparent text-highlighted border-0 outline-none"
                  required
                  spellcheck="false"
                />
                <span
                  class="px-2.5 py-1.5 text-xs font-mono text-muted border-l border-default select-none"
                  >.{{ selectedFormat }}</span
                >
              </div>
            </div>

            <!-- Options Checkbox / Toggle -->
            <div class="py-1">
              <label
                class="flex items-center justify-between gap-3 p-2 bg-muted border border-default rounded-md cursor-pointer select-none transition-colors duration-120 hover:border-muted"
              >
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-medium text-highlighted">Include geometry cache</span>
                  <span class="text-[11px] text-muted"
                    >Embed computed layout and bounding rectangles</span
                  >
                </div>
                <input
                  v-model="includeAttachments"
                  type="checkbox"
                  class="appearance-none relative w-8 h-[18px] bg-default rounded-full cursor-pointer outline-none shrink-0 transition-colors duration-150 checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:shadow-xs after:transition-transform after:duration-150 checked:after:translate-x-3.5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                />
              </label>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between gap-2 mt-1 pt-3 border-t border-default">
              <div class="inline-flex items-center gap-1 text-[11px] text-muted" aria-hidden="true">
                <kbd
                  class="px-1 py-0.5 text-[10px] font-mono text-muted bg-muted border border-default rounded leading-none"
                  >esc</kbd
                >
                <span>cancel</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-default bg-elevated text-highlighted hover:bg-muted hover:border-muted transition-colors duration-120 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                  @click="closeDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-120 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                  :disabled="isExporting"
                >
                  <svg
                    v-if="isExporting"
                    class="w-3 h-3 animate-spin"
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
