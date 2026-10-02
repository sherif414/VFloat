<script setup lang="ts">
import { onUnmounted, ref } from "vue";

const COMMAND = "pnpm add v-float";

const status = ref<"idle" | "copied" | "failed">("idle");
let statusTimeoutId: ReturnType<typeof setTimeout> | undefined;

function setStatus(next: typeof status.value) {
  status.value = next;
  if (statusTimeoutId !== undefined) {
    clearTimeout(statusTimeoutId);
  }
  statusTimeoutId = setTimeout(() => {
    status.value = "idle";
  }, 2000);
}

async function onCopy() {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(COMMAND);
    } else if (typeof document !== "undefined") {
      const area = document.createElement("textarea");
      area.value = COMMAND;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setStatus("copied");
  } catch {
    setStatus("failed");
  }
}

onUnmounted(() => {
  if (statusTimeoutId !== undefined) {
    clearTimeout(statusTimeoutId);
  }
});
</script>

<template>
  <div class="w-full max-w-[400px] mx-auto">
    <div
      class="flex items-center gap-2 p-1.5 pl-3.5 sm:p-2 sm:pl-3.5 border border-default rounded-xl bg-elevated shadow-(--vf-elevation-card) transition-colors duration-150 focus-within:border-primary"
      role="group"
      aria-label="Install VFloat"
    >
      <span class="shrink-0 font-mono text-[13px] text-muted select-none" aria-hidden="true"
        >$</span
      >
      <code
        class="flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none text-left font-mono text-[13px] sm:text-[13.5px] leading-normal text-highlighted bg-transparent selection:bg-primary/10 selection:text-primary"
        >{{ COMMAND }}</code
      >
      <button
        type="button"
        class="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 border rounded-lg font-medium text-[12px] leading-tight cursor-pointer touch-manipulation transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 motion-reduce:transition-none"
        :class="
          status === 'copied'
            ? 'border-transparent bg-primary/10 text-primary'
            : 'border-default bg-elevated text-toned hover:text-highlighted hover:border-muted hover:bg-muted'
        "
        :aria-label="status === 'copied' ? 'Copied to clipboard' : 'Copy install command'"
        @click="onCopy"
      >
        <svg
          v-if="status !== 'copied'"
          class="block shrink-0"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path
            d="M10.5 5.5v-3a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 2.5v5.5a1.5 1.5 0 0 0 1.5 1.5h3"
          />
        </svg>
        <svg
          v-else
          class="block shrink-0"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m3 8.5 3.2 3.2L13 5" />
        </svg>
        <span aria-hidden="true">
          {{ status === "copied" ? "Copied" : status === "failed" ? "Failed" : "Copy" }}
        </span>
        <span class="sr-only" role="status" aria-live="polite">
          {{
            status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed" : ""
          }}
        </span>
      </button>
    </div>
    <p
      class="mt-2 text-[11.5px] sm:text-xs leading-normal text-muted text-center flex items-center justify-center gap-1.5 tracking-wide"
    >
      <span>Requires Vue 3.5+</span>
      <span class="opacity-60 select-none" aria-hidden="true">&middot;</span>
      <span>ESM</span>
      <span class="opacity-60 select-none" aria-hidden="true">&middot;</span>
      <span>MIT</span>
    </p>
  </div>
</template>
