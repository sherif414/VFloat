<script setup lang="ts">
import type { Placement, VirtualElement } from "v-float";
import { useFloatingNode, usePosition } from "v-float";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

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

const node = useFloatingNode({
  anchorEl,
  floatingEl,
});

const isTouchDevice = ref(false);

const preferredPlacement = computed<Placement>(() => {
  return isTouchDevice.value ? "bottom" : "top";
});

const position = usePosition(node, {
  placement: preferredPlacement,
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

const isToolbarInteracting = ref(false);
const savedRange = shallowRef<Range | null>(null);
let toolbarInteractTimeout: ReturnType<typeof setTimeout> | null = null;

function handleToolbarPointerDown(e: PointerEvent) {
  e.preventDefault();
  if (toolbarInteractTimeout) {
    clearTimeout(toolbarInteractTimeout);
    toolbarInteractTimeout = null;
  }
  isToolbarInteracting.value = true;
}

function handleToolbarPointerUp() {
  if (toolbarInteractTimeout) {
    clearTimeout(toolbarInteractTimeout);
  }
  toolbarInteractTimeout = setTimeout(() => {
    isToolbarInteracting.value = false;
    toolbarInteractTimeout = null;
  }, 150);
}

function restoreSelection(): boolean {
  if (typeof window === "undefined" || !savedRange.value) return false;
  const selection = window.getSelection();
  if (!selection) return false;

  const quote = quoteEl.value;
  if (quote && document.activeElement !== quote) {
    quote.focus({ preventScroll: true });
  }

  if (
    selection.isCollapsed ||
    selection.rangeCount === 0 ||
    !quote?.contains(selection.anchorNode)
  ) {
    selection.removeAllRanges();
    selection.addRange(savedRange.value);
    return true;
  }
  return true;
}

function syncSavedRange() {
  if (typeof window === "undefined") return;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    savedRange.value = selection.getRangeAt(0).cloneRange();
  }
}

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
  restoreSelection();
  document.execCommand(command);
  syncSavedRange();
  updateActiveFormats();
  void position.update();
}

function toggleCode() {
  if (typeof window === "undefined" || !quoteEl.value) return;
  restoreSelection();
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
  syncSavedRange();
  updateActiveFormats();
  void position.update();
}

function toggleLink() {
  if (typeof window === "undefined" || !quoteEl.value) return;
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!quoteEl.value.contains(range.commonAncestorContainer)) return;

  if (isSelectionInsideTag("a")) {
    document.execCommand("unlink");
  } else {
    document.execCommand("createLink", false, "https://vfloat.pages.dev");
  }
  syncSavedRange();
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
  if (isToolbarInteracting.value) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    if (!props.keepOpen) {
      node.open.value = false;
      savedRange.value = null;
    }
    return;
  }

  const range = selection.getRangeAt(0);
  const card = cardEl.value;

  if (!card || !card.contains(range.commonAncestorContainer)) {
    if (!props.keepOpen) {
      node.open.value = false;
      savedRange.value = null;
    }
    return;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    if (!props.keepOpen) {
      node.open.value = false;
      savedRange.value = null;
    }
    return;
  }

  savedRange.value = range.cloneRange();

  const virtualElement: VirtualElement = {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    contextElement: card,
    getClientRects: () => range.getClientRects(),
  };

  anchorEl.value = virtualElement;
  node.open.value = true;
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
    savedRange.value = range.cloneRange();
    handleSelectionChange();
  }
}

function handleDocumentPointerUp() {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      handleSelectionChange();
    });
  }
}

watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      if (!anchorEl.value) {
        setFallbackAnchor();
      }
      node.open.value = true;
      void nextTick(() => {
        void position.update();
      });
    } else {
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        node.open.value = false;
      }
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (typeof window !== "undefined") {
    isTouchDevice.value =
      window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("pointerup", handleDocumentPointerUp);
    document.addEventListener("touchend", handleDocumentPointerUp);
  }
});

onBeforeUnmount(() => {
  if (toolbarInteractTimeout) {
    clearTimeout(toolbarInteractTimeout);
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("selectionchange", handleSelectionChange);
    document.removeEventListener("pointerup", handleDocumentPointerUp);
    document.removeEventListener("touchend", handleDocumentPointerUp);
  }
});

defineExpose({
  node,
  context: node,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="contents">
    <!-- Selectable Prose Card -->
    <div
      ref="cardEl"
      class="relative z-[5] w-[calc(100%-2rem)] max-w-[480px] p-5 pb-4 bg-elevated border border-default rounded-lg shadow-(--vf-elevation-card) select-text cursor-text"
      @pointerup="handleCardPointerUp"
    >
      <div
        ref="quoteEl"
        contenteditable="true"
        inputmode="none"
        spellcheck="false"
        class="text-[15px] leading-relaxed text-highlighted outline-none select-text [&_b]:font-semibold [&_strong]:font-semibold [&_b]:text-highlighted [&_strong]:text-highlighted [&_i]:italic [&_em]:italic [&_u]:underline [&_u]:underline-offset-[3px] [&_code]:font-mono [&_code]:text-[13px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-primary [&_.inline-code]:font-mono [&_.inline-code]:text-[13px] [&_.inline-code]:px-1 [&_.inline-code]:py-0.5 [&_.inline-code]:rounded [&_.inline-code]:bg-muted [&_.inline-code]:text-primary [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:cursor-pointer selection:bg-(--vf-brand-wash) selection:text-highlighted"
      >
        VFloat is a lightweight, headless
        <span ref="samplePhraseEl" class="inline">floating UI engine</span>
        built on Vue 3.5 reactivity, engineered for zero-compromise composable architecture and
        precision placement.
      </div>

      <div
        class="flex items-center flex-wrap gap-1.5 mt-4 pt-3 border-t border-dotted border-default select-none"
      >
        <span class="text-[11.5px] text-muted mr-1">Select:</span>
        <button
          type="button"
          class="px-2 py-1 sm:px-1.5 sm:py-0.5 text-xs sm:text-[11.5px] font-mono text-muted bg-muted border border-dotted border-default rounded cursor-pointer transition-colors duration-120 hover:bg-elevated hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
          @pointerdown.prevent
          @mousedown.prevent
          @click="selectPhrase('lightweight')"
        >
          lightweight
        </button>
        <button
          type="button"
          class="px-2 py-1 sm:px-1.5 sm:py-0.5 text-xs sm:text-[11.5px] font-mono text-muted bg-muted border border-dotted border-default rounded cursor-pointer transition-colors duration-120 hover:bg-elevated hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
          @pointerdown.prevent
          @mousedown.prevent
          @click="selectPhrase('floating UI engine')"
        >
          floating UI engine
        </button>
        <button
          type="button"
          class="px-2 py-1 sm:px-1.5 sm:py-0.5 text-xs sm:text-[11.5px] font-mono text-muted bg-muted border border-dotted border-default rounded cursor-pointer transition-colors duration-120 hover:bg-elevated hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
          @pointerdown.prevent
          @mousedown.prevent
          @click="selectPhrase('Vue 3.5 reactivity')"
        >
          Vue 3.5 reactivity
        </button>
      </div>
    </div>

    <!-- Floating Formatting Toolbar -->
    <div
      v-if="node.open.value"
      ref="floatingEl"
      role="toolbar"
      aria-label="Text formatting toolbar"
      class="absolute top-0 left-0 z-50 inline-flex items-center gap-0.5 p-1 sm:p-0.5 border border-default bg-elevated text-highlighted shadow-lg rounded-md select-none touch-manipulation"
      @pointerdown="handleToolbarPointerDown"
      @pointerup="handleToolbarPointerUp"
      @pointercancel="handleToolbarPointerUp"
      @mousedown.prevent
    >
      <button
        type="button"
        class="inline-flex items-center justify-center w-8 h-8 sm:w-6.5 sm:h-6.5 p-0 rounded border-0 bg-transparent text-muted cursor-pointer transition-colors duration-100 hover:bg-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
        :class="{ '!bg-muted !text-primary': activeStyles.bold }"
        title="Bold"
        aria-label="Bold"
        :aria-pressed="activeStyles.bold"
        @pointerdown.prevent
        @mousedown.prevent
        @click="toggleFormat('bold')"
      >
        <svg
          class="w-3.5 h-3.5 sm:w-3 sm:h-3"
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
        class="inline-flex items-center justify-center w-8 h-8 sm:w-6.5 sm:h-6.5 p-0 rounded border-0 bg-transparent text-muted cursor-pointer transition-colors duration-100 hover:bg-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
        :class="{ '!bg-muted !text-primary': activeStyles.italic }"
        title="Italic"
        aria-label="Italic"
        :aria-pressed="activeStyles.italic"
        @pointerdown.prevent
        @mousedown.prevent
        @click="toggleFormat('italic')"
      >
        <svg
          class="w-3.5 h-3.5 sm:w-3 sm:h-3"
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
        class="inline-flex items-center justify-center w-8 h-8 sm:w-6.5 sm:h-6.5 p-0 rounded border-0 bg-transparent text-muted cursor-pointer transition-colors duration-100 hover:bg-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
        :class="{ '!bg-muted !text-primary': activeStyles.underline }"
        title="Underline"
        aria-label="Underline"
        :aria-pressed="activeStyles.underline"
        @pointerdown.prevent
        @mousedown.prevent
        @click="toggleFormat('underline')"
      >
        <svg
          class="w-3.5 h-3.5 sm:w-3 sm:h-3"
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
        class="inline-flex items-center justify-center w-8 h-8 sm:w-6.5 sm:h-6.5 p-0 rounded border-0 bg-transparent text-muted cursor-pointer transition-colors duration-100 hover:bg-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
        :class="{ '!bg-muted !text-primary': activeStyles.code }"
        title="Code"
        aria-label="Code"
        :aria-pressed="activeStyles.code"
        @pointerdown.prevent
        @mousedown.prevent
        @click="toggleCode"
      >
        <svg
          class="w-3.5 h-3.5 sm:w-3 sm:h-3"
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

      <div
        class="w-px h-4 sm:h-3.5 mx-0.5 bg-default"
        role="separator"
        aria-orientation="vertical"
      />

      <button
        type="button"
        class="inline-flex items-center justify-center w-8 h-8 sm:w-6.5 sm:h-6.5 p-0 rounded border-0 bg-transparent text-muted cursor-pointer transition-colors duration-100 hover:bg-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary touch-manipulation"
        :class="{ '!bg-muted !text-primary': activeStyles.link }"
        title="Link"
        aria-label="Link"
        :aria-pressed="activeStyles.link"
        @pointerdown.prevent
        @mousedown.prevent
        @click="toggleLink"
      >
        <svg
          class="w-3.5 h-3.5 sm:w-3 sm:h-3"
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
