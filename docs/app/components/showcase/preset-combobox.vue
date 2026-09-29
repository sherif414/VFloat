<script setup lang="ts">
import {
  useAriaActivedescendant,
  useEscapeKey,
  useFloatingNode,
  useOutsideClick,
  usePosition,
  useRole,
  useTypeahead,
} from "v-float";
import { computed, ref, shallowRef, useId, watch } from "vue";

// ============================================================================
// 1. Props & Data Definitions
// ============================================================================
interface Props {
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keepOpen: false,
});

export interface ComboboxItemDef {
  id: string;
  label: string;
  category: "Guide" | "Floating Components" | "Positioning" | "Accessibility" | "Middlewares";
  badge: string;
  description: string;
}

const allItems: readonly ComboboxItemDef[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    category: "Guide",
    badge: "Intro",
    description: "Quick start and foundational architecture of VFloat",
  },
  {
    id: "accessible-tooltips",
    label: "Accessible Tooltips",
    category: "Floating Components",
    badge: "Float",
    description: "ARIA-describedby linking and hover coordination",
  },
  {
    id: "cascading-submenus",
    label: "Cascading Submenus",
    category: "Floating Components",
    badge: "Menu",
    description: "Multi-level menus with dynamic safe polygon hover",
  },
  {
    id: "combobox-autocomplete",
    label: "Combobox & Autocomplete",
    category: "Floating Components",
    badge: "Input",
    description: "Virtual focus with useAriaActivedescendant",
  },
  {
    id: "virtual-anchors",
    label: "Virtual Anchors",
    category: "Positioning",
    badge: "Core",
    description: "Context menus and text selection bounding rects",
  },
  {
    id: "focus-containment",
    label: "Focus Containment",
    category: "Accessibility",
    badge: "A11y",
    description: "Inert background isolation with useFocusTrap",
  },
  {
    id: "keyboard-navigation",
    label: "Keyboard Navigation",
    category: "Accessibility",
    badge: "A11y",
    description: "Roving focus and typeahead search across widgets",
  },
  {
    id: "collision-flip-shift",
    label: "Collision Detection (Flip & Shift)",
    category: "Middlewares",
    badge: "Engine",
    description: "Boundary collision avoidance and overflow repositioning",
  },
  {
    id: "size-clamping",
    label: "Responsive Size Clamping",
    category: "Middlewares",
    badge: "Engine",
    description: "Boundary-constrained height with size middleware",
  },
  {
    id: "arrow-positioning",
    label: "Arrow Positioning",
    category: "Positioning",
    badge: "Geometry",
    description: "Dynamic arrow placement and SVG coordinate alignment",
  },
];

// ============================================================================
// 2. Search & Filter State
// ============================================================================
const searchQuery = ref("");
const isInputFocused = ref(false);
const listboxId = useId();

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    return allItems;
  }
  return allItems.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q),
  );
});

// ============================================================================
// 3. Floating Node & References
// ============================================================================
const rootAnchorEl = shallowRef<HTMLElement | null>(null);
const inputEl = shallowRef<HTMLInputElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const listboxEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingNode({
  anchorEl: rootAnchorEl,
  floatingEl,
});

// ============================================================================
// 4. Middlewares & Positioning
// ============================================================================
const position = usePosition(context, {
  placement: "bottom-start",
  middlewares: {
    offset: 6,
    flip: { padding: 8 },
    shift: { padding: 8 },
    size: {
      padding: 8,
      apply({ availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxHeight: `${Math.max(120, Math.min(availableHeight - 16, 360))}px`,
        });
      },
    },
  },
});

// ============================================================================
// 5. Virtual Focus with useAriaActivedescendant
// ============================================================================
const itemElements = ref<Array<HTMLElement | null>>(
  Array.from({ length: allItems.length }, () => null),
);

function setItemRef(el: any, index: number) {
  itemElements.value[index] = el as HTMLElement | null;
}

watch(
  filteredItems,
  (items) => {
    itemElements.value = Array.from({ length: items.length }, () => null);
  },
  { immediate: true },
);

function selectItem(item: ComboboxItemDef) {
  searchQuery.value = item.label;
  context.open.value = false;
  descendant.clearActive();
  inputEl.value?.focus();
}

const descendant = useAriaActivedescendant(context, {
  targetEl: inputEl,
  containerEl: listboxEl,
  elementsList: itemElements,
  loop: true,
  focusOnHover: true,
  preventPointerDown: true,
  openOnArrowKeyDown: true,
  getItemId: (index: number) => `vfloat-combobox-opt-${filteredItems.value[index]?.id ?? index}`,
  onSelect: (index) => {
    const selected = filteredItems.value[index];
    if (selected) {
      selectItem(selected);
    }
  },
});

// ============================================================================
// 6. Typeahead, Escape, Outside Click & Role Primitives
// ============================================================================
useTypeahead(context, {
  target: descendant,
  items: computed(() => filteredItems.value.map((item) => item.label)),
  enabled: () => context.open.value,
});

useOutsideClick(context, {
  enabled: () => !props.keepOpen,
});

useEscapeKey(context, {
  enabled: () => !props.keepOpen,
});

useRole(context, {
  role: "listbox",
  listRef: itemElements,
  selectedIndices: (i) => i === descendant.activeIndex.value,
});

// ============================================================================
// 7. Input Event Handlers & Open State
// ============================================================================
function onInputFocus() {
  isInputFocused.value = true;
  if (!context.open.value) {
    context.open.value = true;
  }
}

function onInputBlur() {
  isInputFocused.value = false;
}

function onInputInput() {
  if (!context.open.value) {
    context.open.value = true;
  }
  descendant.clearActive();
}

function onClearClick(e: MouseEvent) {
  e.stopPropagation();
  searchQuery.value = "";
  descendant.clearActive();
  inputEl.value?.focus();
  if (!context.open.value) {
    context.open.value = true;
  }
}

// ============================================================================
// 8. Reactive Synchronizations & Expose
// ============================================================================
watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      context.open.value = true;
    }
  },
  { immediate: true },
);

defineExpose({
  context,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="preset-wrapper">
    <!-- Anchor Slot -->
    <div class="anchor-slot">
      <div
        ref="rootAnchorEl"
        class="combobox-anchor"
        :class="{
          'is-active': context.open.value,
          'is-focused': isInputFocused,
        }"
      >
        <!-- Search Magnifier Icon -->
        <svg
          class="combobox-search-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>

        <!-- Search Input with Virtual Focus Binding -->
        <input
          ref="inputEl"
          v-model="searchQuery"
          type="text"
          role="combobox"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          aria-autocomplete="list"
          :aria-expanded="context.open.value"
          :aria-controls="listboxId"
          :aria-activedescendant="descendant.activeId.value"
          placeholder="Search documentation..."
          class="combobox-input"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputInput"
        />

        <!-- Clear Button (×) -->
        <button
          v-if="searchQuery"
          type="button"
          class="combobox-clear-btn"
          title="Clear search query"
          aria-label="Clear search query"
          tabindex="-1"
          @pointerdown.stop
          @click="onClearClick"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4l8 8" />
            <path d="M12 4L4 12" />
          </svg>
        </button>

        <!-- Subtle keyboard hint when search is empty -->
        <kbd v-else class="combobox-hint-tag" aria-hidden="true">/</kbd>
      </div>
    </div>

    <!-- Floating Listbox Panel -->
    <div
      v-if="context.open.value"
      :id="listboxId"
      ref="floatingEl"
      role="listbox"
      tabindex="-1"
      aria-label="Documentation search suggestions"
      class="floating-panel panel-combobox"
    >
      <!-- Panel Header -->
      <div class="combobox-header">
        <span class="combobox-header__title">Documentation</span>
        <span class="combobox-header__count">{{ filteredItems.length }} results</span>
      </div>

      <!-- Scrollable Items Container (constrained by Size middleware) -->
      <div ref="listboxEl" class="combobox-listbox" role="presentation">
        <div
          v-for="(item, index) in filteredItems"
          :id="descendant.getItemId(index)"
          :key="item.id"
          :ref="(el) => setItemRef(el, index)"
          role="option"
          :data-index="index"
          :aria-selected="descendant.activeIndex.value === index"
          class="combobox-item"
          :class="{
            'is-active': descendant.activeIndex.value === index,
          }"
          @click="selectItem(item)"
        >
          <div class="combobox-item__content">
            <div class="combobox-item__top">
              <span class="combobox-item__label">{{ item.label }}</span>
              <span class="combobox-item__badge">{{ item.badge }}</span>
            </div>
            <div class="combobox-item__desc">{{ item.description }}</div>
          </div>
          <kbd
            v-if="descendant.activeIndex.value === index"
            class="combobox-item__enter"
            aria-hidden="true"
          >
            ↵
          </kbd>
        </div>

        <!-- Empty State -->
        <div v-if="filteredItems.length === 0" class="combobox-empty">
          <svg
            class="combobox-empty__icon"
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
            <line x1="5" y1="7" x2="9" y2="7" />
          </svg>
          <p class="combobox-empty__text">
            No results found for "<strong>{{ searchQuery }}</strong
            >"
          </p>
          <span class="combobox-empty__sub">Try searching for "tooltip", "menu", or "focus"</span>
        </div>
      </div>

      <!-- Panel Footer & Live Virtual Focus Indicator -->
      <div class="combobox-footer">
        <div class="combobox-footer__hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
        <div v-if="descendant.activeId.value" class="combobox-footer__virtual">
          <span class="combobox-footer__dot" />
          <span class="combobox-footer__descendant">{{ descendant.activeId.value }}</span>
        </div>
      </div>
    </div>
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

/* Combobox Anchor Box */
.combobox-anchor {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 0.35rem 0.65rem 0.35rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-1, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.combobox-anchor:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.combobox-anchor.is-focused,
.combobox-anchor.is-active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft, rgba(16, 185, 129, 0.15));
}

/* Search Icon */
.combobox-search-icon {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  margin-left: 0.1rem;
}

.combobox-anchor.is-focused .combobox-search-icon,
.combobox-anchor.is-active .combobox-search-icon {
  color: var(--vp-c-brand-1);
}

/* Search Input */
.combobox-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.85rem;
  padding: 0.35rem 0.2rem;
}

.combobox-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 0.85;
}

/* Clear Button */
.combobox-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;
  flex-shrink: 0;
}

.combobox-clear-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

/* Shortcut Hint Tag */
.combobox-hint-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.35rem;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.7rem;
  line-height: 1;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  flex-shrink: 0;
}

/* Floating Listbox Panel */
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

.panel-combobox {
  z-index: 25;
  width: 380px;
  max-width: calc(100vw - 24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
}

/* Header */
.combobox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.combobox-header__title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
}

.combobox-header__count {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

/* Scrollable Container (Clamped by Size middleware) */
.combobox-listbox {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.3rem;
  scrollbar-width: thin;
  scrollbar-color: var(--vp-c-divider) transparent;
}

.combobox-listbox::-webkit-scrollbar {
  width: 5px;
}

.combobox-listbox::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider);
  border-radius: 9999px;
}

/* Options */
.combobox-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
}

.combobox-item:hover,
.combobox-item.is-active {
  background: var(--vp-c-bg-soft);
}

.combobox-item.is-active .combobox-item__label {
  color: var(--vp-c-brand-1);
}

.combobox-item__content {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.combobox-item__top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.combobox-item__label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.1s ease;
}

.combobox-item__badge {
  display: inline-block;
  padding: 0.05rem 0.3rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.combobox-item.is-active .combobox-item__badge {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.combobox-item__desc {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.combobox-item__enter {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.75rem;
  padding: 0.1rem 0.3rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 3px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

/* Empty State */
.combobox-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--vp-c-text-3);
}

.combobox-empty__icon {
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.combobox-empty__text {
  margin: 0 0 0.25rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.combobox-empty__text strong {
  color: var(--vp-c-text-1);
}

.combobox-empty__sub {
  font-size: 0.72rem;
}

/* Footer Status Bar */
.combobox-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.65rem;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.combobox-footer__hints {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.combobox-footer__hints kbd {
  font-family: var(--vp-font-family-mono, monospace);
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
}

.combobox-footer__virtual {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.64rem;
  color: var(--vp-c-brand-1);
}

.combobox-footer__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 4px var(--vp-c-brand-1);
}

.combobox-footer__descendant {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Mobile & Touch Adjustments */
@media (pointer: coarse), (max-width: 640px) {
  .combobox-anchor {
    width: 290px;
    min-height: 42px;
  }

  .combobox-input {
    font-size: 16px; /* Prevents auto-zoom on iOS */
  }

  .combobox-item {
    min-height: 42px;
    padding: 0.55rem 0.75rem;
  }

  .panel-combobox {
    width: 300px;
  }
}
</style>
