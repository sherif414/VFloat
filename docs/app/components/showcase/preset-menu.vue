<script setup lang="ts">
import type { Placement } from "v-float";
import {
  useArrow,
  useClick,
  useEscapeKey,
  useFloatingNode,
  useHover,
  useOutsideClick,
  usePosition,
  useRole,
  useRovingFocus,
} from "v-float";
import { computed, nextTick, shallowRef, watch } from "vue";

interface Props {
  placement: Placement;
  anchorOffset?: { x: number; y: number };
  isDragging?: boolean;
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  anchorOffset: () => ({ x: 0, y: 0 }),
  isDragging: false,
  keepOpen: false,
});

const emit = defineEmits<{
  (e: "pointerdown", event: PointerEvent): void;
}>();

interface MenuItemDef {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  hasSubmenu?: boolean;
}

const rootMenuItems: MenuItemDef[] = [
  { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
  { id: "rename", label: "Rename", shortcut: "↵" },
  { id: "share", label: "Share", hasSubmenu: true },
  { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
];

const subMenuItems: MenuItemDef[] = [
  { id: "copy-link", label: "Copy link", shortcut: "⌘C" },
  { id: "email-invite", label: "Email invite", shortcut: "⌘E" },
  { id: "embed-widget", label: "Embed code", shortcut: "</>" },
];

const rootAnchorEl = shallowRef<HTMLElement | null>(null);
const rootFloatingEl = shallowRef<HTMLElement | null>(null);
const rootArrowEl = shallowRef<HTMLElement | null>(null);

const rootNode = useFloatingNode({
  anchorEl: rootAnchorEl,
  floatingEl: rootFloatingEl,
  arrowEl: rootArrowEl,
});

const subAnchorEl = shallowRef<HTMLElement | null>(null);
const subFloatingEl = shallowRef<HTMLElement | null>(null);

const subNode = useFloatingNode({
  anchorEl: subAnchorEl,
  floatingEl: subFloatingEl,
  parent: rootNode,
});

const rootPosition = usePosition(rootNode, {
  placement: computed(() => props.placement),
  middlewares: {
    offset: 6,
    flip: { padding: 8 },
    shift: { padding: 8 },
  },
});

useArrow(rootNode, {
  offset: "-5px",
});

const rootSide = computed(
  () =>
    (rootPosition.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

const subPosition = usePosition(subNode, {
  placement: "right-start",
  middlewares: {
    offset: { mainAxis: 4, crossAxis: -4 },
    flip: {
      padding: 8,
      fallbackPlacements: ["left-start", "bottom-start", "bottom-end"],
    },
    shift: { padding: 8, mainAxis: true },
  },
});

watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      rootNode.open.value = true;
    } else {
      rootNode.open.value = false;
      subNode.open.value = false;
    }
  },
  { immediate: true },
);

watch(rootNode.open, (isOpen) => {
  if (!isOpen) {
    subNode.open.value = false;
  }
});

useClick(rootNode, {
  enabled: () => !props.keepOpen,
});

useOutsideClick(rootNode, {
  enabled: () => !props.keepOpen,
});

useEscapeKey(rootNode, {
  enabled: () => !props.keepOpen,
});

useRole(rootNode, {
  role: "menu",
});

useHover(subNode, {
  delay: { open: 0, close: 100 },
  safePolygon: true,
});

useClick(subNode, {
  ignoreKeyboard: true,
});

useOutsideClick(subNode);
useEscapeKey(subNode);

useRole(subNode, {
  role: "menu",
});

const rootMenuItemEls = shallowRef<Array<HTMLElement | null>>([]);
const subMenuItemEls = shallowRef<Array<HTMLElement | null>>([]);

function setRootItemRef(el: any, index: number, hasSubmenu?: boolean) {
  rootMenuItemEls.value[index] = el as HTMLElement | null;
  if (hasSubmenu) {
    subAnchorEl.value = el as HTMLElement | null;
  }
}

function setSubItemRef(el: any, index: number) {
  subMenuItemEls.value[index] = el as HTMLElement | null;
}

const { activeIndex: rootActiveIndex, getTabindex: getRootTabindex } = useRovingFocus(rootNode, {
  elementsList: rootMenuItemEls,
  loop: true,
  openOnArrowKeyDown: true,
  focusOnHover: true,
  onEnter: (index) => {
    if (rootMenuItems[index]?.hasSubmenu) {
      subNode.open.value = true;
      void nextTick(() => {
        subFocusIndex(0);
      });
    }
  },
  onSelect: (index) => {
    if (rootMenuItems[index]?.hasSubmenu) {
      subNode.open.value = !subNode.open.value;
      if (subNode.open.value) {
        void nextTick(() => {
          subFocusIndex(0);
        });
      }
    } else {
      closeAllMenus();
    }
  },
});

const {
  activeIndex: subActiveIndex,
  getTabindex: getSubTabindex,
  focusIndex: subFocusIndex,
} = useRovingFocus(subNode, {
  elementsList: subMenuItemEls,
  loop: true,
  focusOnHover: true,
  onSelect: () => {
    closeAllMenus();
  },
});

// Animated Moving Background Indicators
const rootIndicatorStyle = shallowRef<{ transform: string; height: string; opacity: number }>({
  transform: "translateY(0px)",
  height: "0px",
  opacity: 0,
});

const subIndicatorStyle = shallowRef<{ transform: string; height: string; opacity: number }>({
  transform: "translateY(0px)",
  height: "0px",
  opacity: 0,
});

function updateRootIndicator() {
  const index = rootActiveIndex.value;
  if (index === -1 || index === null || !rootFloatingEl.value) {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
    return;
  }
  const targetEl = rootMenuItemEls.value[index];
  if (!targetEl) {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
    return;
  }
  const top = targetEl.offsetTop;
  const height = targetEl.offsetHeight;
  rootIndicatorStyle.value = {
    transform: `translateY(${top}px)`,
    height: `${height}px`,
    opacity: 1,
  };
}

function updateSubIndicator() {
  const index = subActiveIndex.value;
  if (index === -1 || index === null || !subFloatingEl.value) {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
    return;
  }
  const targetEl = subMenuItemEls.value[index];
  if (!targetEl) {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
    return;
  }
  const top = targetEl.offsetTop;
  const height = targetEl.offsetHeight;
  subIndicatorStyle.value = {
    transform: `translateY(${top}px)`,
    height: `${height}px`,
    opacity: 1,
  };
}

watch(rootActiveIndex, () => {
  void nextTick(() => {
    updateRootIndicator();
  });
});

watch(rootNode.open, (isOpen) => {
  if (isOpen) {
    void nextTick(() => {
      updateRootIndicator();
    });
  } else {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
  }
});

watch(subActiveIndex, () => {
  void nextTick(() => {
    updateSubIndicator();
  });
});

watch(subNode.open, (isOpen) => {
  if (isOpen) {
    void nextTick(() => {
      updateSubIndicator();
    });
  } else {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
  }
});

function closeAllMenus() {
  subNode.open.value = false;
  rootNode.open.value = false;
}

function onSubItemClick() {
  closeAllMenus();
}

function onRootItemClick(item: MenuItemDef) {
  if (!item.hasSubmenu) {
    closeAllMenus();
  }
}

defineExpose({
  node: rootNode,
  context: rootNode,
  position: rootPosition,
  update: () => {
    void rootPosition.update();
    if (subNode.open.value) {
      void subPosition.update();
    }
  },
});
</script>

<template>
  <div class="contents">
    <!-- Anchor Trigger -->
    <div
      class="relative touch-none z-[5]"
      :style="{ transform: `translate(${anchorOffset.x}px, ${anchorOffset.y}px)` }"
    >
      <button
        ref="rootAnchorEl"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-elevated text-highlighted text-[13px] font-medium shadow-xs select-none touch-none outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        :class="[
          isDragging ? 'cursor-grabbing border-primary shadow-md' : 'cursor-grab',
          rootNode.open.value ? 'border-dimmed' : 'border-default hover:border-muted',
        ]"
        aria-haspopup="menu"
        :aria-expanded="rootNode.open.value"
        @pointerdown="emit('pointerdown', $event)"
      >
        <span>Actions</span>
        <svg
          class="w-2.5 h-2.5 shrink-0 transition-transform duration-150"
          :class="rootNode.open.value ? 'rotate-180 text-highlighted' : 'text-muted'"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    </div>

    <!-- Root Menu -->
    <div
      v-if="rootNode.open.value"
      ref="rootFloatingEl"
      role="menu"
      tabindex="-1"
      class="absolute top-0 left-0 z-20 w-[175px] p-1 border border-default bg-elevated text-highlighted shadow-lg rounded-md outline-none"
    >
      <!-- Moving Animated Active Indicator -->
      <div
        class="absolute top-0 left-1 right-1 rounded pointer-events-none z-[1] transition-[transform,height] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :class="rootMenuItems[rootActiveIndex]?.danger ? 'bg-red-500/10' : 'bg-muted'"
        :style="rootIndicatorStyle"
      />

      <div
        v-for="(item, index) in rootMenuItems"
        :key="item.id"
        :ref="(el) => setRootItemRef(el, index, item.hasSubmenu)"
        role="menuitem"
        class="relative z-[2] flex items-center justify-between px-2 py-1.5 rounded text-[12.5px] font-medium cursor-pointer touch-manipulation bg-transparent outline-none transition-colors duration-120 select-none"
        :tabindex="getRootTabindex(index)"
        :class="[
          item.danger
            ? 'text-red-500'
            : rootActiveIndex === index
              ? 'text-highlighted'
              : 'text-muted',
        ]"
        :aria-haspopup="item.hasSubmenu ? 'menu' : undefined"
        :aria-expanded="item.hasSubmenu ? subNode.open.value : undefined"
        @click="onRootItemClick(item)"
      >
        <span>{{ item.label }}</span>

        <template v-if="item.hasSubmenu">
          <svg
            class="w-2.5 h-2.5 transition-colors duration-120"
            :class="rootActiveIndex === index ? 'text-highlighted' : 'text-muted'"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </template>
        <template v-else-if="item.shortcut">
          <kbd class="text-[11px] font-mono text-muted">{{ item.shortcut }}</kbd>
        </template>
      </div>

      <!-- Arrow -->
      <div ref="rootArrowEl" :class="['floating-arrow', `floating-arrow--${rootSide}`]" />
    </div>

    <!-- Submenu Panel -->
    <div
      v-if="subNode.open.value && rootNode.open.value"
      ref="subFloatingEl"
      role="menu"
      tabindex="-1"
      class="absolute top-0 left-0 z-30 w-[175px] p-1 border border-default bg-elevated text-highlighted shadow-xl rounded-md outline-none"
    >
      <!-- Moving Animated Active Indicator -->
      <div
        class="absolute top-0 left-1 right-1 rounded bg-muted pointer-events-none z-[1] transition-[transform,height] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :style="subIndicatorStyle"
      />

      <div
        v-for="(subItem, subIndex) in subMenuItems"
        :key="subItem.id"
        :ref="(el) => setSubItemRef(el, subIndex)"
        role="menuitem"
        class="relative z-[2] flex items-center justify-between px-2 py-1.5 rounded text-[12.5px] font-medium cursor-pointer touch-manipulation bg-transparent outline-none transition-colors duration-120 select-none"
        :tabindex="getSubTabindex(subIndex)"
        :class="subActiveIndex === subIndex ? 'text-highlighted' : 'text-muted'"
        @click="onSubItemClick"
      >
        <span>{{ subItem.label }}</span>
        <kbd v-if="subItem.shortcut" class="text-[11px] font-mono text-muted">{{
          subItem.shortcut
        }}</kbd>
      </div>
    </div>
  </div>
</template>
