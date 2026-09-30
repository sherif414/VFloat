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

interface Props {
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keepOpen: false,
});

export interface ComboboxItemDef {
  id: string;
  label: string;
  description: string;
}

const allItems: readonly ComboboxItemDef[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "Installation and core composable primitives",
  },
  {
    id: "accessible-tooltips",
    label: "Accessible Tooltips",
    description: "Hover delays and ARIA accessibility linking",
  },
  {
    id: "cascading-submenus",
    label: "Cascading Submenus",
    description: "Multi-level menus with safe polygon cursor tracking",
  },
  {
    id: "combobox-autocomplete",
    label: "Combobox & Autocomplete",
    description: "Virtual focus with useAriaActivedescendant",
  },
  {
    id: "virtual-anchors",
    label: "Virtual Anchors",
    description: "Positioning relative to text ranges and coordinates",
  },
  {
    id: "focus-containment",
    label: "Focus Containment",
    description: "Modal isolation and inert background trapping",
  },
  {
    id: "keyboard-navigation",
    label: "Keyboard Navigation",
    description: "Roving focus and typeahead search primitives",
  },
  {
    id: "collision-flip-shift",
    label: "Collision Detection",
    description: "Boundary collision avoidance with flip and shift",
  },
];

const searchQuery = ref("");
const isInputFocused = ref(false);
const listboxId = useId();

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allItems;
  return allItems.filter(
    (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
  );
});

const rootAnchorEl = shallowRef<HTMLElement | null>(null);
const inputEl = shallowRef<HTMLInputElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const listboxEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingNode({
  anchorEl: rootAnchorEl,
  floatingEl,
});

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
          maxHeight: `${Math.max(120, Math.min(availableHeight - 16, 320))}px`,
        });
      },
    },
  },
});

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
  getItemId: (index: number) => `vfloat-opt-${filteredItems.value[index]?.id ?? index}`,
  onSelect: (index) => {
    const selected = filteredItems.value[index];
    if (selected) {
      selectItem(selected);
    }
  },
});

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
    <!-- Anchor Input -->
    <div class="anchor-slot">
      <div
        ref="rootAnchorEl"
        class="combobox-anchor"
        :class="{
          'is-active': context.open.value,
          'is-focused': isInputFocused,
        }"
      >
        <svg
          class="combobox-search-icon"
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
        </svg>

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
          placeholder="Search primitives..."
          class="combobox-input"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputInput"
        />

        <button
          v-if="searchQuery"
          type="button"
          class="combobox-clear-btn"
          title="Clear query"
          aria-label="Clear query"
          tabindex="-1"
          @pointerdown.stop
          @click="onClearClick"
        >
          <svg
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
            <span class="combobox-item__label">{{ item.label }}</span>
            <span class="combobox-item__desc">{{ item.description }}</span>
          </div>
          <kbd
            v-if="descendant.activeIndex.value === index"
            class="combobox-item__enter"
            aria-hidden="true"
          >
            ↵
          </kbd>
        </div>

        <div v-if="filteredItems.length === 0" class="combobox-empty">
          <p class="combobox-empty__text">No results found for "{{ searchQuery }}"</p>
        </div>
      </div>

      <!-- Footer Hints -->
      <div class="combobox-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
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

.combobox-anchor {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: 320px;
  max-width: calc(100vw - 32px);
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.combobox-anchor:hover {
  border-color: var(--vp-c-text-3);
}

.combobox-anchor.is-focused,
.combobox-anchor.is-active {
  border-color: var(--vp-c-brand-text, #18794e);
}

.combobox-search-icon {
  width: 14px;
  height: 14px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.combobox-anchor.is-focused .combobox-search-icon {
  color: var(--vp-c-text-1);
}

.combobox-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8125rem;
  padding: 0.15rem 0;
}

.combobox-input::placeholder {
  color: var(--vp-c-text-3);
}

.combobox-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
  transition: color 0.1s ease;
}

.combobox-clear-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
}

.combobox-clear-btn:hover {
  color: var(--vp-c-text-1);
}

.combobox-clear-btn svg {
  width: 11px;
  height: 11px;
}

/* Floating Listbox */
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

.panel-combobox {
  z-index: 25;
  width: 320px;
  max-width: calc(100vw - 24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
}

.combobox-listbox {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 3px;
  scrollbar-width: thin;
}

.combobox-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.55rem;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
}

.combobox-item.is-active {
  background: var(--vp-c-bg-soft);
}

.combobox-item__content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.combobox-item__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combobox-item__desc {
  font-size: 0.71875rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combobox-item__enter {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.6875rem;
  padding: 0.05rem 0.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.combobox-empty {
  padding: 1.25rem 0.75rem;
  text-align: center;
}

.combobox-empty__text {
  margin: 0;
  font-size: 0.78125rem;
  color: var(--vp-c-text-3);
}

.combobox-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.3rem 0.6rem;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

.combobox-footer kbd {
  font-family: var(--vp-font-family-mono, monospace);
  padding: 0.05rem 0.2rem;
  border-radius: 2px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
}

@media (pointer: coarse), (max-width: 640px) {
  .combobox-anchor {
    width: 280px;
  }
}
</style>
