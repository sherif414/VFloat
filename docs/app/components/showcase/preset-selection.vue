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

type StyleKey = "bold" | "italic" | "underline" | "code" | "link";

const activeStyles = ref<Record<StyleKey, boolean>>({
  bold: false,
  italic: false,
  underline: false,
  code: false,
  link: false,
});

function isSelectionInsideTag(tagName: string): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  let node: Node | null = selection.anchorNode;
  while (node && node !== quoteEl.value && node !== cardEl.value) {
    if (node.nodeName.toLowerCase() === tagName.toLowerCase()) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function updateActiveFormats() {
  if (typeof document === "undefined") return;
  activeStyles.value = {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    code: isSelectionInsideTag("code"),
    link: isSelectionInsideTag("a"),
  };
}

function toggleFormat(command: "bold" | "italic" | "underline") {
  if (typeof document === "undefined") return;
  document.execCommand(command);
  updateActiveFormats();
  void position.update();
}

function toggleCode() {
  if (typeof window === "undefined" || !quoteEl.value) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!quoteEl.value.contains(range.commonAncestorContainer)) return;

  if (isSelectionInsideTag("code")) {
    let node: Node | null = selection.anchorNode;
    while (node && node !== quoteEl.value) {
      if (node.nodeName.toLowerCase() === "code") {
        const parent = node.parentNode;
        while (node.firstChild) {
          parent?.insertBefore(node.firstChild, node);
        }
        parent?.removeChild(node);
        break;
      }
      node = node.parentNode;
    }
  } else {
    const codeEl = document.createElement("code");
    codeEl.className = "inline-code";
    try {
      range.surroundContents(codeEl);
    } catch {
      const contents = range.extractContents();
      codeEl.appendChild(contents);
      range.insertNode(codeEl);
    }
    selection.selectAllChildren(codeEl);
  }
  updateActiveFormats();
  void position.update();
}

function toggleLink() {
  if (typeof window === "undefined" || !quoteEl.value) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!quoteEl.value.contains(range.commonAncestorContainer)) return;

  if (isSelectionInsideTag("a")) {
    document.execCommand("unlink");
  } else {
    document.execCommand("createLink", false, "https://vfloat.pages.dev");
  }
  updateActiveFormats();
  void position.update();
}

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

  const virtualElement: VirtualElement = {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    contextElement: card,
    getClientRects: () => range.getClientRects(),
  };

  anchorEl.value = virtualElement;
  context.open.value = true;
  updateActiveFormats();
  void position.update();
}

function handleCardPointerUp() {
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
    <!-- Selectable Prose Card -->
    <div ref="cardEl" class="selection-card" @pointerup="handleCardPointerUp">
      <div ref="quoteEl" contenteditable="true" spellcheck="false" class="prose-text">
        VFloat is a lightweight, headless
        <span ref="samplePhraseEl" class="quote-anchor-sample">floating UI engine</span>
        built on Vue 3.5 reactivity, engineered for zero-compromise composable architecture and
        precision placement.
      </div>

      <div class="quick-select-row">
        <span class="quick-select-label">Select:</span>
        <button
          type="button"
          class="text-chip"
          @mousedown.prevent
          @click="selectPhrase('lightweight')"
        >
          lightweight
        </button>
        <button
          type="button"
          class="text-chip"
          @mousedown.prevent
          @click="selectPhrase('floating UI engine')"
        >
          floating UI engine
        </button>
        <button
          type="button"
          class="text-chip"
          @mousedown.prevent
          @click="selectPhrase('Vue 3.5 reactivity')"
        >
          Vue 3.5 reactivity
        </button>
      </div>
    </div>

    <!-- Floating Formatting Toolbar -->
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
        title="Bold"
        aria-label="Bold"
        :aria-pressed="activeStyles.bold"
        @mousedown.prevent
        @click="toggleFormat('bold')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
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
        title="Italic"
        aria-label="Italic"
        :aria-pressed="activeStyles.italic"
        @mousedown.prevent
        @click="toggleFormat('italic')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
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
        title="Underline"
        aria-label="Underline"
        :aria-pressed="activeStyles.underline"
        @mousedown.prevent
        @click="toggleFormat('underline')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
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
        title="Code"
        aria-label="Code"
        :aria-pressed="activeStyles.code"
        @mousedown.prevent
        @click="toggleCode"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
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
        title="Link"
        aria-label="Link"
        :aria-pressed="activeStyles.link"
        @mousedown.prevent
        @click="toggleLink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
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

.selection-card {
  position: relative;
  z-index: 5;
  width: calc(100% - 2rem);
  max-width: 480px;
  padding: 1.25rem 1.25rem 1rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.prose-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  outline: none;
  user-select: text;
  -webkit-user-select: text;
}

.prose-text :deep(b),
.prose-text :deep(strong) {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.prose-text :deep(i),
.prose-text :deep(em) {
  font-style: italic;
}

.prose-text :deep(u) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.prose-text :deep(code),
.prose-text :deep(.inline-code) {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.8125rem;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-text, #18794e);
}

.prose-text :deep(a) {
  color: var(--vp-c-brand-text, #18794e);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.prose-text::selection,
.prose-text *::selection {
  background: var(--vp-c-brand-soft, rgba(16, 185, 129, 0.16));
  color: var(--vp-c-text-1);
}

.quote-anchor-sample {
  display: inline;
}

.quick-select-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--vp-c-divider);
  user-select: none;
  -webkit-user-select: none;
}

.quick-select-label {
  font-size: 0.71875rem;
  color: var(--vp-c-text-3);
  margin-right: 0.2rem;
}

.text-chip {
  padding: 0.15rem 0.4rem;
  font-size: 0.71875rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;
}

.text-chip:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
}

.text-chip:hover {
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
}

/* Floating Toolbar */
.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}

.formatting-bubble {
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 3px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.bubble-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
}

.bubble-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
}

.bubble-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.bubble-btn.is-active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-text, #18794e);
}

.bubble-btn svg {
  width: 12px;
  height: 12px;
}

.bubble-divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--vp-c-divider);
}
</style>
