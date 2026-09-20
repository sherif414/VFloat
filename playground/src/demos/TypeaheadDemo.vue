<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import {
  useClick,
  useEscapeKey,
  useFloatingNode,
  useOutsideClick,
  usePosition,
  useRole,
  useRovingFocus,
  useTypeahead,
} from "@/composables";

const ITEMS: Array<string> = [
  "Apple",
  "Apricot",
  "Avocado",
  "Banana",
  "Blackberry",
  "Blood Orange",
  "Blueberry",
  "Cherry",
  "Clementine",
  "Coconut",
  "Dragonfruit",
  "Durian",
];

// Blueberry is disabled to showcase disabled-item skipping.
const DISABLED_INDEX = 6;

// --- Floating node -----------------------------------------------------------

const triggerEl = useTemplateRef<HTMLElement>("trigger");
const listboxEl = useTemplateRef<HTMLElement>("listbox");

const context = useFloatingNode({ anchorEl: triggerEl, floatingEl: listboxEl });

const position = usePosition(context, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 8 } },
});

useClick(context);
useOutsideClick(context);
useEscapeKey(context);
useRole(context, { role: "listbox", label: "Fruit picker" });

// --- Items + roving focus + typeahead ----------------------------------------

const itemsList = ref<Array<HTMLElement | null>>([]);
const selected = ref<string | null>(null);

function setItemRef(idx: number) {
  return (el: unknown) => {
    itemsList.value[idx] = el as HTMLElement | null;
  };
}

function closeList(returnFocus = true) {
  context.open.value = false;
  if (returnFocus) triggerEl.value?.focus({ preventScroll: true });
}

function selectIndex(idx: number) {
  selected.value = ITEMS[idx] ?? null;
  closeList();
}

const selectedIndex = computed(() =>
  selected.value === null ? -1 : ITEMS.indexOf(selected.value),
);

// Reference for roving focus to allow useTypeahead to register its keydown
// listener first, while still dispatching focus to roving focus on matches.
let roving: ReturnType<typeof useRovingFocus>;

// Resume cycling after roving focus while open, or after the committed
// value while closed so collapsed preselection keeps cycling.
const typeaheadActiveIndex = computed(() =>
  context.open.value ? (roving ? roving.activeIndex.value : -1) : selectedIndex.value,
);

// Registered before useRovingFocus so typeahead consumes printable keys and
// query-extending Space before roving focus claims them.
const { searchQuery } = useTypeahead(context, {
  items: ITEMS,
  activeIndex: typeaheadActiveIndex,
  onMatch: (idx) => {
    if (!context.open.value) {
      selected.value = ITEMS[idx] ?? null;
    } else {
      roving?.focusIndex(idx);
    }
  },
  isItemDisabled: (idx) => idx === DISABLED_INDEX,
});

roving = useRovingFocus(context, {
  elementsList: itemsList,
  loop: true,
  onSelect: (idx) => selectIndex(idx),
});

// Focus the selected item (or first) whenever the listbox opens.
watch(
  () => context.open.value,
  (isOpen) => {
    if (!isOpen) return;
    const initial = selected.value ? ITEMS.indexOf(selected.value) : 0;
    void nextTick(() => roving.focusIndex(initial >= 0 ? initial : 0));
  },
);

// Restore focus to the trigger button when the listbox is dismissed (e.g. Escape or outside click).
watch(
  () => context.open.value,
  (isOpen, wasOpen) => {
    if (!isOpen && wasOpen) {
      const activeEl = document.activeElement;
      if (!activeEl || activeEl === document.body || listboxEl.value?.contains(activeEl)) {
        triggerEl.value?.focus({ preventScroll: true });
      }
    }
  },
);
</script>

<template>
  <div class="typeahead-demo">
    <button ref="trigger" type="button" class="linear-btn">
      {{ selected ?? "Pick a fruit" }} <kbd>⌄</kbd>
    </button>

    <Teleport to="body">
      <div
        v-if="context.open.value"
        ref="listbox"
        role="listbox"
        aria-label="Fruit picker"
        class="linear-menu typeahead-menu"
        :style="position.styles.value"
      >
        <div class="typeahead-query" aria-live="polite">
          <template v-if="searchQuery"> “{{ searchQuery }}” </template>
          <template v-else> Type to jump to a fruit </template>
        </div>

        <button
          v-for="(item, idx) in ITEMS"
          :key="item"
          type="button"
          role="option"
          :aria-selected="selected === item"
          :aria-disabled="idx === DISABLED_INDEX || undefined"
          :disabled="idx === DISABLED_INDEX || undefined"
          :ref="setItemRef(idx)"
          :tabindex="roving.getTabindex(idx)"
          class="linear-item"
          :class="{
            'linear-item--disabled': idx === DISABLED_INDEX,
            'linear-item--selected': selected === item,
          }"
          @click="selectIndex(idx)"
        >
          {{ item }}
          <span v-if="selected === item" class="linear-item__check">✓</span>
        </button>
      </div>
    </Teleport>

    <p class="typeahead-hint">
      Focus the list and type <kbd>b</kbd> then <kbd>l</kbd> for “bl”, repeat <kbd>c</kbd> to cycle
      Cherry → Clementine → Coconut, or type <kbd>blood&nbsp;o</kbd> for the multi-word match. Press
      <kbd>Backspace</kbd> to undo typos. Blueberry is disabled and skipped. Typing on the closed
      button preselects without opening.
    </p>
  </div>
</template>

<style scoped>
.typeahead-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0 24px;
}
.linear-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #f7f8f8;
  background: #5e6ad2;
  border: 1px solid #5e6ad2;
  border-radius: 6px;
  padding: 7px 12px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.linear-btn:hover {
  background: #717cef;
}
.linear-btn kbd {
  font-family: inherit;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
.typeahead-menu {
  max-height: 320px;
  overflow-y: auto;
}
.typeahead-query {
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 4px 8px 8px;
  font-size: 12px;
  color: rgba(247, 248, 248, 0.45);
}
.typeahead-hint {
  max-width: 420px;
  margin: 0;
  text-align: center;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(247, 248, 248, 0.45);
}
.typeahead-hint kbd {
  font-family: inherit;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(247, 248, 248, 0.7);
}
</style>

<style>
.linear-item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.linear-item--selected {
  background: rgba(94, 106, 210, 0.16);
}
.linear-item__check {
  margin-left: auto;
  color: #bec6ff;
}
</style>
