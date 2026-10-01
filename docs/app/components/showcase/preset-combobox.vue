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

const anchorEl = shallowRef<HTMLElement | null>(null);
const inputEl = shallowRef<HTMLInputElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const listboxEl = shallowRef<HTMLElement | null>(null);

const node = useFloatingNode({
  anchorEl,
  floatingEl,
});

const position = usePosition(node, {
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
  node.open.value = false;
  descendant.clearActive();
  inputEl.value?.focus();
}

const descendant = useAriaActivedescendant(node, {
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

useTypeahead(node, {
  target: descendant,
  items: computed(() => filteredItems.value.map((item) => item.label)),
  enabled: () => node.open.value,
});

useOutsideClick(node, {
  enabled: () => !props.keepOpen,
});

useEscapeKey(node, {
  enabled: () => !props.keepOpen,
});

useRole(node, {
  role: "listbox",
  listRef: itemElements,
  selectedIndices: (i) => i === descendant.activeIndex.value,
});

function onInputFocus() {
  isInputFocused.value = true;
  if (!node.open.value) {
    node.open.value = true;
  }
}

function onInputBlur() {
  isInputFocused.value = false;
}

function onInputInput() {
  if (!node.open.value) {
    node.open.value = true;
  }
  descendant.clearActive();
}

function onClearClick(e: MouseEvent) {
  e.stopPropagation();
  searchQuery.value = "";
  descendant.clearActive();
  inputEl.value?.focus();
  if (!node.open.value) {
    node.open.value = true;
  }
}

watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      node.open.value = true;
    }
  },
  { immediate: true },
);

defineExpose({
  node,
  context: node,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="contents">
    <!-- Anchor Input -->
    <div class="relative touch-none z-[5]">
      <div
        ref="anchorEl"
        class="inline-flex items-center gap-1.5 w-[320px] max-w-[calc(100vw-32px)] sm:w-[320px] max-sm:w-[280px] px-2.5 py-1.5 border rounded-md bg-elevated text-highlighted shadow-xs transition-colors duration-150"
        :class="
          node.open.value || isInputFocused ? 'border-primary' : 'border-default hover:border-muted'
        "
      >
        <svg
          class="w-3.5 h-3.5 shrink-0 transition-colors duration-150"
          :class="isInputFocused ? 'text-highlighted' : 'text-muted'"
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
          :aria-expanded="node.open.value"
          :aria-controls="listboxId"
          :aria-activedescendant="descendant.activeId.value"
          placeholder="Search primitives..."
          class="flex-1 min-w-0 border-0 outline-none bg-transparent text-highlighted text-[13px] py-0.5 placeholder:text-muted"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputInput"
        />

        <button
          v-if="searchQuery"
          type="button"
          class="inline-flex items-center justify-center w-4.5 h-4.5 p-0 border-0 rounded bg-transparent text-muted shrink-0 cursor-pointer transition-colors duration-100 hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
          title="Clear query"
          aria-label="Clear query"
          tabindex="-1"
          @pointerdown.stop
          @click="onClearClick"
        >
          <svg
            class="w-3 h-3"
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
      v-if="node.open.value"
      :id="listboxId"
      ref="floatingEl"
      role="listbox"
      tabindex="-1"
      aria-label="Documentation search suggestions"
      class="absolute top-0 left-0 z-25 w-[320px] max-w-[calc(100vw-24px)] flex flex-col overflow-hidden outline-none border border-default bg-elevated text-highlighted shadow-lg rounded-md"
    >
      <div
        ref="listboxEl"
        class="relative flex-1 min-h-0 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin]"
        role="presentation"
      >
        <div
          v-for="(item, index) in filteredItems"
          :id="descendant.getItemId(index)"
          :key="item.id"
          :ref="(el) => setItemRef(el, index)"
          role="option"
          :data-index="index"
          :aria-selected="descendant.activeIndex.value === index"
          class="flex items-center justify-between gap-2 px-2 py-1.5 rounded cursor-pointer outline-none touch-manipulation transition-colors duration-100"
          :class="descendant.activeIndex.value === index ? 'bg-muted' : 'hover:bg-muted/50'"
          @click="selectItem(item)"
        >
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[13px] font-medium text-highlighted truncate">{{ item.label }}</span>
            <span class="text-[11.5px] text-muted truncate">{{ item.description }}</span>
          </div>
          <kbd
            v-if="descendant.activeIndex.value === index"
            class="font-mono text-[11px] px-1 py-0.5 border border-default rounded bg-elevated text-muted shrink-0"
            aria-hidden="true"
          >
            ↵
          </kbd>
        </div>

        <div v-if="filteredItems.length === 0" class="p-5 text-center">
          <p class="m-0 text-[12.5px] text-muted">No results found for "{{ searchQuery }}"</p>
        </div>
      </div>

      <!-- Footer Hints -->
      <div
        class="flex items-center justify-end gap-2.5 px-2.5 py-1.5 border-t border-default bg-muted text-[11px] text-muted [&_kbd]:font-mono [&_kbd]:px-1 [&_kbd]:py-0.5 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-default [&_kbd]:bg-elevated [&_kbd]:text-muted"
      >
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>
</template>
