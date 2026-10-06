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
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out [&>div]:transition-[transform,opacity] [&>div]:duration-200 [&>div]:ease-[cubic-bezier(0.16,1,0.3,1)]"
        enter-from-class="opacity-0 [&>div]:opacity-0 [&>div]:scale-95 [&>div]:translate-y-1.5"
        enter-to-class="opacity-100 [&>div]:opacity-100 [&>div]:scale-100 [&>div]:translate-y-0"
        leave-active-class="transition-opacity duration-150 ease-in [&>div]:transition-[transform,opacity] [&>div]:duration-150 [&>div]:ease-in"
        leave-from-class="opacity-100 [&>div]:opacity-100 [&>div]:scale-100 [&>div]:translate-y-0"
        leave-to-class="opacity-0 [&>div]:opacity-0 [&>div]:scale-95 [&>div]:translate-y-1.5"
      >
        <div
          v-if="node.open.value"
          class="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-black/45 dark:bg-black/65 backdrop-blur-xs"
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
                class="inline-flex items-center justify-center w-6.5 h-6.5 rounded-md border-0 bg-transparent text-muted cursor-pointer outline-none transition-all duration-150 hover:text-highlighted hover:bg-muted hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 shrink-0"
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
              <!-- Format Selector -->
              <div class="flex flex-col gap-1.5">
                <label id="export-format-label" class="text-xs font-medium text-muted"
                  >Format</label
                >
                <div
                  class="relative grid grid-cols-3 p-1 bg-muted rounded-lg border border-default select-none"
                  role="radiogroup"
                  aria-labelledby="export-format-label"
                >
                  <!-- Animated sliding pill indicator -->
                  <div
                    class="absolute top-1 bottom-1 w-[calc((100%-8px)/3)] rounded-md bg-elevated shadow-xs border border-default/50 pointer-events-none transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    :style="{
                      transform:
                        selectedFormat === 'json'
                          ? 'translateX(0)'
                          : selectedFormat === 'csv'
                            ? 'translateX(100%)'
                            : 'translateX(200%)',
                    }"
                  />

                  <label
                    v-for="format in formatOptions"
                    :key="format.id"
                    class="relative z-1 flex items-center justify-center py-1.5 px-3 rounded-md text-xs font-medium cursor-pointer select-none text-center outline-none transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/25 has-[:focus-visible]:ring-offset-1 [-webkit-tap-highlight-color:transparent]"
                    :class="
                      selectedFormat === format.id
                        ? 'text-highlighted font-semibold'
                        : 'text-muted hover:text-highlighted'
                    "
                  >
                    <input
                      v-model="selectedFormat"
                      type="radio"
                      name="format"
                      :value="format.id"
                      class="sr-only"
                    />
                    <span>{{ format.name }}</span>
                  </label>
                </div>
              </div>

              <!-- Filename Field -->
              <div class="flex flex-col gap-1.5">
                <label for="export-filename" class="text-xs font-medium text-muted">Filename</label>
                <div
                  class="flex items-center border border-default rounded-md bg-muted transition-colors duration-150 focus-within:border-primary"
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
                    class="px-2.5 py-1.5 text-xs font-mono text-muted border-l border-default select-none transition-colors duration-150"
                    >.{{ selectedFormat }}</span
                  >
                </div>
              </div>

              <!-- Options Checkbox / Toggle -->
              <div class="py-1">
                <label
                  class="flex items-center justify-between gap-3 p-2.5 bg-muted border border-default rounded-lg cursor-pointer select-none transition-colors duration-150 hover:border-muted [-webkit-tap-highlight-color:transparent]"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-medium text-highlighted">Include geometry cache</span>
                    <span class="text-[11px] text-muted"
                      >Embed computed layout and bounding rectangles</span
                    >
                  </div>
                  <div class="relative flex items-center">
                    <input
                      v-model="includeAttachments"
                      type="checkbox"
                      role="switch"
                      :aria-checked="includeAttachments"
                      class="sr-only peer"
                    />
                    <div
                      class="w-8 h-[18px] rounded-full transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] border flex items-center p-[1px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
                      :class="
                        includeAttachments
                          ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white'
                          : 'bg-neutral-300 dark:bg-neutral-700 border-neutral-300/80 dark:border-white/10'
                      "
                    >
                      <div
                        class="w-3.5 h-3.5 rounded-full shadow-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        :class="
                          includeAttachments
                            ? 'translate-x-3.5 bg-white dark:bg-neutral-950'
                            : 'translate-x-0 bg-white dark:bg-neutral-200'
                        "
                      />
                    </div>
                  </div>
                </label>
              </div>

              <!-- Actions -->
              <div
                class="flex items-center justify-between gap-2 mt-1 pt-3 border-t border-default"
              >
                <div
                  class="inline-flex items-center gap-1 text-[11px] text-muted"
                  aria-hidden="true"
                >
                  <kbd
                    class="px-1 py-0.5 text-[10px] font-mono text-muted bg-muted border border-default rounded leading-none"
                    >esc</kbd
                  >
                  <span>cancel</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-default bg-elevated text-highlighted hover:bg-muted hover:border-muted active:scale-[0.98] transition-all duration-150 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                    @click="closeDialog"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-transparent bg-primary text-inverted hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
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
      </Transition>
    </Teleport>
  </div>
</template>
