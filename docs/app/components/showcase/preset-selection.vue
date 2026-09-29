<script setup lang="ts">
import type { VirtualElement } from "v-float";
import { useFloatingNode, usePosition } from "v-float";
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

interface Props {
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keepOpen: false,
});

// ============================================================================
// 1. Elements & Floating Node Setup
// ============================================================================
const cardEl = shallowRef<HTMLElement | null>(null);
const quoteEl = shallowRef<HTMLElement | null>(null);
const samplePhraseEl = shallowRef<HTMLElement | null>(null);

const anchorEl = shallowRef<VirtualElement | HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
});

const position = usePosition(context, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: { padding: 8 },
    shift: { padding: 8 },
  },
});

// ============================================================================
// 2. Formatting Toolbar State
// ============================================================================
type StyleKey = "bold" | "italic" | "underline" | "code" | "link";

const activeStyles = ref<Record<StyleKey, boolean>>({
  bold: false,
  italic: false,
  underline: false,
  code: false,
  link: false,
});

function toggleStyle(key: StyleKey) {
  activeStyles.value[key] = !activeStyles.value[key];
}

// ============================================================================
// 3. Dynamic Virtual Element Selection Handling
// ============================================================================
function setFallbackAnchor() {
  const target = samplePhraseEl.value ?? cardEl.value;
  if (!target) return;

  anchorEl.value = {
    getBoundingClientRect: () => target.getBoundingClientRect(),
    contextElement: target,
  };
}

function handleSelectionChange() {
  if (typeof window === "undefined") return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    if (!props.keepOpen) {
      context.open.value = false;
    }
    return;
  }

  const range = selection.getRangeAt(0);
  const card = cardEl.value;

  // Verify the selection range is contained within the selectable card
  if (!card || !card.contains(range.commonAncestorContainer)) {
    if (!props.keepOpen) {
      context.open.value = false;
    }
    return;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    if (!props.keepOpen) {
      context.open.value = false;
    }
    return;
  }

  // Construct dynamic VirtualElement anchored directly to the selection range
  const virtualElement: VirtualElement = {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    contextElement: card,
    getClientRects: () => range.getClientRects(),
  };

  anchorEl.value = virtualElement;
  context.open.value = true;
  void position.update();
}

function handleCardPointerUp() {
  // Allow browser selection to settle on touch & mobile devices
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      handleSelectionChange();
    });
  }
}

function selectPhrase(targetText: string) {
  if (typeof window === "undefined" || !quoteEl.value) return;
  const selection = window.getSelection();
  if (!selection) return;

  const treeWalker = document.createTreeWalker(quoteEl.value, NodeFilter.SHOW_TEXT);
  let textNode: Text | null = null;
  let startIndex = -1;

  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode as Text;
    const idx = node.textContent?.indexOf(targetText) ?? -1;
    if (idx !== -1) {
      textNode = node;
      startIndex = idx;
      break;
    }
  }

  if (textNode && startIndex !== -1) {
    const range = document.createRange();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, startIndex + targetText.length);
    selection.removeAllRanges();
    selection.addRange(range);
    handleSelectionChange();
  }
}

watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      if (!anchorEl.value) {
        setFallbackAnchor();
      }
      context.open.value = true;
      void nextTick(() => {
        void position.update();
      });
    } else {
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        context.open.value = false;
      }
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("selectionchange", handleSelectionChange);
  }
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("selectionchange", handleSelectionChange);
  }
});

defineExpose({
  context,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="preset-wrapper">
    <!-- Selectable Typography Card (Virtual Anchor Sandbox) -->
    <div ref="cardEl" class="selection-card" @pointerup="handleCardPointerUp">
      <div class="card-header">
        <span class="card-badge">
          <svg
            class="badge-icon"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          Selectable Typography
        </span>

        <span class="card-hint">
          <span class="hint-dot" aria-hidden="true" />
          Highlight text to format
        </span>
      </div>

      <blockquote
        ref="quoteEl"
        class="card-quote"
        :class="{
          'is-bold': activeStyles.bold,
          'is-italic': activeStyles.italic,
          'is-underline': activeStyles.underline,
          'is-code': activeStyles.code,
          'is-link': activeStyles.link,
        }"
      >
        <span class="quote-symbol quote-symbol--start" aria-hidden="true">“</span>
        VFloat is a lightweight, headless
        <span ref="samplePhraseEl" class="quote-anchor-sample">floating UI engine</span>
        built on Vue 3.5 reactivity, engineered for zero-compromise composable architecture.
        <span class="quote-symbol quote-symbol--end" aria-hidden="true">”</span>
      </blockquote>

      <div class="quick-chips">
        <span class="chips-label">Quick select:</span>
        <button
          type="button"
          class="chip-btn"
          @mousedown.prevent
          @click="selectPhrase('lightweight')"
        >
          lightweight
        </button>
        <button
          type="button"
          class="chip-btn"
          @mousedown.prevent
          @click="selectPhrase('floating UI engine')"
        >
          floating UI engine
        </button>
        <button
          type="button"
          class="chip-btn"
          @mousedown.prevent
          @click="selectPhrase('Vue 3.5 reactivity')"
        >
          Vue 3.5 reactivity
        </button>
      </div>
    </div>

    <!-- Medium/Notion-Style Floating Formatting Toolbar -->
    <div
      v-if="context.open.value"
      ref="floatingEl"
      role="toolbar"
      aria-label="Text formatting toolbar"
      class="floating-panel formatting-bubble"
      @mousedown.prevent
    >
      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': activeStyles.bold }"
        title="Bold (B)"
        aria-label="Bold"
        :aria-pressed="activeStyles.bold"
        @mousedown.prevent
        @click="toggleStyle('bold')"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': activeStyles.italic }"
        title="Italic (I)"
        aria-label="Italic"
        :aria-pressed="activeStyles.italic"
        @mousedown.prevent
        @click="toggleStyle('italic')"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': activeStyles.underline }"
        title="Underline (U)"
        aria-label="Underline"
        :aria-pressed="activeStyles.underline"
        @mousedown.prevent
        @click="toggleStyle('underline')"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3v7a6 6 0 0 0 12 0V3" />
          <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': activeStyles.code }"
        title="Code (&lt;&gt;)"
        aria-label="Code"
        :aria-pressed="activeStyles.code"
        @mousedown.prevent
        @click="toggleStyle('code')"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <div class="bubble-divider" role="separator" aria-orientation="vertical" />

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': activeStyles.link }"
        title="Link (🔗)"
        aria-label="Link"
        :aria-pressed="activeStyles.link"
        @mousedown.prevent
        @click="toggleStyle('link')"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.preset-wrapper {
  display: contents;
}

/* ============================================================================
   Selectable Typography Quote Card
   ============================================================================ */
.selection-card {
  position: relative;
  z-index: 5;
  width: calc(100% - 2.5rem);
  max-width: 540px;
  padding: 1.25rem 1.5rem 1.15rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-1, 0 1px 3px rgba(0, 0, 0, 0.05));
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.selection-card:hover {
  border-color: var(--vp-c-brand-soft);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  user-select: none;
  -webkit-user-select: none;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 9999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.badge-icon {
  opacity: 0.85;
}

.card-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
  font-weight: 450;
}

.hint-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  opacity: 0.75;
}

.card-quote {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 0.98rem;
  line-height: 1.62;
  color: var(--vp-c-text-1);
  font-weight: 400;
  user-select: text;
  -webkit-user-select: text;
  transition:
    color 0.15s ease,
    font-weight 0.15s ease;
}

.card-quote::selection,
.card-quote *::selection {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.quote-symbol {
  font-family: Georgia, serif;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--vp-c-brand-1);
  opacity: 0.65;
  user-select: none;
  -webkit-user-select: none;
}

.quote-symbol--start {
  margin-right: 0.15rem;
}

.quote-symbol--end {
  margin-left: 0.15rem;
}

.quote-anchor-sample {
  display: inline;
}

/* Dynamic Active Styles applied via Toolbar Buttons */
.card-quote.is-bold {
  font-weight: 700;
}

.card-quote.is-italic {
  font-style: italic;
}

.card-quote.is-underline {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.card-quote.is-code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.88rem;
}

.card-quote.is-link {
  color: var(--vp-c-brand-1);
}

/* Quick Select Helper Chips */
.quick-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--vp-c-divider);
  user-select: none;
  -webkit-user-select: none;
}

.chips-label {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
  margin-right: 0.1rem;
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.chip-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.chip-btn:active {
  transform: scale(0.96);
}

/* ============================================================================
   Floating Formatting Bubble
   ============================================================================ */
.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-3, 0 10px 30px rgba(0, 0, 0, 0.14));
  border-radius: 8px;
}

.formatting-bubble {
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  border-radius: 8px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  animation: bubble-pop 0.14s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes bubble-pop {
  from {
    opacity: 0;
    scale: 0.92;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

.bubble-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease,
    transform 0.08s ease;
}

.bubble-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.bubble-btn:active {
  transform: scale(0.9);
  background: var(--vp-c-bg-soft);
}

.bubble-btn:focus-visible {
  border-color: var(--vp-c-brand-1);
}

.bubble-btn.is-active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.bubble-divider {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--vp-c-divider);
}

/* ============================================================================
   Touch & Mobile Ergonomics
   ============================================================================ */
@media (pointer: coarse), (max-width: 640px) {
  .selection-card {
    padding: 1rem 1.15rem;
  }

  .card-quote {
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .bubble-btn {
    width: 32px;
    height: 32px;
  }

  .quick-chips {
    margin-top: 0.8rem;
    padding-top: 0.65rem;
  }

  .chip-btn {
    padding: 0.2rem 0.5rem;
    font-size: 0.74rem;
  }
}
</style>
