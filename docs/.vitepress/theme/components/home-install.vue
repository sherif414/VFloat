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
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(COMMAND);
    } else {
      // Clipboard API unavailable (older browsers, non-secure contexts).
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
  <div class="vf-install">
    <div class="vf-install-row" role="group" aria-label="Install VFloat">
      <span class="vf-install-prompt" aria-hidden="true">$</span>
      <code class="vf-install-code">{{ COMMAND }}</code>
      <button
        type="button"
        class="vf-install-copy"
        :class="{ 'is-copied': status === 'copied' }"
        :aria-label="status === 'copied' ? 'Copied to clipboard' : 'Copy install command'"
        @click="onCopy"
      >
        <svg
          v-if="status !== 'copied'"
          class="vf-install-icon"
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
          class="vf-install-icon"
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
        <span class="vf-install-copy-label" aria-hidden="true">
          {{ status === "copied" ? "Copied" : status === "failed" ? "Failed" : "Copy" }}
        </span>
        <span class="vf-install-status" role="status" aria-live="polite">
          {{
            status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed" : ""
          }}
        </span>
      </button>
    </div>
    <p class="vf-install-caption">Requires Vue 3.5+ &middot; ESM &middot; MIT</p>
  </div>
</template>

<style scoped>
.vf-install {
  width: min(420px, 100%);
  margin: 1.25rem auto 0;
}

.vf-install-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.5rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}

.vf-install-prompt {
  flex-shrink: 0;
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  user-select: none;
}

.vf-install-code {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  text-align: left;
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  background: transparent;
}

.vf-install-code::-webkit-scrollbar {
  display: none;
}

.vf-install-code::selection {
  background: var(--vp-c-brand-soft);
}

.vf-install-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.vf-install-copy:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.vf-install-copy:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.vf-install-copy.is-copied {
  border-color: transparent;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.vf-install-icon {
  display: block;
  flex-shrink: 0;
}

.vf-install-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.vf-install-caption {
  margin: 0.55rem 0 0;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  text-align: center;
  text-wrap: balance;
}

@media (max-width: 480px) {
  .vf-install {
    margin-top: 1rem;
  }

  .vf-install-row {
    padding: 0.45rem 0.45rem 0.45rem 0.8rem;
    gap: 0.45rem;
  }

  .vf-install-code {
    font-size: 0.8rem;
  }

  .vf-install-copy {
    padding: 0.32rem 0.55rem;
    font-size: 0.73rem;
  }

  .vf-install-caption {
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vf-install-copy {
    transition: none;
  }
}
</style>
